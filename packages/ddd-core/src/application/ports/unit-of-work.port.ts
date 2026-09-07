/** Injection token for the UnitOfWork port (framework-agnostic symbol). */
export const UNIT_OF_WORK = Symbol('UNIT_OF_WORK');

/**
 * Application-owned port for the transaction boundary of a use case. One
 * aggregate per transaction: the adapter commits when `work` resolves and
 * rolls back when it throws.
 */
export interface UnitOfWork {
  run<T>(work: () => Promise<T>): Promise<T>;
}
