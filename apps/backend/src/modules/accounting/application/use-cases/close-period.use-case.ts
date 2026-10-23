import { Result } from '../../../../shared/errors/result.js';
import type { DomainError } from '../../../../shared/errors/domain-error.js';
import { EntityId } from '../../../../shared/id/entity-id.js';
import { DateTime } from '../../../../shared/time/date-time.js';
import {
  PeriodNotFoundError,
  PeriodStateInvalidError,
} from '../../domain/errors/fiscal-period.errors.js';
import type { FiscalPeriodRepository } from '../../domain/repositories/fiscal-period.repository.js';
import { toFiscalPeriodView, type FiscalPeriodView } from '../views/fiscal-period.view.js';

export class ClosePeriodUseCase {
  public constructor(private readonly periodRepository: FiscalPeriodRepository) {}

  public async execute(periodId: string): Promise<Result<FiscalPeriodView, DomainError>> {
    const id = EntityId.from(periodId);
    const loaded = await this.periodRepository.get(id);

    if (loaded === undefined) {
      return Result.fail(new PeriodNotFoundError());
    }

    try {
      loaded.aggregate.close(DateTime.now());
    } catch (err) {
      if (err instanceof PeriodStateInvalidError) {
        return Result.fail(err);
      }
      throw err;
    }

    const receipt = await this.periodRepository.update(loaded.aggregate, loaded.revision);
    return Result.ok(
      toFiscalPeriodView({ aggregate: loaded.aggregate, revision: receipt.revision }),
    );
  }
}
