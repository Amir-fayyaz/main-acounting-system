import { NotFoundError, ValidationError } from '../../../../shared/errors/category-errors.js';
import type { DomainError } from '../../../../shared/errors/domain-error.js';
import { Result } from '../../../../shared/errors/result.js';
import { TenantScope } from '../../../../shared/tenant/tenant-scope.js';
import {
  isTenantReference,
  tenantReferenceFrom,
  type TenantReference,
} from '../../domain/value-objects/tenant-reference.js';

/**
 * Resolves the tenant a tenant-scoped identity operation is allowed to act on
 * (IAM-003 / IAM-004; SHR-007; ADR-001 section 13; ADR-003 section 24).
 *
 * Membership, role and assignment data all belong to exactly one tenant, so every
 * tenant-scoped operation reads the tenant from the ambient tenant scope — the
 * one the trusted entry point established from the target the application
 * resolved — and *checks* the requested tenant against it. The scope is the
 * authority; the id in the payload or path is only a claim that must match it. A
 * mismatch is answered as a not-found rather than as a reveal that the record
 * exists in another tenant, so a probe learns nothing across the boundary.
 *
 * `TenantScope.require()` fails closed: without an available scope the gate
 * refuses before this function does anything, so a tenant-scoped operation can
 * never run unscoped by accident.
 *
 * The tenant identity returned is the shared tenant boundary string, so it is
 * directly usable as the value stamped on the events the operation raises and
 * comparable with an aggregate's own `tenantId`.
 */
export function resolveScopedTenant(rawTenantId: string): Result<TenantReference, DomainError> {
  if (!isTenantReference(rawTenantId)) {
    return Result.fail(
      new ValidationError('The tenant identifier is invalid.', [
        {
          code: 'TENANT_ID_INVALID',
          field: 'tenantId',
          message: 'tenantId must be a UUID tenant identifier',
        },
      ]),
    );
  }

  const scope = TenantScope.require();
  const tenantId = tenantReferenceFrom(rawTenantId);

  if (scope.tenantId !== tenantId.value) {
    return Result.fail(new NotFoundError('The requested record was not found.'));
  }

  return Result.ok(tenantId);
}
