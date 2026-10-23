import { Result } from '../../../../shared/errors/result.js';
import type { DomainError } from '../../../../shared/errors/domain-error.js';
import { TenantScope } from '../../../../shared/tenant/tenant-scope.js';
import { tenantReferenceFrom } from '../../domain/value-objects/tenant-reference.js';
import type { FiscalYearRepository } from '../../domain/repositories/fiscal-year.repository.js';
import { toFiscalYearView } from '../views/fiscal-year.mapper.js';
import type { FiscalYearView } from '../views/fiscal-year.view.js';

export class ListFiscalYearsUseCase {
  public constructor(private readonly repository: FiscalYearRepository) {}

  public async execute(): Promise<Result<readonly FiscalYearView[], DomainError>> {
    const tenantId = tenantReferenceFrom(TenantScope.requireTenantId());
    const years = await this.repository.findByTenant(tenantId);
    return Result.ok(years.map(toFiscalYearView));
  }
}
