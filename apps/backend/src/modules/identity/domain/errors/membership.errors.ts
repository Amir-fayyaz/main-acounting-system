import { DomainError } from '../../../../shared/errors/domain-error.js';
import { ErrorCategory } from '../../../../shared/errors/error-category.js';
import type { MembershipStatusValue } from '../value-objects/membership-status.js';

/**
 * Identity-owned business failures for the membership relationship (IAM-003).
 *
 * Each carries a stable `code` in this module's language, so a client can switch
 * on the failure without parsing a message, and each fixes the shared
 * {@link ErrorCategory} that says *what kind* of failure it is. None knows about
 * HTTP: how a failure becomes a response, a log line or an alert is the
 * presentation layer's decision (FND-006; ADR-013).
 */

/** The requested membership does not exist (or is not in the caller's tenant). */
export class MembershipNotFoundError extends DomainError {
  public constructor() {
    super('MEMBERSHIP_NOT_FOUND', 'No membership was found for the requested identity.', {
      category: ErrorCategory.NOT_FOUND,
    });
  }
}

/**
 * The tenant a membership would be created against does not exist.
 *
 * Ownership is per-module: a User is this module's own identity and is checked
 * against its own repository, but a Tenant is another module's data, so
 * the answer comes from the published `TenantDirectory` contract rather than
 * from any tenant table. Reporting it as `NOT_FOUND` keeps the same answer a
 * caller would get for a tenant that does not exist anywhere.
 */
export class MembershipTenantNotFoundError extends DomainError {
  public constructor() {
    super('MEMBERSHIP_TENANT_NOT_FOUND', 'No tenant was found for the requested identity.', {
      category: ErrorCategory.NOT_FOUND,
    });
  }
}

/**
 * A membership for this User and Tenant already exists.
 *
 * At most one membership record is kept per (User, Tenant) pair, whatever its
 * state, because deactivation preserves the record rather than deleting it
 * (the historical-safety requirement). Re-joining is therefore a lifecycle move
 * on the existing membership, never a second record — and a second insert is a
 * collision with existing state, reported as a conflict the caller can act on.
 */
export class DuplicateMembershipError extends DomainError {
  public constructor(userId: string, tenantId: string) {
    super('DUPLICATE_MEMBERSHIP', 'A membership already exists for this user and tenant.', {
      category: ErrorCategory.CONFLICT,
      details: [
        {
          code: 'DUPLICATE_MEMBERSHIP',
          field: 'userId',
          message: `user "${userId}" already has a membership in tenant "${tenantId}"`,
        },
      ],
    });
  }
}

/**
 * A requested lifecycle move is not allowed from the membership's current state
 * — activating an already active membership, or deactivating one that is
 * already inactive.
 *
 * This is the invariant that makes the two-state lifecycle meaningful: a caller
 * cannot "change" a state into the one it already holds and mistake that for
 * progress, and the domain says so precisely instead of silently doing nothing.
 */
export class InvalidMembershipStatusTransitionError extends DomainError {
  public constructor(from: MembershipStatusValue, to: MembershipStatusValue) {
    super(
      'INVALID_MEMBERSHIP_STATUS_TRANSITION',
      `A membership cannot move to "${to}" while it is "${from}".`,
      { category: ErrorCategory.STATE_VIOLATION },
    );
  }
}
