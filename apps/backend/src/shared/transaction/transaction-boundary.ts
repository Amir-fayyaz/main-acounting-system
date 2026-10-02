import { Result } from '../errors/result.js';
import type { ActiveTransaction, BoundaryState } from './transaction-context.js';
import { TransactionContext } from './transaction-context.js';

/**
 * The transaction boundary a use case opens, commits or rolls back (SHR-005;
 * ADR-004 sections 4–6, 9, 26–27).
 *
 * One business operation that must stay consistent as a whole gets one
 * boundary; everything inside it commits together or not at all:
 *
 * ```text
 * use case                boundary                   adapter (runner)
 *   │  execute(work)  ──►  begin  ─────────────────►  one connection, BEGIN
 *   │  ... repository writes, all resolving through TransactionContext ...
 *   ├─ work resolves ────► commit ─────────────────►  COMMIT
 *   └─ work throws ──────► rollback ◄───────────────  ROLLBACK, error rethrown
 * ```
 *
 * **Ownership.** The Application layer owns coordination: a use case decides
 * what belongs in the boundary and calls `execute`. The driver mechanics —
 * begin, commit, rollback on a real connection — are an adapter behind
 * {@link TransactionRunner}, so neither Domain nor Application ever speaks
 * MySQL, Drizzle or any other implementation. Domain cannot reach this contract
 * at all: `module-boundaries.spec.ts` fails the run on such an import.
 *
 * **Repository integration.** A repository joins the open transaction by
 * reading `TransactionContext` (the approved propagation abstraction) instead
 * of opening one of its own, so several repository operations become one
 * atomic unit without any port gaining a transaction parameter (ADR-004,
 * section 6). A write made outside any boundary is a single autocommitted
 * statement — the ordinary case for a read or an independent single write.
 *
 * **Nesting — join, never an inner commit.** `execute` inside an open
 * boundary participates in *that* boundary: no second begin, no commit of its
 * own, no savepoint. An inner use case therefore cannot commit half of what
 * its caller is still assembling, which is the "accidental independent commit"
 * ADR-004 forbids. There is deliberately no `executeNested`/`REQUIRES_NEW`
 * escape hatch in V1: a boundary that needs finer grain is one boundary with a
 * clearer definition, not two stacked ones.
 *
 * **All-or-nothing.** Once any operation inside a boundary reports a failure —
 * by throwing, or by returning a failed `Result` — the boundary is
 * rollback-only. The failure still reaches the caller as it normally would,
 * but the boundary will no longer commit: if its own work nevertheless
 * finishes "successfully", it rolls back everything and throws
 * {@link TransactionBoundaryError} rather than commit a state in which an
 * inner operation had already failed (ADR-004, section 1 — incomplete
 * execution must never happen silently). A use case that expects a failure and
 * wants to carry on with different work evaluates it *before* opening the
 * boundary, or gives the fallback work its own boundary.
 *
 * **Rollback covers database work only.** A provider call, a file, a
 * notification or a tax submission performed inside a boundary is not part of
 * the transaction and is not undone by rolling it back — those effects need
 * their own retry, compensation, correction or unknown-outcome handling
 * (ADR-004, sections 9, 12–13). The boundary makes the two kinds of effect
 * distinguishable; it never pretends they are one kind.
 *
 * **Concurrency is untouched.** The boundary changes which writes share a
 * transaction, never how they are validated: every write still names the
 * `Revision` it expects (SHR-004), so a lost race is a `CONFLICT` that fails
 * the operation — and rolls back the boundary — instead of an overwrite
 * (ADR-004, section 27). Revalidation a Domain requires happens inside the
 * boundary, before commit.
 *
 * Nothing here knows about HTTP, Redis, a provider or any other transaction
 * API: the contract is a callback and an async call chain.
 */

/**
 * The work a use case executes inside one boundary.
 *
 * Returns either the operation's outcome — typically a `Result` when the
 * business decides about the failure — or a thrown technical error, which is
 * what makes the boundary roll back.
 */
export type TransactionWork<T> = () => Promise<T>;

/**
 * The Application-owned atomic boundary.
 *
 * Injected into a use case (the `TRANSACTION_BOUNDARY` token), never into
 * Domain: it is the one place that decides what commits together.
 */
export interface TransactionBoundary {
  /**
   * Runs `work` as one atomic unit and returns its outcome.
   *
   * - `work` resolves → the boundary commits, unless a failure was reported
   *   inside it (see the rollback-only rule in the file header); a failed
   *   `Result` returned by the work itself rolls back and is returned to the
   *   caller unchanged.
   * - `work` throws → everything the boundary wrote is rolled back and the
   *   original error is rethrown, untouched.
   * - Already inside a boundary → participates in it: no begin, no commit, no
   *   rollback here; failures still mark the outer boundary.
   */
  execute<T>(work: TransactionWork<T>): Promise<T>;
}

