import type { DomainError } from '../../../../shared/errors/domain-error.js';
import { Result } from '../../../../shared/errors/result.js';
import { TenantScope } from '../../../../shared/tenant/tenant-scope.js';
import {
  FiscalPeriodYearNotFoundError,
} from '../../domain/errors/fiscal-period.errors.js';
import type { FiscalPeriodRepository } from '../../domain/repositories/fiscal-period.repository.js';
import type { FiscalYearRepository } from '../../domain/repositories/fiscal-year.repository.js';
import { tenantReferenceFrom } from '../../domain/value-objects/tenant-reference.js';
import type { ListFiscalPeriods } from '../queries/list-fiscal-periods.query.js';
import { parseFiscalYearId } from '../services/fiscal-period-input.js';
import { toFiscalPeriodView } from '../views/fiscal-period.mapper.js';
import type { FiscalPeriodView } from '../views/fiscal-period.view.js';

/**
 * Lists one fiscal year's periods (FIS-004; a thin read use case for the HTTP
 * resource).
 *
 * A query: it changes nothing, opens no transaction and records no event. The
 * year is checked first — a year of another company answers
 * `FISCAL_YEAR_NOT_FOUND` (404) exactly like one that does not exist, so the
 * list itself cannot confirm a foreign year (IAM-007). Pagination is applied
 * by the presentation layer over the returned views (FND-006).
 */
export class ListFiscalPeriodsUseCase {
  public constructor(
    private readonly fiscalYears: FiscalYearRepository,
    private readonly periods: FiscalPeriodRepository,
  ) {}

  public async execute(
    query: ListFiscalPeriods,
  ): Promise<Result<readonly FiscalPeriodView[], DomainError>> {
    const tenantId = tenantReferenceFrom(TenantScope.requireTenantId());

    const fiscalYearId = parseFiscalYearId(query.params.fiscalYearId);
    if (fiscalYearId.isFail()) {
      return Result.fail(fiscalYearId.errorOrThrow());
    }

    const year = await this.fiscalYears.get(fiscalYearId.valueOrThrow());
    if (year === undefined || year.aggregate.tenantId.value !== tenantId.value) {
      return Result.fail(new FiscalPeriodYearNotFoundError(query.params.fiscalYearId));
    }

    const loaded = await this.periods.findByYear(fiscalYearId.valueOrThrow(), tenantId);

    return Result.ok(loaded.map((entry) => toFiscalPeriodView(entry.aggregate)));
  }
}
