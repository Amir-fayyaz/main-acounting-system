import { ConflictError } from '../errors/category-errors.js';
import type { DomainError } from '../errors/domain-error.js';
import { describeValue, validateMatches, validateNonBlank } from '../primitives/assert.js';
import { InvalidPrimitiveError } from '../primitives/invalid-primitive-error.js';

/**
 * The failure boundary between a storage adapter and the code that asked for
 * the work (SHR-004; ADR-004 sections 12–13, 27; ADR-003 section 12).
 *
 * A driver speaks in connection errors, packet timeouts and constraint names.
 * None of that belongs in a use case, a log line meant for operators, or a
 * response body. The adapter — and only the adapter — translates what its
 * driver reported into one of the five {@link PersistenceFailureKind}s, so the
 * application faces a vocabulary it can decide about:
 *
 * ```text
 * domain/application asked        adapter translates driver output
 * for a read or a write     →     into a PersistenceError     →     boundary decides
 * ```
 *
 * The decision table is ADR-004, section 12 — retry depends on the *kind* of
 * failure, never on luck:
 *
 * | kind        | retryable | outcomeKnown | meaning                                              |
 * | ----------- | --------- | ------------ | ---------------------------------------------------- |
 * | `UNAVAILABLE` | yes     | yes          | the store could not be reached; nothing was attempted |
 * | `CONFLICT`    | no      | yes          | someone else's write won (stale revision, duplicate) |
 * | `REJECTED`    | no      | yes          | the store refused the write; nothing was applied     |
 * | `TIMEOUT`     | no      | **no**       | the store went silent; the write may or may not have happened |
 * | `UNKNOWN`     | no      | **no**       | unclassifiable — treated like an unknown outcome     |
 *
 * Two consequences are deliberate (ADR-004, sections 13 and 31): a `TIMEOUT`
 * is never retried blindly, because its outcome is unknown and a blind retry
 * could duplicate a business effect — the boundary verifies through the
 * idempotency key or execution record first. And an unknown outcome is never
 * reported as success.
 *
 * Three rules keep the boundary honest:
 *
 * - **Domain never constructs one.** It reads and writes through ports and
 *   returns `Result` for outcomes the business decided about; a
 *   `PersistenceError` is raised only by an adapter, and only for a technical
 *   condition.
 * - **It is never returned inside a `Result`.** Expected business failures are
 *   `DomainError`s (SHR-002). This is a thrown, technical failure; the
 *   application boundary catches it, decides, and either rethrows it as
 *   `INTERNAL_ERROR` or converts it through {@link PersistenceError.toDomainError}.
 * - **Nothing from the driver rides along.** `operation` is a caller-named
 *   position (`AccountingDocuments.update`), never SQL; the original error
 *   stays in `cause`, which {@link PersistenceError.toJSON} deliberately
 *   excludes — the same reasoning as `DomainError` (06-security-engineering:
 *   error output must not disclose internals).
 */

/**
 * What kind of storage failure an adapter reported. The vocabulary is generic
 * on purpose: it says *what happened at the boundary*, never *which table or
 * business rule* was involved — that meaning stays with the owning module.
 */
export enum PersistenceFailureKind {
  /** Another write won: a stale revision or a duplicate identity. */
  CONFLICT = 'CONFLICT',
  /** The store was unreachable; the operation was never attempted. */
  UNAVAILABLE = 'UNAVAILABLE',
  /** The store went silent; whether the write applied is unknown. */
  TIMEOUT = 'TIMEOUT',
  /** The store refused the write (constraint or shape); nothing applied. */
  REJECTED = 'REJECTED',
  /** The adapter could not classify what happened. */
  UNKNOWN = 'UNKNOWN',
}

/** Retry policy and outcome certainty per kind (ADR-004, sections 12–13). */
const FAILURE_POLICY: Readonly<
  Record<PersistenceFailureKind, { readonly retryable: boolean; readonly outcomeKnown: boolean }>