/**
 * The driver mechanics behind a boundary — implemented in Infrastructure, one
 * adapter per persistence technology.
 *
 * A runner answers exactly three questions, and knows nothing about business
 * rules, nesting or propagation (those belong to `createTransactionBoundary`):
 *
 * 1. obtain a unit of work on **one** connection;
 * 2. hand {@link ActiveTransaction} to the work so repositories can find it;
 * 3. commit when the work resolves, roll back when it rejects — and rethrow,
 *    so an error is never swallowed between the work and the boundary.
 */
export interface TransactionRunner {
  run<T>(work: (transaction: ActiveTransaction) => Promise<T>): Promise<T>;
}

/**
 * The failure reported when a boundary would have committed a state in which
 * an operation had already failed: everything is rolled back, and the caller
 * is told why instead of receiving a success that never landed.
 *
 * Technical, like `PersistenceError`: thrown, never returned inside a
 * `Result`, and carrying the first observed failure as `cause`.
 */
export class TransactionBoundaryError extends Error {
  public constructor(cause?: unknown) {
    super(
      'The transaction observed a failure inside it and was rolled back; no change was committed.',
      cause === undefined ? undefined : { cause },
    );
    this.name = 'TransactionBoundaryError';
    Object.freeze(this);
  }
}

/**
 * Module-private signal: the boundary must not commit this work.
 *
 * Thrown inside the runner's callback so the runner performs the rollback it
 * performs for any failure, then translated by `execute` — a failed `Result`
 * is handed back to the caller, anything else becomes a
 * {@link TransactionBoundaryError}. Being module-private, no `work` can raise
 * it by accident.
 */
class BoundaryAbort extends Error {
  public constructor(
    public readonly failure: unknown,
    public readonly outcome: unknown,
  ) {
    super('transaction boundary abort');
    this.name = 'BoundaryAbort';
  }
}

function isFailedResult(value: unknown): value is Result<unknown, unknown> {
  return Result.is(value) && !value.isOk();
}

function failBoundary(state: BoundaryState, failure: unknown): void {
  state.failed = true;
  if (state.failure === undefined) {
    state.failure = failure;
  }
}

/**
 * A frame already inside the boundary: it reports failures to the boundary it
 * joined and never commits anything itself.
 */
async function runWithinBoundary<T>(state: BoundaryState, work: TransactionWork<T>): Promise<T> {
  try {
    const outcome = await work();
    if (isFailedResult(outcome)) {
      failBoundary(state, outcome.error());
    }
    return outcome;
  } catch (error) {
    failBoundary(state, error);
    throw error;
  }
}

/**
 * Builds a {@link TransactionBoundary} over one runner's driver mechanics.
 *
 * Everything the acceptance criteria call "transaction behaviour" is decided
 * here, in framework-free code: begin/commit/rollback orchestration, joining an
 * open boundary instead of nesting a second one, propagation through
 * {@link TransactionContext}, and the rollback-only rule. The runner supplies
 * only the connection, which is what lets the same contract be tested against
 * an in-memory runner and against MySQL with no behavioural difference.
 */
export function createTransactionBoundary(runner: TransactionRunner): TransactionBoundary {
  return {
    async execute<T>(work: TransactionWork<T>): Promise<T> {
      const joined = TransactionContext.boundaryState();

      if (joined !== undefined) {
        return runWithinBoundary(joined, work);
      }

      try {
        return await runner.run(async (transaction) => {
          const state: BoundaryState = { transaction, failed: false, failure: undefined };

          return TransactionContext.enter(state, async () => {
            let outcome: T;

            try {
              outcome = await work();
            } catch (error) {
              failBoundary(state, error);
              throw error;
            }

            if (isFailedResult(outcome)) {
              failBoundary(state, outcome.error());
              throw new BoundaryAbort(outcome.error(), outcome);
            }

            if (state.failed) {
              throw new BoundaryAbort(state.failure, undefined);
            }

            return outcome;
          });
        });
      } catch (error) {
        if (error instanceof BoundaryAbort) {
          if (error.outcome !== undefined) {
            // The work answered with a definite failure; the rollback already
            // happened, and the caller receives that same failure.
            return error.outcome as T;
          }
          throw new TransactionBoundaryError(error.failure);
        }
        throw error;
      }
    },
  };
}
