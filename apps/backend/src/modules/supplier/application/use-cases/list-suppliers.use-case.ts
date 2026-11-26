import type { DomainError } from '../../../../shared/errors/domain-error.js';
import { Result } from '../../../../shared/errors/result.js';
import { TenantScope } from '../../../../shared/tenant/tenant-scope.js';
import {
  AllowAllSupplierAuthorizationPort,
  type SupplierAuthorizationPort,
} from '../ports/supplier-authorization.port.js';
import type { SupplierRepository } from '../ports/supplier-repository.port.js';
import type { ListSuppliersQuery } from '../queries/supplier.queries.js';
import { toSupplierView, type PaginatedSuppliersView } from '../views/supplier.view.js';

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

export class ListSuppliersUseCase {
  public constructor(
    private readonly repository: SupplierRepository,
    private readonly authorization: SupplierAuthorizationPort = new AllowAllSupplierAuthorizationPort(),
  ) {}

  public async execute(
    query: ListSuppliersQuery,
  ): Promise<Result<PaginatedSuppliersView, DomainError>> {
    const tenantId = TenantScope.requireTenantId();

    const authOutcome = await this.authorization.authorizeRead(tenantId, query.payload.principal);
    if (authOutcome.isFail()) {
      return Result.fail(authOutcome.errorOrThrow());
    }

    const page = Math.max(1, Math.trunc(query.payload.page ?? DEFAULT_PAGE));
    const pageSize = Math.min(
      MAX_PAGE_SIZE,
      Math.max(1, Math.trunc(query.payload.pageSize ?? DEFAULT_PAGE_SIZE)),
    );
    const status =
      query.payload.status === undefined || query.payload.status === 'all'
        ? undefined
        : query.payload.status;

    const result = await this.repository.list({
      tenantId,
      status,
      page,
      pageSize,
    });

    return Result.ok({
      items: result.items.map((loaded) => toSupplierView(loaded.aggregate, loaded.revision.value)),
      total: result.total,
      page: result.page,
      pageSize: result.pageSize,
    });
  }
}
