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
import { BusinessDate } from '../../src/shared/time/business-date.js';

export const FIXED_PERIOD_NOW = DateTime.parse('2026-10-03T08:00:00.000Z');

export class InMemoryFiscalPeriodRepository implements FiscalPeriodRepository {
  private readonly records = new Map<
    string,
    { snapshot: FiscalPeriodSnapshot; revision: Revision }
  >();

  public addCalls = 0;
  public updateCalls = 0;
  public nextAddFailure?: unknown;

  public seed(fiscalPeriod: FiscalPeriod, revision: Revision = Revision.initial()): void {
    this.records.set(fiscalPeriod.id.value, { snapshot: fiscalPeriod.snapshot(), revision });
  }

  public revisionOf(id: FiscalPeriodId): Revision | undefined {
    return this.records.get(id.value)?.revision;
  }

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

  public async findPeriodForDate(
    tenantId: TenantReference,
    date: BusinessDate,
    _options?: { readonly forShare?: boolean },
  ): Promise<Loaded<FiscalPeriod> | undefined> {
    const isoDate = date.toIsoString();
    const matching = [...this.records.values()].find(
      (record) =>
        record.snapshot.tenantId === tenantId.value &&
        record.snapshot.startDate <= isoDate &&
        record.snapshot.endDate >= isoDate,
    );
    return matching === undefined
      ? undefined
      : {
          aggregate: FiscalPeriod.rehydrate(matching.snapshot),
          revision: matching.revision,
        };
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

export class InMemoryActivePeriodRepository implements ActivePeriodRepository {
  private readonly pointers = new Map<string, FiscalPeriodId>();
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

  public pointerOf(tenantId: string): FiscalPeriodId | undefined {
    return this.pointers.get(tenantId);
  }
}

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

export { fiscalPeriodIdFrom };
