import { ConflictError } from '../errors/category-errors.js';
import { ErrorCategory } from '../errors/error-category.js';
import { DomainError } from '../errors/domain-error.js';
import { PersistenceError, PersistenceFailureKind } from './persistence-error.js';
import type { Revision } from './revision.js';
import type { StaleRevision } from './stale-revision.js';
import { isStaleRevision, staleRevision } from './stale-revision.js';

/**
 * The shared optimistic-concurrency mechanism (SHR-008; ADR-004 section 27).
 *
 * The moving parts already exist and belong to their owners: `Revision` and the
 * repository ports are SHR-004, the transaction boundary is SHR-005, and the
 * shared `ConflictError` is SHR-002. What was missing is the one place that
 * ties a *lost race* together — a factory every adapter reports it through, and
 * the guards the application uses to recognise it — so "stale write" means the
 * same thing in every module instead of being re-invented per adapter:
 *
 * ```text
 * application                     shared mechanism                    adapter
 *   get(id)          →            Loaded { aggregate, revision N }
 *   change it in Domain
 *   update(a, N)     →            ──►  one compare-and-swap  ────────►  stored?
 *                                     ├── N still current → receipt N+1
 *                                     └── otherwise        → PersistenceError(CONFLICT)
 *                                                          with the stale revision as its cause
 * ```
 *
 * Three properties are deliberate:
 *
 * - **No last-write-wins.** The expected revision is a required argument of
 *   `update`, so a write that does not state which state it believes is
 *   current cannot be expressed. This module adds no path that writes without
 *   one, and no option to ignore a mismatch.
 * - **No automatic retry.** A conflict is `retryable: false` with a known
 *   outcome: nothing was written, and repeating the same business mutation
 *   would be a second attempt at an operation whose inputs are now known to be
 *   stale. Reloading, rebuilding and re-asking the caller are decisions for the
 *   application or the owning Domain (ADR-004, section 12) — nothing here
 *   re-runs anything.
 * - **No storage vocabulary.** The factory takes a caller-named `operation`
 *   position (`SalesDocuments.update`) and two `Revision` values. It knows
 *   nothing about a table, a column or a query, so the same failure shape works
 *   for MySQL, an in-memory test store or whatever comes next.
 *
 * Domain never constructs a `PersistenceError`: an adapter raises this failure,
 * the application reads it back with {@link staleRevisionOf},
 * {@link isConcurrencyConflict} or {@link toConflict}, and decides what the
 * business does about a conflict.
 */

/**
 * The failure an adapter raises when a write lost its race.
 *
 * Always `CONFLICT` — never `REJECTED` (the store refused the shape) and never
 * `UNKNOWN` (the outcome is unverifiable): a stale revision means the write was
 * *not* applied and someone else's did, which is precisely the outcome the
 * application can act on. The `cause` carries the stale revision so the
 * conflict can be explained, not merely detected.
 *
 * Adapters only. Nothing in Domain or Application calls this.
 *
 * ```ts
 * if (header.affectedRows === 0) {
 *   throw staleRevisionConflict('SalesDocuments.update', expectedRevision);
 * }
 * ```
 */
export function staleRevisionConflict(
  operation: string,
  expected: Revision,
  actual?: Revision,
): PersistenceError {
  return new PersistenceError(PersistenceFailureKind.CONFLICT, operation, {
    cause: staleRevision(expected, actual),
  });
}

/**
 * The stale revision behind a failed write, or `undefined` when the failure was
 * not a stale revision (a duplicate identity, an unrelated error, a failure
 * whose adapter reported no cause).
 *
 * This is what lets a use case say *which* state it was working against rather
 * than a generic "someone else changed it" — while `undefined` keeps honest
 * the common case where a compare-and-swap cannot read the current revision.
 */
export function staleRevisionOf(error: unknown): StaleRevision | undefined {
  return error instanceof PersistenceError && isStaleRevision(error.cause)
    ? error.cause
    : undefined;
}

/**
 * Whether a failure is a concurrency conflict at all — a stale revision, a
 * duplicate identity, or a `DomainError` the owning module already classified
 * as `CONFLICT`.
 *
 * The test a use case needs before deciding: a conflict is *not* a validation
 * failure and *not* a technical fault. It is the one outcome where the caller
 * is told the state moved underneath it, so the application can reload, ask for
 * review, recompute a plan — never blindly repeat the mutation.
 */
export function isConcurrencyConflict(error: unknown): boolean {
  if (error instanceof PersistenceError) {
    return error.kind === PersistenceFailureKind.CONFLICT;
  }
  if (error instanceof DomainError) {
    return error.category === ErrorCategory.CONFLICT;
  }
  return false;
}

/**
 * The shared `ConflictError` behind a technical failure, or `undefined` when
 * there is none to translate.
 *
 * A `PersistenceError(CONFLICT)` is the only storage failure a caller can act
 * on, so it becomes the shared conflict — carrying the stale revision as an
 * `ErrorDetail` when the adapter reported one. An error that is already a
 * `ConflictError` is returned unchanged; everything else (an unreachable store,
 * a refused write, an unknown outcome, a validation failure) has no conflict to
 * translate and stays where it is, thrown for the boundary to handle.
 */
export function toConflict(error: unknown): ConflictError | undefined {
  if (error instanceof ConflictError) {
    return error;
  }
  if (error instanceof PersistenceError) {
    const translated = error.toDomainError();
    return translated instanceof ConflictError ? translated : undefined;
  }
  return undefined;
}
