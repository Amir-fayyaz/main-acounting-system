import type { DomainError } from '../../../../shared/errors/domain-error.js';
import { Result } from '../../../../shared/errors/result.js';
import { TenantScope } from '../../../../shared/tenant/tenant-scope.js';
import { FiscalPeriodYearNotFoundError } from '../../domain/errors/fiscal-period.errors.js';
import type { FiscalYearRepository } from '../../domain/repositories/fiscal-year.repository.js';
import { tenantReferenceFrom } from '../../domain/value-objects/tenant-reference.js';
import type { GetFiscalYear } from '../queries/get-fiscal-year.query.js';
import { parseFiscalYearId } from '../services/fiscal-period-input.js';
import { toFiscalYearView } from '../views/fiscal-year.mapper.js';
import type { FiscalYearView } from '../views/fiscal-year.view.js';

/**
 * Reads one fiscal year (FIS-002; a thin read use case for the HTTP resource).
 *
 * A query: it changes nothing, opens no transaction and records no event. It is
 * still tenant-scoped — the year it may read belongs to the tenant of the
 * current scope, so another company's year is answered exactly like one that
 * does not exist (`FISCAL_YEAR_NOT_FOUND`, 404), never as a cross-tenant leak
 * (IAM-007; ADR-003 section 24).
 */
export class GetFiscalYearUseCase {
  public constructor(private readonly fiscalYears: FiscalYearRepository) {}

  public async execute(query: GetFiscalYear): Promise<Result<FiscalYearView, DomainError>> {
    const tenantId = tenantReferenceFrom(TenantScope.requireTenantId());

    const fiscalYearId = parseFiscalYearId(query.params.fiscalYearId);
    if (fiscalYearId.isFail()) {
      return Result.fail(fiscalYearId.errorOrThrow());
    }

    const loaded = await this.fiscalYears.get(fiscalYearId.valueOrThrow());
    if (loaded === undefined || loaded.aggregate.tenantId.value !== tenantId.value) {
      return Result.fail(new FiscalPeriodYearNotFoundError(query.params.fiscalYearId));
    }

    return Result.ok(toFiscalYearView(loaded));
  }
}
