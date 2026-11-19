import type { AuthenticatedPrincipalView } from '../../../identity/application/views/principal.view.js';
import type { Authorization } from '../../../identity/application/ports/authorization.port.js';
import { PermissionKey } from '../../../identity/domain/value-objects/permission-key.js';
import { Result } from '../../../../shared/errors/result.js';
import { DomainError } from '../../../../shared/errors/domain-error.js';
import { ErrorCategory } from '../../../../shared/errors/error-category.js';

export class SupplierPermissionDeniedError extends DomainError {
  public constructor(message = 'The user lacks required permission to manage suppliers.') {
    super('SUPPLIER_PERMISSION_DENIED', message, {
      category: ErrorCategory.BUSINESS_RULE,
    });
  }
}

/**
 * Access control port for supplier operations (B-03).
 */
export interface SupplierAuthorizationPort {
  authorizeWrite(
    tenantId: string,
    principal?: AuthenticatedPrincipalView,
  ): Promise<Result<void, DomainError>>;
}

export class AllowAllSupplierAuthorization implements SupplierAuthorizationPort {
  public async authorizeWrite(
    _tenantId: string,
    _principal?: AuthenticatedPrincipalView,
  ): Promise<Result<void, DomainError>> {
    return Result.ok(undefined);
  }
}

export class DenyAllSupplierAuthorization implements SupplierAuthorizationPort {
  public async authorizeWrite(
    _tenantId: string,
    _principal?: AuthenticatedPrincipalView,
  ): Promise<Result<void, DomainError>> {
    return Result.fail(new SupplierPermissionDeniedError());
  }
}

export class IdentitySupplierAuthorization implements SupplierAuthorizationPort {
  public constructor(private readonly authorization: Authorization) {}

  public async authorizeWrite(
    tenantId: string,
    principal?: AuthenticatedPrincipalView,
  ): Promise<Result<void, DomainError>> {
    if (!principal) {
      return Result.fail(new SupplierPermissionDeniedError('No authenticated principal provided.'));
    }

    const outcome = await this.authorization.authorize({
      principal,
      requiredPermission: PermissionKey.from('supplier.manage'),
      targetTenantId: tenantId,
    });

    if (outcome.isFail()) {
      return Result.fail(outcome.errorOrThrow());
    }

    return Result.ok(undefined);
  }
}
