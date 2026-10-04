import { DomainError } from '../../../../shared/errors/domain-error.js';
import { ErrorCategory } from '../../../../shared/errors/error-category.js';
import type { TenantStatusValue } from '../value-objects/tenant-status.js';

/**
 * Tenant-owned business failures (IAM-001).
 *
 * Each carries a stable `code` in this module's language so a client can switch
 * on the failure without parsing a message, and each fixes the shared
 * {@link ErrorCategory} that says *what kind* of failure it is. None knows about
 * HTTP: how a failure becomes a response, a log line or an alert is the
 * presentation layer's decision (FND-006; ADR-013).
 */

/**
 * A requested lifecycle move is not allowed from the tenant's current state —
 * for example activating a tenant that is already active, or deactivating one
 * that is already inactive.
 *
 * This is the invariant that makes the two-state lifecycle meaningful: a caller
 * cannot "change" a state into the one it already holds and mistake that for
 * progress, and the domain says so precisely instead of silently doing nothing.
 */
export class InvalidTenantStatusTransitionError extends DomainError {
  public constructor(from: TenantStatusValue, to: TenantStatusValue) {
    super(
      'INVALID_TENANT_STATUS_TRANSITION',
      `A tenant cannot move to "${to}" while it is "${from}".`,
      { category: ErrorCategory.STATE_VIOLATION },
    );
  }
}

/**
 * The tenant is inactive, so an operation that changes its current profile is
 * refused before any mutation.
 *
 * Deactivation is not deletion: the record and its history stay, but they stop
 * changing. Requiring the tenant to be active is how the domain guarantees
 * that a tenant taken out of use does not quietly continue to mutate
 * (IAM-001: "operations must validate the current tenant state before
 * mutation").
 */
export class InactiveTenantError extends DomainError {
  public constructor() {
    super('TENANT_INACTIVE', 'An inactive tenant cannot be modified. Reactivate it first.', {
      category: ErrorCategory.STATE_VIOLATION,
    });
  }
}
