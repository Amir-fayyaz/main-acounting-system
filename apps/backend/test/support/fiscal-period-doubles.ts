import { FiscalPeriod } from '../../src/modules/accounting/domain/aggregates/fiscal-period.js';
import type { FiscalPeriodSnapshot } from '../../src/modules/accounting/domain/aggregates/fiscal-period.js';
import type { ActivePeriodRepository } from '../../src/modules/accounting/domain/repositories/active-period.repository.js';
import type { FiscalPeriodRepository } from '../../src/modules/accounting/domain/repositories/fiscal-period.repository.js';
import { FiscalPeriodDuplicateError } from '../../src/modules/accounting/domain/errors/fiscal-period.errors.js';
import {
  fiscalPeriodIdFrom,
  generateFiscalPeriodId,
  type FiscalPeriodId,
} from '../../src/modules/accounting/domain/value-objects/fiscal-period-id.js';
import type { FiscalYearId } from '../../src/modules/accounting/domain/value-objects/fiscal-year-id.js';
import type { TenantReference } from '../../src/modules/accounting/domain/value-objects/tenant-reference.js';
import { staleRevisionConflict } from '../../src/shared/persistence/optimistic-concurrency.js';
import {
  PersistenceError,
  PersistenceFailureKind,
} from '../../src/shared/persistence/persistence-error.js';
import { Revision } from '../../src/shared/persistence/revision.js';
import type { Loaded, WriteReceipt } from '../../src/shared/persistence/repository-ports.js';
import { DateTime } from '../../src/shared/time/date-time.js';

/**
 * Test doubles for the fiscal period ports (FIS-004).
 *
 * They implement the module's own ports, never the Drizzle adapter, so the
 * application tests run without a database while still exercising the real use
 * cases and the real shared kernel. Like the fiscal year double, the
 * repositories store snapshots and hand back rehydrated copies.
 *
 * The in-memory repositories do not enforce the ambient tenant scope: that is
 * the adapter's job, and it is proven in the MySQL integration spec instead.
 */

/** A deterministic instant for tests that must not depend on the wall clock. */
export const FIXED_PERIOD_NOW = DateTime.parse('2026-10-03T08:00:00.000Z');

/** In-memory `FiscalPeriodRepository` with compare-and-swap semantics. */
export class InMemoryFiscalPeriodRepository implements FiscalPeriodRepository {
  private readonly records = new Map<
    string,
    { snapshot: FiscalPeriodSnapshot; revision: Revision }
  >();

  /** Counts mutations, so a test can prove nothing was written on a decline. */
  public addCalls = 0;
  public updateCalls = 0;

  /**
   * The next `add` fails with this error instead of storing — how a test
   * simulates the database refusing a write (a duplicate month) without one.
   */
  public nextAddFailure?: unknown;

  /** Seeds a period without going through `add` (for read/decline tests). */
  public seed(fiscalPeriod: FiscalPeriod, revision: Revision = Revision.initial()): void {
    this.records.set(fiscalPeriod.id.value, { snapshot: fiscalPeriod.snapshot(), revision });
  }

  /** The stored revision, to assert what actually landed. */
  public revisionOf(id: FiscalPeriodId): Revision | undefined {
    return this.records.get(id.value)?.revision;
  }

  /** Every stored period of one tenant and year, in sequence order. */
  public storedBySequence(tenantId: TenantReference, fiscalYearId: FiscalYearId): FiscalPeriod[] {
    return [...this.records.values()]
      .filter(
        (record) =>
          record.snapshot.tenantId === tenantId.value &&
          record.snapshot.fiscalYearId === fiscalYearId.value,
      )
      .sort((a, b) => a.snapshot.sequence - b.snapshot.sequence)
      .map((record) => FiscalPeriod.rehydrate(record.snapshot));
  }

  public async get(id: FiscalPeriodId): Promise<Loaded<FiscalPeriod> | undefined> {
    const record = this.records.get(id.value);
    return record === undefined
      ? undefined
      : { aggregate: FiscalPeriod.rehydrate(record.snapshot), revision: record.revision };
  }

  public async findByYear(
    fiscalYearId: FiscalYearId,
    tenantId: TenantReference,
  ): Promise<readonly Loaded<FiscalPeriod>[]> {
    return this.storedBySequence(tenantId, fiscalYearId).map((aggregate) => ({
      aggregate,
      revision: this.records.get(aggregate.id.value)?.revision ?? Revision.initial(),
    }));
  }

