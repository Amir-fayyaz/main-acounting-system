import type { DomainError } from '../../../../shared/errors/domain-error.js';
import { Result } from '../../../../shared/errors/result.js';
import { tenantScopedMessageOptions } from '../../../../shared/tenant/tenant-message-options.js';
import { TenantScope } from '../../../../shared/tenant/tenant-scope.js';
import type { TransactionBoundary } from '../../../../shared/transaction/transaction-boundary.js';
import { ActivePeriodSelected } from '../../domain/events/fiscal-period.events.js';
import type { ActivePeriodRepository } from '../../domain/repositories/active-period.repository.js';
import type { FiscalPeriodRepository } from '../../domain/repositories/fiscal-period.repository.js';
import {
  FiscalPeriodNotFoundError,
  FiscalPeriodNotOpenError,
} from '../../domain/errors/fiscal-period.errors.js';
import { tenantReferenceFrom } from '../../domain/value-objects/tenant-reference.js';
import type { SelectActivePeriod } from '../commands/select-active-period.command.js';
import type { FiscalPeriodEventRecorder } from '../ports/fiscal-period-event-recorder.port.js';
import { parseFiscalPeriodId } from '../services/fiscal-period-input.js';
import { toFiscalPeriodView } from '../views/fiscal-period.mapper.js';
import type { FiscalPeriodView } from '../views/fiscal-period.view.js';

/**
 * Moves a tenant's active period (FIS-004).
 *
 * The company books into exactly one period at a time; selecting another one
 * is a pointer move that must be atomic and must never land on a closed
 * period. The use case is deliberately small and explicit:
 *
 * 1. read the tenant scope — `TenantScope.require()` fails closed, so a
 *    tenant-scoped operation with no scope refuses to run (SHR-007);
 * 2. validate the input identity in business terms (bad input is an expected
 *    failure, returned as a `Result`, not thrown);
 * 3. inside the boundary that commits the move with the event (SHR-005,
 *    SHR-006):
 *    a. load the period — a missing one (another company's included) is
 *       `FISCAL_PERIOD_NOT_FOUND`, never a cross-tenant leak (IAM-007);
 *    b. refuse a closed period with `FISCAL_PERIOD_NOT_OPEN`: only an open
 *       period may carry the active flag (the closing transition itself is
 *       FIS-005);
 *    c. switch the pointer in one atomic statement — two concurrent select
 *       requests still leave exactly one active period, because the pointer
 *       is a single per-tenant row;
 *    d. record `ActivePeriodSelected` in the outbox;
 * 4. return the now-active period as a view.
 */
export class SelectActivePeriodUseCase {
  public constructor(
    private readonly periods: FiscalPeriodRepository,
    private readonly activePeriods: ActivePeriodRepository,
    private readonly events: FiscalPeriodEventRecorder,
    private readonly boundary: TransactionBoundary,
  ) {}

  public async execute(
    command: SelectActivePeriod,
  ): Promise<Result<FiscalPeriodView, DomainError>> {
    const tenantId = tenantReferenceFrom(TenantScope.requireTenantId());

    const periodId = parseFiscalPeriodId(command.payload.periodId);
    if (periodId.isFail()) {
      return Result.fail(periodId.errorOrThrow());
    }

    return this.boundary.execute(async () => {
      // The adapter filters by the ambient tenant too, so a row of another
      // company is refused here as *not found* — never a cross-tenant leak
      // (IAM-007). The domain says so itself; it does not lean on the store.
      const loaded = await this.periods.get(periodId.valueOrThrow());
      if (
        loaded === undefined ||
        loaded.aggregate.tenantId.value !== tenantId.value
      ) {
        return Result.fail(new FiscalPeriodNotFoundError(command.payload.periodId));
      }

      const fiscalPeriod = loaded.aggregate;
      if (!fiscalPeriod.isOpen()) {
        return Result.fail(new FiscalPeriodNotOpenError());
      }

      // One statement: whichever period was active before stops being active
      // exactly when the new one becomes active, never in between.
      await this.activePeriods.activate(tenantId, fiscalPeriod.id);

      await this.events.record(
        new ActivePeriodSelected(
          {
            tenantId: tenantId.value,
            fiscalPeriodId: fiscalPeriod.id.value,
            fiscalYearId: fiscalPeriod.fiscalYearId.value,
            sequence: fiscalPeriod.sequence,
          },
          tenantScopedMessageOptions(),
        ),
      );

      return Result.ok(toFiscalPeriodView(fiscalPeriod));
    });
  }
}
