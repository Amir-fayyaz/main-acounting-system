import { Result } from '../../../../shared/errors/result.js';
import type { DomainError } from '../../../../shared/errors/domain-error.js';
import { fiscalYearIdFrom } from '../../domain/value-objects/fiscal-year-id.js';
import type { FiscalPeriodRepository } from '../../domain/repositories/fiscal-period.repository.js';
import { toFiscalPeriodView, type FiscalPeriodView } from '../views/fiscal-period.view.js';

export class ListFiscalPeriodsUseCase {
  public constructor(private readonly periodRepository: FiscalPeriodRepository) {}

  public async execute(yearId: string): Promise<Result<readonly FiscalPeriodView[], DomainError>> {
    const periods = await this.periodRepository.findByYear(fiscalYearIdFrom(yearId));
    return Result.ok(periods.map(toFiscalPeriodView));
  }
}
