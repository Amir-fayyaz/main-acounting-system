import { Result } from '../../../../shared/errors/result.js';
import type { DomainError } from '../../../../shared/errors/domain-error.js';
import { TenantScope } from '../../../../shared/tenant/tenant-scope.js';
import type { SupplierRepository } from '../../domain/repositories/supplier.repository.js';
import type { SearchSuppliersQuery } from '../queries/supplier.queries.js';
import { toSupplierView, type SupplierView } from '../views/supplier.view.js';

export class SearchSuppliersUseCase {
  public constructor(private readonly repository: SupplierRepository) {}

  public async execute(
    query: SearchSuppliersQuery,
  ): Promise<Result<readonly SupplierView[], DomainError>> {
    const tenantId = TenantScope.requireTenantId();

    const matches = await this.repository.search(
      tenantId,
      query.payload.query,
      query.payload.limit,
    );

    return Result.ok(matches.map((entry) => toSupplierView(entry.aggregate, entry.revision.value)));
  }
}
