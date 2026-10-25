import type { DomainError } from '../../../../shared/errors/domain-error.js';
import { Result } from '../../../../shared/errors/result.js';
import {
  PersistenceError,
  PersistenceFailureKind,
} from '../../../../shared/persistence/persistence-error.js';
import { BusinessDate } from '../../../../shared/time/business-date.js';
import { DateTime } from '../../../../shared/time/date-time.js';
import { tenantScopedMessageOptions } from '../../../../shared/tenant/tenant-message-options.js';
import { TenantScope } from '../../../../shared/tenant/tenant-scope.js';
import type { TransactionBoundary } from '../../../../shared/transaction/transaction-boundary.js';
import { FiscalPeriod } from '../../domain/aggregates/fiscal-period.js';
import {
  FiscalPeriodDuplicateError,
  FiscalPeriodYearNotFoundError,
} from '../../domain/errors/fiscal-period.errors.js';
import { ActivePeriodSelected, FiscalPeriodsGenerated } from '../../domain/events/fiscal-period.events.js';
import { FiscalPeriodGenerationPolicy } from '../../domain/policies/fiscal-period-generation.policy.js';
import type { ActivePeriodRepository } from '../../domain/repositories/active-period.repository.js';
import type { FiscalYearRepository } from '../../domain/repositories/fiscal-year.repository.js';
import type { FiscalPeriodRepository } from '../../domain/repositories/fiscal-period.repository.js';
import { FiscalYearRange } from '../../domain/value-objects/fiscal-year-range.js';
import { tenantReferenceFrom, type TenantReference } from '../../domain/value-objects/tenant-reference.js';
import type { GenerateFiscalPeriods } from '../commands/generate-fiscal-periods.command.js';
import type { FiscalPeriodEventRecorder } from '../ports/fiscal-period-event-recorder.port.js';
import { parseFiscalYearId } from '../services/fiscal-period-input.js';
import { toFiscalPeriodView } from '../views/fiscal-period.mapper.js';
import type { FiscalPeriodListView } from '../views/fiscal-period.view.js';

/**
 * Generates a fiscal year's twelve monthly periods (FIS-004).
 *
 * Creating a fiscal year is not usable until the year has the twelve months
 * the company books into, so the create-year use case calls this one inside
 * its own boundary (the call joins the open transaction; SHR-005). The use
 * case is deliberately small and explicit:
 *
 * 1. read the tenant scope — `TenantScope.require()` fails closed, so a
 *    tenant-scoped operation with no scope refuses to run (SHR-007). The
 *    domain receives the tenant id as an explicit input; it never reads the
 *    ambient scope;
 * 2. validate the input identity in business terms (bad input is an expected
 *    failure, returned as a `Result`, not thrown);
 * 3. inside the transaction boundary that also commits the state change:
 *    a. load the year — a missing one (another company's included) is
 *       `FISCAL_YEAR_NOT_FOUND`, never a cross-tenant leak (IAM-007);
 *    b. plan the twelve months through the **domain** generation policy, which
 *       refuses a year that does not span exactly one Jalali year and
 *       guarantees the plan is contiguous (`FISCAL_PERIOD_STRUCTURE`);
 *    c. **idempotent**: a year that already has periods gets no writes at all
 *       — running generation twice changes nothing (and a concurrent sibling
 *       that raced past the check is caught by the store's unique key and
 *       reported as `FISCAL_PERIOD_DUPLICATE`);
 *    d. persist the twelve periods, all inside one boundary: either the whole
 *       fiscal frame exists or nothing of it does;
 *    e. when the tenant has never selected a period, the first open period
 *       becomes the active one, so the rule *exactly one active period* holds
 *       from the moment the frame exists;
 *    f. record `FiscalPeriodsGenerated` (and `ActivePeriodSelected` when the
 *       pointer was seeded) in the outbox, so the events commit with the state
 *       change or not at all (SHR-006);
 * 4. return the periods as a view, in calendar order.
 */
export class GenerateFiscalPeriodsUseCase {
  public constructor(
    private readonly fiscalYears: FiscalYearRepository,
    private readonly periods: FiscalPeriodRepository,
    private readonly activePeriods: ActivePeriodRepository,
    private readonly events: FiscalPeriodEventRecorder,
    private readonly boundary: TransactionBoundary,
  ) {}

