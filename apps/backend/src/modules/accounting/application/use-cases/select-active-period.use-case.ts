import { Result } from '../../../../shared/errors/result.js';
import type { DomainError } from '../../../../shared/errors/domain-error.js';
import { EntityId } from '../../../../shared/id/entity-id.js';
import { TenantScope } from '../../../../shared/tenant/tenant-scope.js';
import { DateTime } from '../../../../shared/time/date-time.js';
import { tenantReferenceFrom } from '../../domain/value-objects/tenant-reference.js';
import {
  ClosedPeriodCannotBeActiveError,
  PeriodNotFoundError,
} from '../../domain/errors/fiscal-period.errors.js';
import type { FiscalPeriodRepository } from '../../domain/repositories/fiscal-period.repository.js';
import { toFiscalPeriodView, type FiscalPeriodView } from '../views/fiscal-period.view.js';

export class SelectActivePeriodUseCase {
  public constructor(private readonly periodRepository: FiscalPeriodRepository) {}

  public async execute(periodId: string): Promise<Result<FiscalPeriodView, DomainError>> {
    const tenantId = tenantReferenceFrom(TenantScope.requireTenantId());
    const id = EntityId.from(periodId);
    const loaded = await this.periodRepository.get(id);

    if (loaded === undefined) {
      return Result.fail(new PeriodNotFoundError());
    }

    if (loaded.aggregate.status === 'closed') {
      return Result.fail(new ClosedPeriodCannotBeActiveError());
    }

    await this.periodRepository.setActive(id, tenantId);
    loaded.aggregate.activate(DateTime.now());

    return Result.ok(toFiscalPeriodView(loaded));
  }
}
