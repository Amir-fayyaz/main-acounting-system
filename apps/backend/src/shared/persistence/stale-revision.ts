import type { ErrorDetail } from '../errors/error-detail.js';
import { MAX_REVISION, type Revision } from './revision.js';

/**
 * The stale-update cause as plain data (SHR-008; ADR-004 section 27).
 *
 * When a write loses a race, the adapter knows two facts and nothing else:
 * *which* revision the writer believed was stored, and — when its store can
 * still answer — *which* revision is stored now. Both are recorded here so the
 * failure stays distinguishable all the way to the use case:
 *
 * ```text
 * read at revision 10  →  rival writes 11  →  write with expected 10
 *                                              └── refused, cause = { expected: 10, actual: 11 }
 * ```
 *
 * The cause is deliberately unbusinesslike. It says nothing about which record,
 * which rule or which module was involved — those stay with the owning module —
 * and it holds no driver text, no query and no identifier, so it is safe to
 * carry into an `ErrorDetail` a client may see. What it does carry is exactly
 * what the application needs to decide between reloading, asking the user to
 * review, or rebuilding an operation.
 *
 * `actual` is optional on purpose: a compare-and-swap that reports "nothing
 * matched" usually does not say *what* is stored instead, and inventing a value
 * would turn an honest unknown into a wrong answer.
 *
 * This module owns the shape and its guard only. Adapters build one through
 * `staleRevisionConflict(...)` in `optimistic-concurrency.ts`, never by hand —
 * and never from Domain, which does not construct persistence failures at all.
 */

/** The `ErrorDetail.code` a stale update carries into the shared error vocabulary. */
export const STALE_REVISION_DETAIL_CODE = 'STALE_REVISION';

/**
 * Why a write was refused: the revision the writer expected, and the one that
 * is actually stored when the adapter could read it.
 *
 * Numbers rather than `Revision` instances on purpose — this is a cause riding
 * on an `Error`, so it must stay inert, serializable data.
 */
export interface StaleRevision {
  /** The revision the writer observed when it loaded the record. */
  readonly expected: number;
  /** The revision stored now, or `undefined` when the store did not report it. */
  readonly actual: number | undefined;
}

/**
 * Records a lost race as data.
 *
 * Both numbers come from a `Revision`, which already validated them, so this is
 * a copy into inert data rather than another validation step.
 */
export function staleRevision(expected: Revision, actual?: Revision): StaleRevision {
  return Object.freeze({
    expected: expected.value,
    actual: actual === undefined ? undefined : actual.value,
  });
}

/**
 * Runtime guard for a cause read back off an `Error`, where nothing guarantees
 * it was produced by {@link staleRevision}.
 */
export function isStaleRevision(value: unknown): value is StaleRevision {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }
  const candidate = value as { readonly expected?: unknown; readonly actual?: unknown };
  return (
    isRevisionNumber(candidate.expected) &&
    (candidate.actual === undefined || isRevisionNumber(candidate.actual))
  );
}

/**
 * The client-safe reason a `DomainError` carries for a stale update — the
 * numbers that make "reload and try again" concrete instead of a bare apology.
 */
export function staleRevisionDetail(stale: StaleRevision): ErrorDetail {
  const base = {
    code: STALE_REVISION_DETAIL_CODE,
    field: 'revision',
    expected: stale.expected,
  };

  if (stale.actual === undefined) {
    return {
      ...base,
      message:
        `The record was written by someone else; this update was prepared ` +
        `against revision ${stale.expected}.`,
    };
  }
  return {
    ...base,
    message:
      `The record is now at revision ${stale.actual}; this update was prepared ` +
      `against revision ${stale.expected}.`,
    actual: stale.actual,
  };
}

function isRevisionNumber(value: unknown): value is number {
  return (
    typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= MAX_REVISION
  );
}
