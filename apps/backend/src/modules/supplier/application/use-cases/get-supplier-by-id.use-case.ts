import type { DomainError } from '../../../../shared/errors/domain-error.js';
import { Result } from '../../../../shared/errors/result.js';
import { TenantScope } from '../../../../shared/tenant/tenant-scope.js';
import { SupplierNotFoundError } from '../../domain/errors/supplier.errors.js';
import { isSupplierId, supplierIdFrom } from '../../domain/value-objects/supplier-id.js';
import {
  AllowAllSupplierAuthorizationPort,
  type SupplierAuthorizationPort,
} from '../ports/supplier-authorization.port.js';
import type { SupplierRepository } from '../ports/supplier-repository.port.js';
import type { GetSupplierByIdQuery } from '../queries/supplier.queries.js';
import { toSupplierView, type SupplierView } from '../views/supplier.view.js';

export class GetSupplierByIdUseCase {
  public constructor(
    private readonly repository: SupplierRepository,
    private readonly authorization: SupplierAuthorizationPort = new AllowAllSupplierAuthorizationPort(),
  ) {}

  public async execute(query: GetSupplierByIdQuery): Promise<Result<SupplierView, DomainError>> {
    const tenantId = TenantScope.requireTenantId();

    const authOutcome = await this.authorization.authorizeRead(tenantId, query.payload.principal);
    if (authOutcome.isFail()) {
      return Result.fail(authOutcome.errorOrThrow());
    }

    if (!isSupplierId(query.payload.id)) {
      return Result.fail(new SupplierNotFoundError(query.payload.id));
    }

    const loaded = await this.repository.get(tenantId, supplierIdFrom(query.payload.id));
    if (loaded === undefined) {
      return Result.fail(new SupplierNotFoundError(query.payload.id));
    }

    return Result.ok(toSupplierView(loaded.aggregate, loaded.revision.value));
  }
}
