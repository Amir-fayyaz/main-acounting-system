import { DomainError } from '../../../../shared/errors/domain-error.js';
import { ErrorCategory } from '../../../../shared/errors/error-category.js';
import { Result } from '../../../../shared/errors/result.js';

export class SupplierPermissionDeniedError extends DomainError {
  public constructor(
    message = 'Insufficient permissions for this supplier operation.',
    requiredPermission?: string,
  ) {
    super('SUPPLIER_PERMISSION_DENIED', message, {
      category: ErrorCategory.BUSINESS_RULE,
      details: requiredPermission
        ? [
            {
              code: 'SUPPLIER_PERMISSION_DENIED',
              field: 'permission',
              message: `Missing required permission: ${requiredPermission}`,
            },
          ]
        : undefined,
    });
  }
}

export interface SupplierActorPrincipal {
  readonly userId?: string;
  readonly permissions?: readonly string[];
  readonly roles?: readonly string[];
}

export const SUPPLIER_MANAGE_PERMISSION = 'supplier.manage';
export const SUPPLIER_READ_PERMISSION = 'supplier.read';

export interface SupplierAuthorizationPort {
  authorizeWrite(
    tenantId: string,
    principal?: SupplierActorPrincipal,
  ): Promise<Result<void, DomainError>>;
  authorizeRead(
    tenantId: string,
    principal?: SupplierActorPrincipal,
  ): Promise<Result<void, DomainError>>;
}

export class AllowAllSupplierAuthorizationPort implements SupplierAuthorizationPort {
  public async authorizeWrite(): Promise<Result<void, DomainError>> {
    return Result.ok(undefined);
  }

  public async authorizeRead(): Promise<Result<void, DomainError>> {
    return Result.ok(undefined);
  }
}

export class RoleBasedSupplierAuthorizationPort implements SupplierAuthorizationPort {
  public async authorizeWrite(
    _tenantId: string,
    principal?: SupplierActorPrincipal,
  ): Promise<Result<void, DomainError>> {
    if (!hasPermission(principal, SUPPLIER_MANAGE_PERMISSION)) {
      return Result.fail(
        new SupplierPermissionDeniedError(
          'Insufficient permissions to manage suppliers.',
          SUPPLIER_MANAGE_PERMISSION,
        ),
      );
    }
    return Result.ok(undefined);
  }

  public async authorizeRead(
    _tenantId: string,
    principal?: SupplierActorPrincipal,
  ): Promise<Result<void, DomainError>> {
    if (
      !hasPermission(principal, SUPPLIER_READ_PERMISSION) &&
      !hasPermission(principal, SUPPLIER_MANAGE_PERMISSION)
    ) {
      return Result.fail(
        new SupplierPermissionDeniedError(
          'Insufficient permissions to view suppliers.',
          SUPPLIER_READ_PERMISSION,
        ),
      );
    }
    return Result.ok(undefined);
  }
}

function hasPermission(principal: SupplierActorPrincipal | undefined, permission: string): boolean {
  if (!principal) {
    return false;
  }
  if (principal.permissions?.includes(permission) || principal.permissions?.includes('*')) {
    return true;
  }
  return (
    principal.roles?.includes('admin') === true ||
    principal.roles?.includes('owner') === true ||
    principal.roles?.includes('accountant') === true
  );
}
