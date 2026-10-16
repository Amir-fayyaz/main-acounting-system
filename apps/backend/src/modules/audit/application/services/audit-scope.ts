import { NotFoundError, ValidationError } from '../../../../shared/errors/category-errors.js';
import type { DomainError } from '../../../../shared/errors/domain-error.js';
import { Result } from '../../../../shared/errors/result.js';
import { TenantScope } from '../../../../shared/tenant/tenant-scope.js';
import { isOpaqueIdentifier } from '../../domain/audit-identifiers.js';

/**
 * Resolves the tenant whose audit trail a retrieval may read (AUD-001;
 * SHR-007; ADR-003 section 24; ADR-010 section 4).
 *
 * The scope is the authority and the requested id is only a claim: the tenant
 * is read from the ambient tenant scope — established by the trusted entry
 * point from the tenant the authorization boundary verified — and the requested
 * tenant is *checked* against it. A mismatch is answered as not-found rather
 * than as a refusal that would reveal whether another tenant's records exist,
 * so a probe learns nothing across the boundary (the same rule membership and
 * role reads apply).
 *
 * `TenantScope.require()` fails closed first, so a retrieval can never run
 * unscoped: without an available tenant context this function throws
 * `TenantContextMissingError` before it looks at anything else.
 *
 * Note what is *not* read here: no header, no query parameter, no body. A
 * client-supplied tenant can therefore never become the scope of a read — it can
 * only be the claim this function compares against the resolved scope, and a
 * claim that does not match is refused.
 */
export function resolveAuditTenant(rawTenantId: string): Result<string, DomainError> {
  if (typeof rawTenantId !== 'string' || !isOpaqueIdentifier(rawTenantId)) {
    return Result.fail(
      new ValidationError('The tenant identifier is invalid.', [
        {
          code: 'TENANT_ID_INVALID',
          field: 'tenantId',
          message: 'tenantId must be the opaque identifier of a tenant',
        },
      ]),
    );
  }

  const scope = TenantScope.require();

  if (scope.tenantId !== rawTenantId.trim()) {
    return Result.fail(new NotFoundError('The requested record was not found.'));
  }

  return Result.ok(scope.tenantId);
}
