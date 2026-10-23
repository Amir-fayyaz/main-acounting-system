import type { DomainError } from '../../../../shared/errors/domain-error.js';
import { Result } from '../../../../shared/errors/result.js';
import {
  PersistenceError,
  PersistenceFailureKind,
} from '../../../../shared/persistence/persistence-error.js';
import type { WriteReceipt } from '../../../../shared/persistence/repository-ports.js';
import { DateTime } from '../../../../shared/time/date-time.js';
import { tenantScopedMessageOptions } from '../../../../shared/tenant/tenant-message-options.js';
import { TenantScope } from '../../../../shared/tenant/tenant-scope.js';
import type { TransactionBoundary } from '../../../../shared/transaction/transaction-boundary.js';
import {
  businessDateToJalali,
  jalaliMonthBounds,
} from '../../../../shared/time/jalali-calendar.js';
import { FiscalYear } from '../../domain/aggregates/fiscal-year.js';
import { FiscalPeriod } from '../../domain/aggregates/fiscal-period.js';
import {
  FiscalYearLabelDuplicateError,
  FiscalYearOverlapError,
} from '../../domain/errors/fiscal-year.errors.js';
import { FiscalYearCreated } from '../../domain/events/fiscal-year.events.js';
import type { FiscalYearRepository } from '../../domain/repositories/fiscal-year.repository.js';
import type { FiscalPeriodRepository } from '../../domain/repositories/fiscal-period.repository.js';
import { tenantReferenceFrom } from '../../domain/value-objects/tenant-reference.js';
import type { CreateFiscalYear } from '../commands/create-fiscal-year.command.js';
import type { FiscalYearEventRecorder } from '../ports/fiscal-year-event-recorder.port.js';
import { parseFiscalYearLabel, parseFiscalYearRange } from '../services/fiscal-year-input.js';
import { toFiscalYearView } from '../views/fiscal-year.mapper.js';
import type { FiscalYearView } from '../views/fiscal-year.view.js';

const JALALI_MONTH_NAMES = [
  'فروردین',
  'اردیبهشت',
  'خرداد',
  'تیر',
  'مرداد',
  'شهریور',
  'مهر',
  'آبان',
  'آذر',
  'دی',
  'بهمن',
  'اسفند',
] as const;

export class CreateFiscalYearUseCase {
  public constructor(
    private readonly repository: FiscalYearRepository,
    private readonly events: FiscalYearEventRecorder,
    private readonly boundary: TransactionBoundary,
    private readonly periodRepository?: FiscalPeriodRepository,
  ) {}

  public async execute(command: CreateFiscalYear): Promise<Result<FiscalYearView, DomainError>> {
    const tenantId = tenantReferenceFrom(TenantScope.requireTenantId());

    const label = parseFiscalYearLabel(command.payload.label);
    if (label.isFail()) {
      return Result.fail(label.errorOrThrow());
    }

    const range = parseFiscalYearRange(command.payload.startDate, command.payload.endDate);
    if (range.isFail()) {
      return Result.fail(range.errorOrThrow());
    }

    const fiscalYearLabel = label.valueOrThrow();
    const fiscalYearRange = range.valueOrThrow();

    return this.boundary.execute(async () => {
      const existing = await this.repository.findByTenant(tenantId);

      if (existing.some((year) => year.aggregate.label.equals(fiscalYearLabel))) {
        return Result.fail(new FiscalYearLabelDuplicateError());
      }

      let fiscalYear: FiscalYear;
      try {
        fiscalYear = FiscalYear.create(
          {
            tenantId,
            label: fiscalYearLabel,
            range: fiscalYearRange,
            now: DateTime.now(),
          },
          existing.map((year) => year.aggregate),
        );
      } catch (error) {
        if (error instanceof FiscalYearOverlapError) {
          return Result.fail(error);
        }
        throw error;
      }

      let receipt: WriteReceipt;
      try {
        receipt = await this.repository.add(fiscalYear);
      } catch (error) {
        const conflict = asFiscalYearConflict(error);
        if (conflict !== undefined) {
          return Result.fail(conflict);
        }
        throw error;
      }

      if (this.periodRepository !== undefined) {
        const now = DateTime.now();
        const startJalali = businessDateToJalali(fiscalYear.range.startDate);
        const jYear = startJalali.jYear;

        const currentActive = await this.periodRepository.findActive(tenantId);
        const shouldActivateFirst = currentActive === undefined;

        const periods: FiscalPeriod[] = [];
        for (let m = 1; m <= 12; m++) {
          const bounds = jalaliMonthBounds(jYear, m);
          periods.push(
            FiscalPeriod.create({
              tenantId,
              fiscalYearId: fiscalYear.id,
              sequenceNumber: m,
              label: JALALI_MONTH_NAMES[m - 1] ?? 'دوره ' + m,
              startDate: bounds.start,
              endDate: bounds.end,
              isActive: m === 1 && shouldActivateFirst,
              now,
            }),
          );
        }

        await this.periodRepository.addMany(periods);
      }

      await this.events.record(
        new FiscalYearCreated(
          {
            tenantId: fiscalYear.tenantId.value,
            fiscalYearId: fiscalYear.id.value,
            label: fiscalYear.label.value,
            startDate: fiscalYear.range.startDate.toIsoString(),
            endDate: fiscalYear.range.endDate.toIsoString(),
            status: fiscalYear.status.value,
          },
          tenantScopedMessageOptions(),
        ),
      );

      return Result.ok(toFiscalYearView({ aggregate: fiscalYear, revision: receipt.revision }));
    });
  }
}

function asFiscalYearConflict(error: unknown): DomainError | undefined {
  if (error instanceof PersistenceError && error.kind === PersistenceFailureKind.CONFLICT) {
    const cause = error.cause;
    if (cause instanceof FiscalYearOverlapError || cause instanceof FiscalYearLabelDuplicateError) {
      return cause;
    }
  }
  return undefined;
}
