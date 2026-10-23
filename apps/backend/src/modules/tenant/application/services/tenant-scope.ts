import { NotFoundError, ValidationError } from '../../../../shared/errors/category-errors.js';
import type { DomainError } from '../../../../shared/errors/domain-error.js';
import { Result } from '../../../../shared/errors/result.js';
import { TenantScope } from '../../../../shared/tenant/tenant-scope.js';
import { isSameTenant } from '../../../../shared/tenant/tenant-identity.js';
import { tenantIdFrom, isTenantId, type TenantId } from '../../domain/value-objects/tenant-id.js';

/**
 * Resolves the tenant a tenant-scoped operation is allowed to act on
 * (IAM-001; SHR-007; IAM-007).
 *
 * The tenant context is the single source of the boundary: the operation asks
 * the ambient scope which tenant it may touch, and an id that does not match
 * it is answered as a not-found rather than as a reveal that the tenant
 * exists elsewhere. `TenantScope.require()` fails closed — without an available
 * scope the whole operation refuses before this function does anything.
 *
 * The id is validated as a tenant identity first, so a malformed value is a
 * validation answer instead of a primitive error a caller would see as a bug.
 * No client-supplied field is ever read as tenant identity here: the scope was
 * established by a trusted boundary, and this only *checks* the requested
 * target against it.
 *
 * The comparison is canonical, so the two spellings of one UUID are one
 * boundary: a caller that names its own company in upper case is not told it
 * does not belong to it.
 */
export function resolveScopedTenantId(raw: string): Result<TenantId, DomainError> {
  if (!isTenantId(raw)) {
    return Result.fail(
      new ValidationError('The tenant identifier is invalid.', [
        {
          code: 'TENANT_ID_INVALID',
          field: 'id',
          message: 'id must be a UUID tenant identifier',
        },
      ]),
    );
  }

  const scope = TenantScope.require();

  if (!isSameTenant(scope.tenantId, raw)) {
    return Result.fail(new NotFoundError('The tenant was not found.'));
  }

  return Result.ok(tenantIdFrom(raw));
}

/** The one not-found failure a tenant lookup reports. */
export function tenantNotFound(): NotFoundError {
  return new NotFoundError('The tenant was not found.');
}
