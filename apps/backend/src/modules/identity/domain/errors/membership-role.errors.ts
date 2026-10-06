import { DomainError } from '../../../../shared/errors/domain-error.js';
import { ErrorCategory } from '../../../../shared/errors/error-category.js';
import type { MembershipRoleStatusValue } from '../value-objects/membership-role-status.js';

/**
 * Identity-owned business failures for Membership-Role assignments (IAM-004).
 *
 * Each carries a stable `code`, so a client can switch on the failure without
 * parsing a message, and each fixes the shared {@link ErrorCategory}. None knows
 * about HTTP (FND-006; ADR-013).
 */

/**
 * The requested assignment does not exist, or its membership or role is not in
 * the caller's tenant.
 *
 * Cross-tenant and unknown are answered identically, so a probe cannot discover
 * another tenant's access data.
 */
export class MembershipRoleNotFoundError extends DomainError {
  public constructor() {
    super('MEMBERSHIP_ROLE_NOT_FOUND', 'No role assignment was found for the requested identity.', {
      category: ErrorCategory.NOT_FOUND,
    });
  }
}

/**
 * The membership already actively holds this role.
 *
 * At most one assignment record is kept per (Membership, Role) pair, whatever its
 * state, because removal preserves the record rather than deleting it. Holding
 * the role again is therefore a lifecycle move on the existing assignment, not a
 * second record — and a second active assignment is a collision with existing
 * state, reported as a conflict.
 */
export class DuplicateRoleAssignmentError extends DomainError {
  public constructor(membershipId: string, roleId: string) {
    super('DUPLICATE_ROLE_ASSIGNMENT', 'The membership already holds this role.', {
      category: ErrorCategory.CONFLICT,
      details: [
        {
          code: 'DUPLICATE_ROLE_ASSIGNMENT',
          field: 'roleId',
          message: `membership "${membershipId}" already holds role "${roleId}"`,
        },
      ],
    });
  }
}

/** A requested lifecycle move is not allowed from the assignment's current state. */
export class InvalidRoleAssignmentTransitionError extends DomainError {
  public constructor(from: MembershipRoleStatusValue, to: MembershipRoleStatusValue) {
    super(
      'INVALID_ROLE_ASSIGNMENT_TRANSITION',
      `A role assignment cannot move to "${to}" while it is "${from}".`,
      { category: ErrorCategory.STATE_VIOLATION },
    );
  }
}
