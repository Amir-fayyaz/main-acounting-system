import type { DomainError } from '../../../../shared/errors/domain-error.js';
import { Result } from '../../../../shared/errors/result.js';
import type { SupplierRepository } from '../../domain/repositories/supplier.repository.js';
import {
  SupplierInactiveError,
  SupplierNotFoundError,
} from '../../domain/errors/supplier.errors.js';
import { isSupplierId, supplierIdFrom } from '../../domain/value-objects/supplier-id.js';
import type { SupplierLookup, SupplierLookupView } from '../ports/supplier-lookup.port.js';

export class DefaultSupplierLookup implements SupplierLookup {
  public constructor(private readonly repository: SupplierRepository) {}

  public async resolveActiveSupplier(
    tenantId: string,
    supplierId: string,
  ): Promise<Result<SupplierLookupView, DomainError>> {
    if (!isSupplierId(supplierId)) {
      return Result.fail(new SupplierNotFoundError(supplierId));
    }

    const loaded = await this.repository.get(supplierIdFrom(supplierId));
    if (loaded === undefined || loaded.aggregate.tenantId !== tenantId) {
      return Result.fail(new SupplierNotFoundError(supplierId));
    }

    const supplier = loaded.aggregate;
    if (!supplier.isActive()) {
      return Result.fail(new SupplierInactiveError(supplierId));
    }

    return Result.ok({
      id: supplier.id.value,
      code: supplier.code.value,
      name: supplier.name.value,
      status: 'active',
    });
  }
}