  public async add(fiscalPeriod: FiscalPeriod): Promise<WriteReceipt> {
    this.addCalls += 1;

    if (this.nextAddFailure !== undefined) {
      const failure = this.nextAddFailure;
      this.nextAddFailure = undefined;
      throw failure;
    }
    if (this.records.has(fiscalPeriod.id.value)) {
      throw new PersistenceError(PersistenceFailureKind.CONFLICT, 'FiscalPeriodRepository.add');
    }
    const duplicate = [...this.records.values()].some(
      (record) =>
        record.snapshot.tenantId === fiscalPeriod.tenantId.value &&
        record.snapshot.fiscalYearId === fiscalPeriod.fiscalYearId.value &&
        record.snapshot.sequence === fiscalPeriod.sequence,
    );
    if (duplicate) {
      throw new PersistenceError(PersistenceFailureKind.CONFLICT, 'FiscalPeriodRepository.add', {
        cause: new FiscalPeriodDuplicateError(),
      });
    }

    this.records.set(fiscalPeriod.id.value, {
      snapshot: fiscalPeriod.snapshot(),
      revision: Revision.initial(),
    });
    return { revision: Revision.initial() };
  }

  public async update(
    fiscalPeriod: FiscalPeriod,
    expectedRevision: Revision,
  ): Promise<WriteReceipt> {
    this.updateCalls += 1;
    const record = this.records.get(fiscalPeriod.id.value);

    if (record === undefined || !record.revision.equals(expectedRevision)) {
      throw staleRevisionConflict('FiscalPeriodRepository.update', expectedRevision);
    }

    const next = expectedRevision.next();
    this.records.set(fiscalPeriod.id.value, { snapshot: fiscalPeriod.snapshot(), revision: next });
    return { revision: next };
  }
}

/**
 * In-memory `ActivePeriodRepository`: one pointer row per tenant, `activate`
 * executed in one synchronous step — the shape that makes the atomicity
 * property provable without a database while staying honest about sequencing.
 */
export class InMemoryActivePeriodRepository implements ActivePeriodRepository {
  private readonly pointers = new Map<string, FiscalPeriodId>();

  /**
   * Holds every `activate` call until cleared: each overlapping call awaits it
   * before writing, so a test can arrange two selections racing first.
   */
  public barrier?: { promise: Promise<void>; release(): void };

  public async periodIdFor(tenantId: TenantReference): Promise<FiscalPeriodId | undefined> {
    return this.pointers.get(tenantId.value);
  }

  public async activate(tenantId: TenantReference, periodId: FiscalPeriodId): Promise<void> {
    if (this.barrier !== undefined) {
      await this.barrier.promise;
    }
    this.pointers.set(tenantId.value, periodId);
  }

  /** The pointer of a tenant, read without a scope (test-only view). */
  public pointerOf(tenantId: string): FiscalPeriodId | undefined {
    return this.pointers.get(tenantId);
  }
}

/**
 * Builds a fiscal period for seeding, bypassing the generation policy — with
 * an optional closed state, the only shape the business rules and use cases
 * need in tests.
 */
export function aFiscalPeriod(input: {
  readonly tenantId: TenantReference;
  readonly fiscalYearId: FiscalYearId;
  readonly jalaliYear: number;
  readonly sequence: number;
  readonly startDate: string;
  readonly endDate: string;
  readonly state?: 'open' | 'closed';
  readonly id?: string;
}): FiscalPeriod {
  const snapshot: FiscalPeriodSnapshot = {
    id: input.id ?? generateFiscalPeriodId().value,
    tenantId: input.tenantId.value,
    fiscalYearId: input.fiscalYearId.value,
    jalaliYear: input.jalaliYear,
    sequence: input.sequence,
    startDate: input.startDate,
    endDate: input.endDate,
    state: input.state ?? 'open',
    createdAt: FIXED_PERIOD_NOW,
    updatedAt: FIXED_PERIOD_NOW,
  };
  return FiscalPeriod.rehydrate(snapshot);
}

/** Re-exported so application specs need one import for identity wrapping. */
export { fiscalPeriodIdFrom };
