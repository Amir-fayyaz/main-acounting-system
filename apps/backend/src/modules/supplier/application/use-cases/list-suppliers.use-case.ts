import { Result } from '../../../../shared/errors/result.js';
import type { DomainError } from '../../../../shared/errors/domain-error.js';
import { TenantScope } from '../../../../shared/tenant/tenant-scope.js';
import type { SupplierRepository } from '../../domain/repositories/supplier.repository.js';
import type { ListSuppliersQuery } from '../queries/supplier.queries.js';
import { toSupplierView, type SupplierPageView } from '../views/supplier.view.js';

export class ListSuppliersUseCase {
  public constructor(private readonly repository: SupplierRepository) {}

  public async execute(query: ListSuppliersQuery): Promise<Result<SupplierPageView, DomainError>> {
    const tenantId = TenantScope.requireTenantId();

    const pageResult = await this.repository.list(tenantId, {
      status: query.payload.status,
      page: query.payload.page,
      pageSize: query.payload.pageSize,
    });

    return Result.ok({
      items: pageResult.items.map((entry) => toSupplierView(entry.aggregate, entry.revision.value)),
      total: pageResult.total,
      page: pageResult.page,
      pageSize: pageResult.pageSize,
      totalPages: pageResult.totalPages,
    });
  }
}
