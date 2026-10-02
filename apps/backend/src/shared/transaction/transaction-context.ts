import { AsyncLocalStorage } from 'node:async_hooks';

/**
 * The transaction the current call stack is participating in (SHR-005;
 * ADR-004 sections 4–6 and 27).
 *
 * The boundary belongs to the Application layer, but the code that must
 * *participate* in it is a repository adapter several frames down the call
 * stack — and the repository ports (SHR-004) deliberately carry no transaction
 * parameter. Threading one through every call would push transaction handling
 * into Domain signatures; letting each adapter keep its own context would let a
 * write silently leave the boundary.
 *
 * So the active transaction travels as ambient state: a scope the boundary
 * opens around its work, which every adapter reads through this one approved
 * abstraction —
 *
 * ```ts
 * const db = TransactionContext.currentHandle<Database>() ?? this.database;
 * ```
 *
 * — and thereby joins whatever transaction the use case opened, or writes
 * autocommitted when no transaction is open at all. Propagation follows the
 * asynchronous call chain (`await` to `await`), so a nested use case observes
 * the same transaction its caller opened without either of them naming it.
 *
 * Three rules keep the context honest:
 *
 * - **Observation only.** `current()` and `currentHandle()` read; they cannot
 *   begin, commit or roll back anything. Opening a transaction is
 *   `TransactionBoundary.execute`'s job — and Domain never touches that
 *   (`module-boundaries.spec.ts` fails the run if it tries).
 * - **No framework underneath.** The store is `node:async_hooks`, the Node
 *   runtime's own mechanism for following an async call chain — no HTTP
 *   middleware, no Redis key, no request-scoped container, no provider API.
 * - **The handle is opaque here.** The kernel knows nothing about a driver:
 *   only the adapter family that began the transaction interprets what the
 *   handle is, and it does so through the same generic read every other
 *   adapter of that family uses.
 *
 * A scope is only as long as the work it wraps: fire-and-forget work started
 * inside a boundary must not be expected to still be inside it — by the time
 * it runs, the boundary has committed or rolled back (ADR-004, section 9:
 * what happens after the boundary is a separate decision, not transaction
 * state).
 */

/**
 * The participation token of one open transaction.
 *
 * Created by the adapter that begins the transaction, published by the
 * boundary, and read by every repository that wants to participate. The
 * `handle` is whatever the driver handed that adapter — this kernel never
 * opens it, so a Domain that somehow obtained a token still could not begin,
 * commit or roll back anything with it.
 */
export interface ActiveTransaction {
  /** Driver-owned state, interpreted only by the adapter that created it. */
  readonly handle: unknown;
}

/**
 * Bookkeeping of the boundary currently on the stack: the token plus whether
 * any operation inside it has reported a failure.
 *
 * @internal — state of one boundary, mutated only by
 * `createTransactionBoundary` in `./transaction-boundary.js`. Application code
 * never reads or writes it; it calls `TransactionBoundary.execute`.
 */
export interface BoundaryState {
  readonly transaction: ActiveTransaction;
  /** Set the moment any operation inside this boundary reports a failure. */
  failed: boolean;
  /** The first failure observed — kept as the cause reported to the caller. */
  failure: unknown;
}

/**
 * The ambient scope: where the active transaction is published and where the
 * boundary opens and closes it.
 */
export class TransactionContext {
  private static readonly storage = new AsyncLocalStorage<BoundaryState>();

  private constructor() {}

  /**
   * The transaction of the call stack that asks, or `undefined` when no
   * boundary is open.
   *
   * `undefined` is not an error: outside a boundary each statement is its own
   * unit of work, which is exactly what a read or a single independent write
   * should be.
   */
  public static current(): ActiveTransaction | undefined {
    return TransactionContext.storage.getStore()?.transaction;
  }

  /**
   * The driver handle inside the active transaction, typed by the adapter that
   * asks for it — `undefined` when no boundary is open.
   *
   * Only the adapter family that began the transaction may name the type: the
   * generic read is unchecked by design, because the kernel cannot know what a
   * driver's handle is.
   */
  public static currentHandle<T>(): T | undefined {
    return TransactionContext.current()?.handle as T | undefined;
  }

  /**
   * The full state of the boundary on the stack, or `undefined` outside one.
   *
   * @internal — exists so `createTransactionBoundary` can join the boundary it
   * finds; no other code has a use for the failure bookkeeping.
   */
  public static boundaryState(): BoundaryState | undefined {
    return TransactionContext.storage.getStore();
  }

  /**
   * Runs `work` with `state` published as the active transaction.
   *
   * @internal — called only by `createTransactionBoundary`, which is what
   * decides when a transaction begins and ends.
   */
  public static enter<T>(state: BoundaryState, work: () => Promise<T>): Promise<T> {
    return TransactionContext.storage.run(state, work);
  }
}
