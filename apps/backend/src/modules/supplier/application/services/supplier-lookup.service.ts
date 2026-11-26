import type { DomainError } from '../../../../shared/errors/domain-error.js';
import { Result } from '../../../../shared/errors/result.js';
import {
  SupplierInactiveError,
  SupplierNotFoundError,
} from '../../domain/errors/supplier.errors.js';
import { isSupplierId, supplierIdFrom } from '../../domain/value-objects/supplier-id.js';
import type { SupplierLookupPort, SupplierLookupView } from '../ports/supplier-lookup.port.js';
import type { SupplierRepository } from '../ports/supplier-repository.port.js';

export class SupplierLookupService implements SupplierLookupPort {
  public constructor(private readonly repository: SupplierRepository) {}

  public async resolveActive(
    tenantId: string,
    supplierId: string,
  ): Promise<Result<SupplierLookupView, DomainError>> {
    if (!isSupplierId(supplierId)) {
      return Result.fail(new SupplierNotFoundError(supplierId));
    }

    const loaded = await this.repository.get(tenantId, supplierIdFrom(supplierId));
    if (loaded === undefined) {
      return Result.fail(new SupplierNotFoundError(supplierId));
    }

    const supplier = loaded.aggregate;
    if (!supplier.isActive()) {
      return Result.fail(new SupplierInactiveError(supplier.id.value));
    }

    return Result.ok({
      id: supplier.id.value,
      tenantId: supplier.tenantId,
      code: supplier.code.value,
      name: supplier.name.value,
      status: supplier.status.value,
    });
  }
}
