import type { DomainError } from '../../../../shared/errors/domain-error.js';
import { Result } from '../../../../shared/errors/result.js';
import { TenantScope } from '../../../../shared/tenant/tenant-scope.js';
import type { FiscalYearRepository } from '../../domain/repositories/fiscal-year.repository.js';
import { tenantReferenceFrom } from '../../domain/value-objects/tenant-reference.js';
import type { ListFiscalYears } from '../queries/list-fiscal-years.query.js';
import { toFiscalYearView } from '../views/fiscal-year.mapper.js';
import type { FiscalYearView } from '../views/fiscal-year.view.js';

/**
 * Lists one tenant's fiscal years (FIS-002; a thin read use case for the HTTP
 * resource).
 *
 * A query: it changes nothing, opens no transaction and records no event. The
 * rows come from `findByTenant` under the ambient scope, so one company can
 * never enumerate another's years (IAM-007). Pagination is applied by the
 * presentation layer over the returned views (FND-006).
 */
export class ListFiscalYearsUseCase {
  public constructor(private readonly fiscalYears: FiscalYearRepository) {}

  public async execute(_query: ListFiscalYears): Promise<Result<readonly FiscalYearView[], DomainError>> {
    const tenantId = tenantReferenceFrom(TenantScope.requireTenantId());

    const loaded = await this.fiscalYears.findByTenant(tenantId);

    return Result.ok(loaded.map(toFiscalYearView));
  }
}
