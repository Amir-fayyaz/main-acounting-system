import type { FiscalYearEventRecorder } from '../../src/modules/accounting/application/ports/fiscal-year-event-recorder.port.js';
import {
  FiscalYear,
  type FiscalYearSnapshot,
} from '../../src/modules/accounting/domain/aggregates/fiscal-year.js';
import {
  FiscalYearLabelDuplicateError,
  FiscalYearOverlapError,
} from '../../src/modules/accounting/domain/errors/fiscal-year.errors.js';
import type { FiscalYearId } from '../../src/modules/accounting/domain/value-objects/fiscal-year-id.js';
import type { FiscalYearRepository } from '../../src/modules/accounting/domain/repositories/fiscal-year.repository.js';
import { FiscalYearLabel } from '../../src/modules/accounting/domain/value-objects/fiscal-year-label.js';
import { FiscalYearRange } from '../../src/modules/accounting/domain/value-objects/fiscal-year-range.js';
import type {
  TenantReference,
} from '../../src/modules/accounting/domain/value-objects/tenant-reference.js';
import type { DomainEvent } from '../../src/shared/messaging/domain-event.js';
import { staleRevisionConflict } from '../../src/shared/persistence/optimistic-concurrency.js';
import {
  PersistenceError,
  PersistenceFailureKind,
} from '../../src/shared/persistence/persistence-error.js';
import type { Loaded, WriteReceipt } from '../../src/shared/persistence/repository-ports.js';
import { Revision } from '../../src/shared/persistence/revision.js';
import { BusinessDate } from '../../src/shared/time/business-date.js';
import { DateTime } from '../../src/shared/time/date-time.js';

/**
 * Test doubles for the accounting module (FIS-002).
 *
 * They implement the module's own ports, never the Drizzle adapter, so the
 * application tests run without a database while still exercising the real use
 * cases and the real shared kernel. The repository double stores *snapshots*
 * and hands back rehydrated copies, exactly like the real adapter, so a test
 * cannot accidentally pass because it mutated a shared object.
 *
 * Like the tenant module's doubles, the in-memory repository does not enforce
 * the ambient tenant scope: that is the adapter's job, and it is proven in the
 * MySQL integration spec instead.
 */

/** In-memory `FiscalYearRepository` with the shared compare-and-swap semantics. */
export class InMemoryFiscalYearRepository implements FiscalYearRepository {
  private readonly records = new Map<string, { snapshot: FiscalYearSnapshot; revision: Revision }>();

  /** Counts mutations, so a test can prove nothing was written on a decline. */
  public addCalls = 0;
  public updateCalls = 0;

  /**
   * The next `add` fails with this error instead of storing — how a test
   * simulates the database refusing a write (an overlap race, a duplicate
   * label) without a database.
   */
  public nextAddFailure?: unknown;

  /** Seeds a year without going through `add` (for read/decline tests). */
  public seed(fiscalYear: FiscalYear, revision: Revision = Revision.initial()): void {
    this.records.set(fiscalYear.id.value, { snapshot: fiscalYear.snapshot(), revision });
  }

  /** The stored revision, to assert what actually landed. */
  public revisionOf(id: FiscalYearId): Revision | undefined {
    return this.records.get(id.value)?.revision;
  }

  /** The stored state, or `undefined`. */
  public stored(id: FiscalYearId): FiscalYear | undefined {
    const record = this.records.get(id.value);
    return record === undefined ? undefined : FiscalYear.rehydrate(record.snapshot);
  }

  public async get(id: FiscalYearId): Promise<Loaded<FiscalYear> | undefined> {
    const record = this.records.get(id.value);
    return record === undefined
      ? undefined
      : { aggregate: FiscalYear.rehydrate(record.snapshot), revision: record.revision };
  }

  public async findByTenant(tenantId: TenantReference): Promise<readonly Loaded<FiscalYear>[]> {
    return [...this.records.values()]
      .filter((record) => record.snapshot.tenantId === tenantId.value)
      .sort((a, b) => a.snapshot.startDate.localeCompare(b.snapshot.startDate))
      .map((record) => ({
        aggregate: FiscalYear.rehydrate(record.snapshot),
        revision: record.revision,
      }));
  }

  public async add(fiscalYear: FiscalYear): Promise<WriteReceipt> {
    this.addCalls += 1;

    if (this.nextAddFailure !== undefined) {
      const failure = this.nextAddFailure;
      this.nextAddFailure = undefined;
      throw failure;
    }
    if (this.records.has(fiscalYear.id.value)) {
      throw new PersistenceError(PersistenceFailureKind.CONFLICT, 'FiscalYearRepository.add');
    }

    this.records.set(fiscalYear.id.value, {
      snapshot: fiscalYear.snapshot(),
      revision: Revision.initial(),
    });
    return { revision: Revision.initial() };
  }

  public async update(fiscalYear: FiscalYear, expectedRevision: Revision): Promise<WriteReceipt> {
    this.updateCalls += 1;
    const record = this.records.get(fiscalYear.id.value);

    if (record === undefined || !record.revision.equals(expectedRevision)) {
      throw staleRevisionConflict('FiscalYearRepository.update', expectedRevision);
    }

    const next = expectedRevision.next();
    this.records.set(fiscalYear.id.value, { snapshot: fiscalYear.snapshot(), revision: next });
    return { revision: next };
  }
}

/** Records every domain event a use case raises, in order. */
export class RecordingFiscalYearEvents implements FiscalYearEventRecorder {
  public readonly recorded: DomainEvent<unknown>[] = [];

  public async record(event: DomainEvent<unknown>): Promise<void> {
    this.recorded.push(event);
  }
}

/**
 * The persistence failures the adapter translates its two conflicts into: a
 * `CONFLICT` whose cause is the module's own domain error (design section
 * 6.5). Used to prove the use case maps the database's refusals to the same
 * codes the domain uses.
 */
export function databaseRefusedOverlap(): PersistenceError {
  return new PersistenceError(
    PersistenceFailureKind.CONFLICT,
    'FiscalYearRepository.add',
    { cause: new FiscalYearOverlapError() },
  );
}

export function databaseRefusedDuplicateLabel(): PersistenceError {
  return new PersistenceError(
    PersistenceFailureKind.CONFLICT,
    'FiscalYearRepository.add',
    { cause: new FiscalYearLabelDuplicateError() },
  );
}

/** Re-exported so application specs need one import for harness building. */
export { PassthroughTransactionBoundary } from './tenant-doubles.js';

/** A deterministic instant for tests that must not depend on the wall clock. */
export const FIXED_NOW = DateTime.parse('2026-10-03T08:00:00.000Z');

/** Builds a fiscal year for seeding, with a fixed tenant and a given range. */
export function aFiscalYear(
  tenantId: TenantReference,
  label = 'FY1405',
  startDate = '2026-03-21',
  endDate = '2027-03-20',
  now: DateTime = FIXED_NOW,
): FiscalYear {
  return FiscalYear.create({
    tenantId,
    label: FiscalYearLabel.from(label),
    range: FiscalYearRange.of(BusinessDate.parse(startDate), BusinessDate.parse(endDate)),
    now,
  });
}