  public async execute(
    command: GenerateFiscalPeriods,
  ): Promise<Result<FiscalPeriodListView, DomainError>> {
    const tenantId = tenantReferenceFrom(TenantScope.requireTenantId());

    const fiscalYearId = parseFiscalYearId(command.payload.fiscalYearId);
    if (fiscalYearId.isFail()) {
      return Result.fail(fiscalYearId.errorOrThrow());
    }
    const yearId = fiscalYearId.valueOrThrow();

    return this.boundary.execute(async () => {
      // Another company's year — the ambient scope included it or not — is
      // refused as *not found*, never a cross-tenant leak (IAM-007).
      const loadedYear = await this.fiscalYears.get(yearId);
      if (
        loadedYear === undefined ||
        loadedYear.aggregate.tenantId.value !== tenantId.value
      ) {
        return Result.fail(new FiscalPeriodYearNotFoundError(command.payload.fiscalYearId));
      }

      const plan = FiscalPeriodGenerationPolicy.plan(loadedYear.aggregate.range);
      if (plan.isFail()) {
        return Result.fail(plan.errorOrThrow());
      }
      const { jalaliYear, periods: planned } = plan.valueOrThrow();

      // Idempotent: whatever already exists is the truth, and nothing is
      // written or rewritten on a replay.
      const existing = await this.periods.findByYear(yearId, tenantId);
      if (existing.length > 0) {
        return Result.ok({
          fiscalYearId: yearId.value,
          jalaliYear,
          periods: existing.map((loaded) => toFiscalPeriodView(loaded.aggregate)),
        });
      }

      const fiscalPeriods = planned.map((entry) =>
        FiscalPeriod.create({
          tenantId,
          fiscalYearId: yearId,
          jalaliYear,
          sequence: entry.sequence,
          range: FiscalYearRange.of(
            BusinessDate.parse(entry.startDate),
            BusinessDate.parse(entry.endDate),
          ),
          now: DateTime.now(),
        }),
      );

      for (const fiscalPeriod of fiscalPeriods) {
        await this.store(fiscalPeriod);
      }

      // Whether the active pointer was seeded during this run — the
      // `ActivePeriodSelected` event is only recorded when it was.
      const seededActive = await this.seedActivePeriod(tenantId, fiscalPeriods);

      await this.events.record(
        new FiscalPeriodsGenerated(
          {
            tenantId: tenantId.value,
            fiscalYearId: yearId.value,
            jalaliYear,
            periods: fiscalPeriods.map((fiscalPeriod) => ({
              fiscalPeriodId: fiscalPeriod.id.value,
              sequence: fiscalPeriod.sequence,
              startDate: fiscalPeriod.range.startDate.toIsoString(),
              endDate: fiscalPeriod.range.endDate.toIsoString(),
            })),
          },
          tenantScopedMessageOptions(),
        ),
      );

      if (seededActive) {
        const first = fiscalPeriods[0];
        if (first !== undefined) {
          await this.events.record(
            new ActivePeriodSelected(
              {
                tenantId: tenantId.value,
                fiscalPeriodId: first.id.value,
                fiscalYearId: yearId.value,
                sequence: first.sequence,
              },
              tenantScopedMessageOptions(),
            ),
          );
        }
      }

      return Result.ok({
        fiscalYearId: yearId.value,
        jalaliYear,
        periods: fiscalPeriods.map(toFiscalPeriodView),
      });
    });
  }

  /**
   * Stores one period, translating the store's duplicate refusal (the unique
   * key behind the idempotency rule) to the domain's own error. Any other
   * failure is technical and propagates untouched.
   */
  private async store(fiscalPeriod: FiscalPeriod): Promise<void> {
    try {
      await this.periods.add(fiscalPeriod);
    } catch (error) {
      if (isDuplicateConflict(error)) {
        throw new FiscalPeriodDuplicateError();
      }
      throw error;
    }
  }

  /**
   * Keeps the rule "exactly one active period" true from the moment the fiscal
   * frame exists: a tenant that never selected one has its first open period
   * activated, and that move is recorded like any other.
   */
  private async seedActivePeriod(
    tenantId: TenantReference,
    periods: readonly FiscalPeriod[],
  ): Promise<boolean> {
    const current = await this.activePeriods.periodIdFor(tenantId);
    if (current !== undefined) {
      return false;
    }

    const first = periods[0];
    if (first === undefined) {
      return false;
    }

    await this.activePeriods.activate(tenantId, first.id);
    return true;
  }
}

/**
 * Recognises the duplicate conflict the adapter reports for a period write —
 * the store's unique `(tenant, year, sequence)` refusal. Any other failure
 * stays technical and is rethrown: the boundary must never absorb a dead
 * database into a business answer.
 */
function isDuplicateConflict(error: unknown): boolean {
  return (
    error instanceof PersistenceError &&
    error.kind === PersistenceFailureKind.CONFLICT &&
    error.cause instanceof FiscalPeriodDuplicateError
  );
}

