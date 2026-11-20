import type { DomainError } from '../../../../shared/errors/domain-error.js';
import { Result } from '../../../../shared/errors/result.js';
import { TenantScope } from '../../../../shared/tenant/tenant-scope.js';
import { isSupplierId, supplierIdFrom } from '../../domain/value-objects/supplier-id.js';
import { SupplierNotFoundError } from '../../domain/errors/supplier.errors.js';
import type { SupplierRepository } from '../../domain/repositories/supplier.repository.js';
import type { GetSupplierByIdQuery } from '../queries/supplier.queries.js';
import { toSupplierView, type SupplierView } from '../views/supplier.view.js';

export class GetSupplierByIdUseCase {
  public constructor(private readonly repository: SupplierRepository) {}

  public async execute(query: GetSupplierByIdQuery): Promise<Result<SupplierView, DomainError>> {
    const tenantId = TenantScope.requireTenantId();

    if (!isSupplierId(query.payload.id)) {
      return Result.fail(new SupplierNotFoundError(query.payload.id));
    }

    const loaded = await this.repository.get(supplierIdFrom(query.payload.id));
    if (loaded === undefined || loaded.aggregate.tenantId !== tenantId) {
      return Result.fail(new SupplierNotFoundError(query.payload.id));
    }

    return Result.ok(toSupplierView(loaded.aggregate, loaded.revision.value));
  }
}
