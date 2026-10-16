import { ValidationError } from '../../../../shared/errors/category-errors.js';
import type { DomainError } from '../../../../shared/errors/domain-error.js';
import type { ErrorDetail } from '../../../../shared/errors/error-detail.js';
import { Result } from '../../../../shared/errors/result.js';
import { InvalidPrimitiveError } from '../../../../shared/primitives/invalid-primitive-error.js';
import { DateTime } from '../../../../shared/time/date-time.js';
import { isOpaqueIdentifier } from '../../domain/audit-identifiers.js';
import { AuditAction } from '../../domain/value-objects/audit-action.js';
import { InvalidAuditTimeRangeError } from '../../domain/errors/audit.errors.js';

import type { AuditOutcomeValue } from '../../domain/value-objects/audit-outcome.js';
import { AuditOutcome } from '../../domain/value-objects/audit-outcome.js';
import { isAuditTargetType } from '../../domain/value-objects/audit-target.js';

/**
 * Turns a retrieval request's raw filters into the closed criteria the read
 * port accepts (AUD-001).
 *
 * The HTTP boundary already rejects a malformed query as a *client* mistake
 * (FND-006), but a retrieval is also called from tests and other application
 * code, so it owns the same decision in business terms: a filter the trail
 * cannot express is an expected `Result.fail(ValidationError)`, not a thrown
 * primitive error a caller would have to treat as a bug.
 *
 * Every filter is *narrowing*: an invalid one is refused rather than ignored,
 * because silently dropping a filter would answer a wider question than the one
 * that was asked — and on an audit trail that is precisely the mistake that
 * matters (an operator who asked for one actor and received the whole trail
 * would not know it).
 */

/** The largest page number a retrieval accepts, so a page cannot be a wild guess. */
export const AUDIT_MAX_PAGE = 1_000_000;

/** What a caller may ask to filter by; all strings arrive as given. */
export interface AuditRecordFilterInput {
  readonly actorUserId?: string;
  readonly action?: string;
  readonly targetType?: string;
  readonly targetId?: string;
  readonly outcome?: string;
  readonly from?: string;
  readonly to?: string;
  readonly page: number;
  readonly limit: number;
}

/** The validated filters, ready to be completed with the resolved tenant. */
export interface AuditRecordFilters {
  readonly actorUserId?: string;
  readonly action?: string;
  readonly targetType?: string;
  readonly targetId?: string;
  readonly outcome?: AuditOutcomeValue;
  readonly from?: DateTime;
  readonly to?: DateTime;
  readonly page: number;
  readonly limit: number;
}

/** Validates the filters of one retrieval request. */
export function parseAuditRecordFilters(
  input: AuditRecordFilterInput,
): Result<AuditRecordFilters, DomainError> {
  const details: ErrorDetail[] = [];

  let actorUserId: string | undefined;
  if (input.actorUserId !== undefined) {
    if (isOpaqueIdentifier(input.actorUserId)) {
      actorUserId = input.actorUserId.trim();
    } else {
      details.push(invalid('actorUserId', 'actorUserId must be a short opaque identifier'));
    }
  }

  let action: string | undefined;
  if (input.action !== undefined) {
    if (AuditAction.is(input.action)) {
      action = AuditAction.from(input.action).value;
    } else {
      details.push(
        invalid(
          'action',
          'action must be a dotted lower-case action name such as "user.signed_in"',
        ),
      );
    }
  }

  let targetType: string | undefined;
  if (input.targetType !== undefined) {
    if (isAuditTargetType(input.targetType)) {
      targetType = input.targetType.trim().toLowerCase();
    } else {
      details.push(invalid('targetType', 'targetType must be a lower-case resource type'));
    }
  }

  let targetId: string | undefined;
  if (input.targetId !== undefined) {
    if (isOpaqueIdentifier(input.targetId)) {
      targetId = input.targetId.trim();
    } else {
      details.push(invalid('targetId', 'targetId must be a short opaque identifier'));
    }
  }

  let outcome: AuditOutcomeValue | undefined;
  if (input.outcome !== undefined) {
    if (AuditOutcome.is(input.outcome)) {
      outcome = input.outcome;
    } else {
      details.push(invalid('outcome', 'outcome must be one of success, failure, denied'));
    }
  }

  const from = parseInstant(input.from, 'from', details);
  const to = parseInstant(input.to, 'to', details);

  if (details.length > 0) {
    return Result.fail(ValidationError.fromDetails(details, 'The audit query is invalid.'));
  }

  if (input.page < 1 || !Number.isInteger(input.page) || input.page > AUDIT_MAX_PAGE) {
    return Result.fail(
      ValidationError.fromDetails(
        [invalid('page', `page must be an integer between 1 and ${AUDIT_MAX_PAGE}`)],
        'The audit query is invalid.',
      ),
    );
  }

  if (input.limit < 1 || !Number.isInteger(input.limit)) {
    return Result.fail(
      ValidationError.fromDetails(
        [invalid('limit', 'limit must be a positive integer')],
        'The audit query is invalid.',
      ),
    );
  }

  if (from !== undefined && to !== undefined && from.isAfter(to)) {
    // A reversed window is a mistake the caller can see and fix; answering it
    // with an empty page would hide it.
    return Result.fail(new InvalidAuditTimeRangeError());
  }

  return Result.ok({
    ...(actorUserId === undefined ? {} : { actorUserId }),
    ...(action === undefined ? {} : { action }),
    ...(targetType === undefined ? {} : { targetType }),
    ...(targetId === undefined ? {} : { targetId }),
    ...(outcome === undefined ? {} : { outcome }),
    ...(from === undefined ? {} : { from }),
    ...(to === undefined ? {} : { to }),
    page: input.page,
    limit: input.limit,
  });
}

/** Builds one field-level validation detail, with a stable code per field. */
function invalid(field: string, message: string): ErrorDetail {
  const code = `${field.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toUpperCase()}_INVALID`;

  return { code, field, message };
}

/** Parses an ISO-8601 instant filter, recording a detail when it is unusable. */
function parseInstant(
  raw: string | undefined,
  field: string,
  details: ErrorDetail[],
): DateTime | undefined {
  if (raw === undefined) return undefined;

  try {
    return DateTime.parse(raw);
  } catch (error) {
    if (error instanceof InvalidPrimitiveError) {
      details.push(
        invalid(
          field,
          `${field} must be an ISO-8601 instant with a zone, e.g. "2026-10-16T09:00:00.000Z"`,
        ),
      );
      return undefined;
    }
    throw error;
  }
}
