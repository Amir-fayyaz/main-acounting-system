import { DomainError } from '../../../../shared/errors/domain-error.js';
import { ErrorCategory } from '../../../../shared/errors/error-category.js';
import type { RoleStatusValue } from '../value-objects/role-status.js';

/**
 * Identity-owned business failures for roles and permissions (IAM-004).
 *
 * Each carries a stable `code` in this module's language, so a client can switch
 * on the failure without parsing a message, and each fixes the shared
 * {@link ErrorCategory} that says *what kind* of failure it is. None knows about
 * HTTP: how a failure becomes a response, a log line or an alert is the
 * presentation layer's decision (FND-006; ADR-013).
 */

/**
 * The requested role does not exist (or is not in the caller's tenant).
 *
 * A role that belongs to another tenant is answered exactly like an unknown one,
 * so a cross-tenant probe learns nothing about which roles exist elsewhere.
 */
export class RoleNotFoundError extends DomainError {
  public constructor() {
    super('ROLE_NOT_FOUND', 'No role was found for the requested identity.', {
      category: ErrorCategory.NOT_FOUND,
    });
  }
}

/**
 * The tenant a role would be created in does not exist.
 *
 * A role is tenant-owned data, so it can only be created against a tenant that
 * exists. The answer comes from the published `TenantDirectory` contract rather
 * than from any tenant table, keeping Identity out of Tenant internals.
 */
export class RoleTenantNotFoundError extends DomainError {
  public constructor() {
    super('ROLE_TENANT_NOT_FOUND', 'No tenant was found for the requested identity.', {
      category: ErrorCategory.NOT_FOUND,
    });
  }
}

/**
 * The role already grants this permission.
 *
 * A role's permission set is a set: assigning the same capability twice is a
 * collision with existing state rather than a second grant, and the domain says
 * so precisely instead of silently doing nothing.
 */
export class DuplicateRolePermissionError extends DomainError {
  public constructor(permission: string) {
    super('DUPLICATE_ROLE_PERMISSION', 'The role already grants this permission.', {
      category: ErrorCategory.CONFLICT,
      details: [
        {
          code: 'DUPLICATE_ROLE_PERMISSION',
          field: 'permissionKey',
          message: `the role already grants "${permission}"`,
        },
      ],
    });
  }
}

/** The role does not grant this permission, so there is nothing to revoke. */
export class RolePermissionNotFoundError extends DomainError {
  public constructor(permission: string) {
    super('ROLE_PERMISSION_NOT_FOUND', 'The role does not grant this permission.', {
      category: ErrorCategory.NOT_FOUND,
      details: [
        {
          code: 'ROLE_PERMISSION_NOT_FOUND',
          field: 'permissionKey',
          message: `the role does not grant "${permission}"`,
        },
      ],
    });
  }
}

/**
 * The requested capability is not in the permission catalog.
 *
 * Permission keys are a closed, deterministic vocabulary; a key the catalog does
 * not define names no capability, so it cannot be granted. Rejecting it here is
 * what keeps a role's permission set resolvable and its effective permissions
 * meaningful.
 */
export class UnknownPermissionError extends DomainError {
  public constructor(permission: string) {
    super('UNKNOWN_PERMISSION', 'The requested permission is not a known capability.', {
      category: ErrorCategory.VALIDATION,
      details: [
        {
          code: 'UNKNOWN_PERMISSION',
          field: 'permissionKey',
          message: `"${permission}" is not a permission in the catalog`,
        },
      ],
    });
  }
}

/** A requested lifecycle move is not allowed from the role's current state. */
export class InvalidRoleStatusTransitionError extends DomainError {
  public constructor(from: RoleStatusValue, to: RoleStatusValue) {
    super(
      'INVALID_ROLE_STATUS_TRANSITION',
      `A role cannot move to "${to}" while it is "${from}".`,
      { category: ErrorCategory.STATE_VIOLATION },
    );
  }
}

/**
 * The role is inactive, so an operation that changes it (or assigns it) is
 * refused before any mutation.
 *
 * Deactivation is not deletion: the role and its history stay, but they stop
 * changing and stop conferring access. Requiring the role to be active is how
 * the domain guarantees that a role taken out of use does not quietly continue
 * to be edited or to grant permissions through a new assignment.
 */
export class InactiveRoleError extends DomainError {
  public constructor() {
    super('ROLE_INACTIVE', 'An inactive role cannot be modified or assigned.', {
      category: ErrorCategory.STATE_VIOLATION,
    });
  }
}