> = {
  [PersistenceFailureKind.CONFLICT]: { retryable: false, outcomeKnown: true },
  [PersistenceFailureKind.UNAVAILABLE]: { retryable: true, outcomeKnown: true },
  [PersistenceFailureKind.TIMEOUT]: { retryable: false, outcomeKnown: false },
  [PersistenceFailureKind.REJECTED]: { retryable: false, outcomeKnown: true },
  [PersistenceFailureKind.UNKNOWN]: { retryable: false, outcomeKnown: false },
};

const KINDS: readonly string[] = Object.values(PersistenceFailureKind);

/** Runtime guard so an unclassified driver string cannot become a kind. */
export function isPersistenceFailureKind(value: unknown): value is PersistenceFailureKind {
  return typeof value === 'string' && (KINDS as readonly string[]).includes(value);
}

/**
 * Identifiers naming the position where the failure happened, e.g.
 * `AccountingDocuments.update`. Short and opaque, so no query, path or payload
 * can be smuggled into an error message through this field.
 */
const SAFE_OPERATION = /^[A-Za-z0-9._:-]{1,128}$/;
const OPERATION_EXPECTATION =
  'a short operation name of at most 128 characters ' + '(letters, digits, ".", "_", ":", "-")';

/** The log-safe shape of a persistence failure. Excludes `cause` on purpose. */
export interface PersistenceErrorSnapshot {
  readonly kind: PersistenceFailureKind;
  readonly operation: string;
  readonly retryable: boolean;
  readonly outcomeKnown: boolean;
  readonly message: string;
}

export class PersistenceError extends Error {
  /** What kind of storage failure this is, from the shared vocabulary. */
  public readonly kind: PersistenceFailureKind;

  /** Where it happened, as named by the caller — never SQL. */
  public readonly operation: string;

  /** Whether an identical retry may succeed with no further information. */
  public readonly retryable: boolean;

  /**
   * Whether the store's state after the failure is known. `false` means the
   * boundary must verify (idempotency key, execution record) before repeating
   * or reporting anything — never assume and never report success.
   */
  public readonly outcomeKnown: boolean;

  public constructor(
    kind: PersistenceFailureKind,
    operation: string,
    options?: { readonly cause?: unknown },
  ) {
    if (!isPersistenceFailureKind(kind)) {
      throw new InvalidPrimitiveError(
        'PersistenceError',
        `kind must be one of ${KINDS.join(', ')} but received ${describeValue(kind)}`,
      );
    }

    const normalizedOperation = validateMatches(
      validateNonBlank(operation, 'PersistenceError', 'operation'),
      SAFE_OPERATION,
      'PersistenceError',
      'operation',
      OPERATION_EXPECTATION,
    );

    super(
      `${normalizedOperation} failed (${kind})`,
      options?.cause === undefined ? undefined : { cause: options.cause },
    );
    this.name = 'PersistenceError';
    this.kind = kind;
    this.operation = normalizedOperation;
    this.retryable = FAILURE_POLICY[kind].retryable;
    this.outcomeKnown = FAILURE_POLICY[kind].outcomeKnown;
    Object.freeze(this);
  }

  /**
   * Translates this failure into the shared error vocabulary *when a client can
   * act on it*, and returns `undefined` when the failure must stay technical.
   *
   * A lost race — a stale revision or a duplicate — is the one case a caller
   * can genuinely respond to: reload and try again, so it becomes the shared
   * `ConflictError`. Anything else (unreachable store, refused write, unknown
   * outcome) carries no client decision, so it is left alone for the boundary
   * to retry, park for review, or surface as `INTERNAL_ERROR`. A module that
   * recognises its own situation maps it with its own `DomainError` code.
   */
  public toDomainError(): DomainError | undefined {
    if (this.kind === PersistenceFailureKind.CONFLICT) {
      return new ConflictError('The record was changed by someone else. Reload it and try again.');
    }
    return undefined;
  }

  /**
   * The failure as plain data, safe for a log line or an internal handler.
   * Excludes `cause`, because a cause is where the driver exception — with its
   * connection strings, SQL and identifiers — tends to hide.
   */
  public toJSON(): PersistenceErrorSnapshot {
    return {
      kind: this.kind,
      operation: this.operation,
      retryable: this.retryable,
      outcomeKnown: this.outcomeKnown,
      message: this.message,
    };
  }
}
