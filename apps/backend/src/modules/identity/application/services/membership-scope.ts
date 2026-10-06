import { NotFoundError, ValidationError } from '../../../../shared/errors/category-errors.js';
import type { DomainError } from '../../../../shared/errors/domain-error.js';
import { Result } from '../../../../shared/errors/result.js';
import { TenantScope } from '../../../../shared/tenant/tenant-scope.js';
import {
  tenantReferenceFrom,
  isTenantReference,
  type TenantReference,
} from '../../domain/value-objects/tenant-reference.js';

/**
 * Resolves the tenant a membership operation is allowed to act on (IAM-003;
 * SHR-007; ADR-001 section 13; ADR-003 section 24).
 *
 * A membership belongs to exactly one tenant, so every tenant-scoped membership
 * operation reads the tenant from the ambient tenant scope — the one the trusted
 * entry point established from the target the application resolved — and *checks*
 * the requested tenant against it. The scope is the authority; the id in the
 * payload is only a claim that must match it. A mismatch is answered as a
 * not-found rather than as a reveal that the membership exists in another
 * tenant.
 *
 * `TenantScope.require()` fails closed: without an available scope the gate
 * refuses before this function does anything, so a membership operation can
 * never run unscoped by accident.
 *
 * The membership's tenant identity is the shared tenant boundary string, so the
 * id this returns is directly usable as `Membership.tenantId` and as the value
 * stamped on the events the operation raises.
 */
export function resolveMembershipTenant(rawTenantId: string): Result<TenantReference, DomainError> {
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
    return Result.fail(new NotFoundError('The membership was not found.'));
  }

  return Result.ok(tenantId);
}

/** The one not-found failure a membership lookup reports inside a tenant. */
export function membershipNotFound(): NotFoundError {
  return new NotFoundError('The membership was not found.');
}
