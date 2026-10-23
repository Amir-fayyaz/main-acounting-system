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
import { FiscalYear } from '../../domain/aggregates/fiscal-year.js';
import {
  FiscalYearLabelDuplicateError,
  FiscalYearOverlapError,
} from '../../domain/errors/fiscal-year.errors.js';
import { FiscalYearCreated } from '../../domain/events/fiscal-year.events.js';
import type { FiscalYearRepository } from '../../domain/repositories/fiscal-year.repository.js';
import { tenantReferenceFrom } from '../../domain/value-objects/tenant-reference.js';
import type { CreateFiscalYear } from '../commands/create-fiscal-year.command.js';
import type { FiscalYearEventRecorder } from '../ports/fiscal-year-event-recorder.port.js';
import { parseFiscalYearLabel, parseFiscalYearRange } from '../services/fiscal-year-input.js';
import { toFiscalYearView } from '../views/fiscal-year.mapper.js';
import type { FiscalYearView } from '../views/fiscal-year.view.js';

/**
 * Creates a fiscal year — the annual frame a tenant's periods will live in
 * (FIS-002).
 *
 * The use case is deliberately small and explicit:
 *
 * 1. read the tenant scope — `TenantScope.require()` fails closed, so a
 *    tenant-scoped operation with no scope refuses to run (SHR-007). The
 *    domain receives the tenant id as an explicit input; it never reads the
 *    ambient scope;
 * 2. validate the input in business terms (bad input is an expected failure,
 *    returned as a `Result`, not thrown);
 * 3. inside **one** transaction boundary:
 *    a. load the tenant's existing years;
 *    b. refuse a duplicate label (`FISCAL_YEAR_LABEL_DUPLICATE`) before
 *       anything is built;
 *    c. create the aggregate, which consults the **domain** overlap policy
 *       against those years — an overlapping range cannot even be constructed
 *       (`FISCAL_YEAR_OVERLAP`);
 *    d. insert the row and record `FiscalYearCreated` in the outbox, so the
 *       event commits with the state change or not at all (SHR-005, SHR-006);
 * 4. return the created year as a view, carrying the revision the next update
 *    must state.
 *
 * Two conflicts have two sources: the in-memory checks above, and the
 * database's own defences — the overlap triggers and the unique key — which
 * catch a write that raced past the check. The adapter translates both into a
 * `PersistenceError(CONFLICT)` whose cause is the module's own domain error,
 * so the use case maps them to the *same* codes either way and no driver
 * vocabulary leaks upward (design section 6.5).
 */
export class CreateFiscalYearUseCase {
  public constructor(
    private readonly repository: FiscalYearRepository,
    private readonly events: FiscalYearEventRecorder,
    private readonly boundary: TransactionBoundary,
  ) {}

  public async execute(command: CreateFiscalYear): Promise<Result<FiscalYearView, DomainError>> {
    // Fail closed: no available tenant scope means no fiscal year work at all.
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

    // A failed `Result` returned from inside the boundary rolls it back, so a
    // decline after the load leaves no trace (SHR-005).
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
        // The overlap policy declined: an expected business outcome, returned
        // rather than thrown (SHR-002). Anything else is a bug and propagates.
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

/**
 * Recognises the two conflicts the adapter can report for a fiscal year
 * write — the database's own overlap refusal and the unique-key duplicate —
 * and hands back the module's domain error the adapter attached as the cause.
 *
 * Any other failure stays technical and is rethrown: the boundary must never
 * absorb a dead database or a refused shape into a business answer.
 */
function asFiscalYearConflict(error: unknown): DomainError | undefined {
  if (error instanceof PersistenceError && error.kind === PersistenceFailureKind.CONFLICT) {
    const cause = error.cause;
    if (cause instanceof FiscalYearOverlapError || cause instanceof FiscalYearLabelDuplicateError) {
      return cause;
    }
  }
  return undefined;
}
