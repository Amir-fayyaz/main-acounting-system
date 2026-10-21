import { DomainError } from '../../../../shared/errors/domain-error.js';
import { ErrorCategory } from '../../../../shared/errors/error-category.js';

/**
 * The caller is authenticated but may not use the named company as their
 * active tenant (Tenant Controller / select-active-company).
 *
 * Distinct from `MEMBERSHIP_REQUIRED` so clients can tell "you cannot select
 * this company" from a generic authorization denial on another operation.
 * The message never discloses whether the tenant exists for someone else.
 */
export class TenantAccessDeniedError extends DomainError {
  public constructor() {
    super(
      'TENANT_ACCESS_DENIED',
      'The authenticated principal cannot select this company as the active tenant.',
      { category: ErrorCategory.BUSINESS_RULE },
    );
  }
}
