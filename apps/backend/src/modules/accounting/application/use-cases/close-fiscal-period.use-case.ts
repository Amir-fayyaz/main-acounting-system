import type { DomainError } from '../../../../shared/errors/domain-error.js';
import { Result } from '../../../../shared/errors/result.js';
import { tenantScopedMessageOptions } from '../../../../shared/tenant/tenant-message-options.js';
import { TenantScope } from '../../../../shared/tenant/tenant-scope.js';
import type { TransactionBoundary } from '../../../../shared/transaction/transaction-boundary.js';
import { DateTime } from '../../../../shared/time/date-time.js';
import { PermissionKey } from '../../../identity/domain/value-objects/permission-key.js';
import type { Authorization } from '../../../identity/application/ports/authorization.port.js';
import type { AuditRecorder } from '../../../audit/application/ports/audit-recorder.port.js';
import { FiscalPeriodClosed } from '../../domain/events/fiscal-period.events.js';
import type { ActivePeriodRepository } from '../../domain/repositories/active-period.repository.js';
import type { FiscalPeriodRepository } from '../../domain/repositories/fiscal-period.repository.js';
import {
  FiscalPeriodNotFoundError,
  PeriodStateInvalidError,
} from '../../domain/errors/fiscal-period.errors.js';
import { tenantReferenceFrom } from '../../domain/value-objects/tenant-reference.js';
import type { CloseFiscalPeriod } from '../commands/close-fiscal-period.command.js';
import type { FiscalPeriodEventRecorder } from '../ports/fiscal-period-event-recorder.port.js';
import { parseFiscalPeriodId } from '../services/fiscal-period-input.js';
import { toFiscalPeriodView } from '../views/fiscal-period.mapper.js';
import type { FiscalPeriodView } from '../views/fiscal-period.view.js';

export class CloseFiscalPeriodUseCase {
  public constructor(
    private readonly periods: FiscalPeriodRepository,
    private readonly activePeriods: ActivePeriodRepository,
    private readonly events: FiscalPeriodEventRecorder,
    private readonly audit: AuditRecorder,
    private readonly authorization: Authorization,
    private readonly boundary: TransactionBoundary,
  ) {}

  public async execute(command: CloseFiscalPeriod): Promise<Result<FiscalPeriodView, DomainError>> {
    const tenantId = tenantReferenceFrom(TenantScope.requireTenantId());
    const { periodId: rawPeriodId, principal } = command.payload;

    const periodId = parseFiscalPeriodId(rawPeriodId);
    if (periodId.isFail()) {
      return Result.fail(periodId.errorOrThrow());
    }

    const authOutcome = await this.authorization.authorize({
      principal,
      requiredPermission: PermissionKey.from('accounting.period.manage'),
      targetTenantId: tenantId.value,
    });

    if (authOutcome.isFail()) {
      await this.audit.record({
        action: 'accounting.period.close',
        outcome: 'denied',
        actorUserId: principal.userId,
        target: { type: 'fiscal_period', id: rawPeriodId },
      });
      return Result.fail(authOutcome.errorOrThrow());
    }

    return this.boundary.execute(async () => {
      const loaded = await this.periods.get(periodId.valueOrThrow());
      if (loaded === undefined || loaded.aggregate.tenantId.value !== tenantId.value) {
        return Result.fail(new FiscalPeriodNotFoundError(rawPeriodId));
      }

      const fiscalPeriod = loaded.aggregate;

      if (fiscalPeriod.state.isClosed()) {
        return Result.fail(new PeriodStateInvalidError('The fiscal period is already closed.'));
      }

      const activeId = await this.activePeriods.periodIdFor(tenantId);
      if (activeId !== undefined && activeId.value === fiscalPeriod.id.value) {
        return Result.fail(
          new PeriodStateInvalidError(
            'The active period cannot be closed while active. Select another open period first.',
          ),
        );
      }

      const now = DateTime.now();
      fiscalPeriod.close(now);

      await this.periods.update(fiscalPeriod, loaded.revision);

      await this.events.record(
        new FiscalPeriodClosed(
          {
            tenantId: tenantId.value,
            fiscalPeriodId: fiscalPeriod.id.value,
            fiscalYearId: fiscalPeriod.fiscalYearId.value,
            sequence: fiscalPeriod.sequence,
            closedByUserId: principal.userId,
          },
          tenantScopedMessageOptions(),
        ),
      );

      await this.audit.record({
        action: 'accounting.period.close',
        outcome: 'success',
        actorUserId: principal.userId,
        target: { type: 'fiscal_period', id: fiscalPeriod.id.value },
        metadata: {
          fiscalYearId: fiscalPeriod.fiscalYearId.value,
          sequence: fiscalPeriod.sequence,
        },
      });

      return Result.ok(toFiscalPeriodView(fiscalPeriod));
    });
  }
}
