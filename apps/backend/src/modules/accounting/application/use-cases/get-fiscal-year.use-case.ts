import { Result } from '../../../../shared/errors/result.js';
import type { DomainError } from '../../../../shared/errors/domain-error.js';
import { fiscalYearIdFrom } from '../../domain/value-objects/fiscal-year-id.js';
import { FiscalYearNotFoundError } from '../../domain/errors/fiscal-period.errors.js';
import type { FiscalYearRepository } from '../../domain/repositories/fiscal-year.repository.js';
import { toFiscalYearView } from '../views/fiscal-year.mapper.js';
import type { FiscalYearView } from '../views/fiscal-year.view.js';

export class GetFiscalYearUseCase {
  public constructor(private readonly repository: FiscalYearRepository) {}

  public async execute(id: string): Promise<Result<FiscalYearView, DomainError>> {
    const year = await this.repository.get(fiscalYearIdFrom(id));
    if (year === undefined) {
      return Result.fail(new FiscalYearNotFoundError());
    }
    return Result.ok(toFiscalYearView(year));
  }
}
