import { DomainError } from '../../../../shared/errors/domain-error.js';
import { ErrorCategory } from '../../../../shared/errors/error-category.js';

/**
 * Audit-owned business failures (AUD-001).
 *
 * Each carries a stable `code` in this module's language so a client can switch
 * on the failure without parsing a message, and each fixes the shared
 * {@link ErrorCategory} that says *what kind* of failure it is. None knows about
 * HTTP: how a failure becomes a response is the presentation layer's decision
 * (FND-006; ADR-013).
 *
 * What is deliberately *not* here: an error for a malformed action name, an
 * unknown outcome or a broken identifier. Those are value-object rejections —
 * `InvalidPrimitiveError` — because they mean the recording code is wrong, not
 * that the business decided something. Only the retrieval input, which arrives
 * from a client, has a failure a caller is expected to act on.
 */

/**
 * A retrieval window whose start is after its end.
 *
 * Half-open ranges are a normal request shape, and reversing them is a mistake
 * a caller can and should see: silently swapping the bounds would answer a
 * question nobody asked, and answering "nothing matched" would hide the
 * mistake. This is why the failure is `VALIDATION` rather than an empty page.
 */
export class InvalidAuditTimeRangeError extends DomainError {
  public constructor() {
    super(
      'INVALID_AUDIT_TIME_RANGE',
      'The audit time range is invalid: "from" must not be after "to".',
      { category: ErrorCategory.VALIDATION },
    );
  }
}
