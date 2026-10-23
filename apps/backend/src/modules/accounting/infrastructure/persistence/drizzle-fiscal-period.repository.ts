import { and, eq } from 'drizzle-orm';
import type { Database } from '../../../../infrastructure/database/database.module.js';
import { scopedDatabase } from '../../../../infrastructure/database/scoped-database.js';
import {
  assertTenantCriterion,
  assertTenantOwnership,
  tenantEq,
} from '../../../../infrastructure/database/tenant-scoped.js';
import type { EntityId } from '../../../../shared/id/entity-id.js';
import { staleRevisionConflict } from '../../../../shared/persistence/optimistic-concurrency.js';
import type { Loaded, WriteReceipt } from '../../../../shared/persistence/repository-ports.js';
import { Revision } from '../../../../shared/persistence/revision.js';
import { DateTime } from '../../../../shared/time/date-time.js';
import { FiscalPeriod } from '../../domain/aggregates/fiscal-period.js';
import type { FiscalPeriodRepository } from '../../domain/repositories/fiscal-period.repository.js';
import type { FiscalYearId } from '../../domain/value-objects/fiscal-year-id.js';
import type { TenantReference } from '../../domain/value-objects/tenant-reference.js';
import { fiscalPeriods } from './fiscal-period.schema.js';

type Row = typeof fiscalPeriods.$inferSelect;

export class DrizzleFiscalPeriodRepository implements FiscalPeriodRepository {
  public constructor(private readonly database: Database) {}

  public async get(id: EntityId): Promise<Loaded<FiscalPeriod> | undefined> {
    const rows = await scopedDatabase(this.database)
      .select()
      .from(fiscalPeriods)
      .where(and(eq(fiscalPeriods.id, id.value), tenantEq(fiscalPeriods.tenantId)))
      .limit(1);

    const row = rows[0];
    return row === undefined
      ? undefined
      : { aggregate: this.toAggregate(row), revision: Revision.of(row.revision) };
  }

  public async findByYear(fiscalYearId: FiscalYearId): Promise<readonly Loaded<FiscalPeriod>[]> {
    const rows = await scopedDatabase(this.database)
      .select()
      .from(fiscalPeriods)
      .where(
        and(eq(fiscalPeriods.fiscalYearId, fiscalYearId.value), tenantEq(fiscalPeriods.tenantId)),
      )
      .orderBy(fiscalPeriods.sequenceNumber);

    return rows.map((r) => ({ aggregate: this.toAggregate(r), revision: Revision.of(r.revision) }));
  }

  public async findActive(tenantId: TenantReference): Promise<Loaded<FiscalPeriod> | undefined> {
    assertTenantCriterion(tenantId.value, 'FiscalPeriodRepository.findActive');
    const rows = await scopedDatabase(this.database)
      .select()
      .from(fiscalPeriods)
      .where(and(eq(fiscalPeriods.tenantId, tenantId.value), eq(fiscalPeriods.isActive, true)))
      .limit(1);

    const row = rows[0];
    return row === undefined
      ? undefined
      : { aggregate: this.toAggregate(row), revision: Revision.of(row.revision) };
  }

  public async addMany(periods: readonly FiscalPeriod[]): Promise<void> {
    if (periods.length === 0) return;
    assertTenantOwnership(periods[0]!.tenantId.value, 'FiscalPeriodRepository.addMany');

    await scopedDatabase(this.database)
      .insert(fiscalPeriods)
      .values(
        periods.map((p) => ({
          id: p.id.value,
          tenantId: p.tenantId.value,
          fiscalYearId: p.fiscalYearId.value,
          sequenceNumber: p.sequenceNumber,
          label: p.label,
          startDate: p.startDate.toIsoString(),
          endDate: p.endDate.toIsoString(),
          status: p.status,
          isActive: p.isActive,
          reopenReason: p.reopenReason,
          revision: Revision.initial().value,
          createdAt: p.createdAt.toDate(),
          updatedAt: p.updatedAt.toDate(),
        })),
      );
  }

  public async update(period: FiscalPeriod, expectedRevision: Revision): Promise<WriteReceipt> {
    assertTenantOwnership(period.tenantId.value, 'FiscalPeriodRepository.update');

    const [header] = await scopedDatabase(this.database)
      .update(fiscalPeriods)
      .set({
        status: period.status,
        isActive: period.isActive,
        reopenReason: period.reopenReason,
        revision: expectedRevision.value + 1,
        updatedAt: period.updatedAt.toDate(),
      })
      .where(
        and(
          eq(fiscalPeriods.id, period.id.value),
          eq(fiscalPeriods.revision, expectedRevision.value),
          tenantEq(fiscalPeriods.tenantId),
        ),
      );

    if (header.affectedRows === 0) {
      throw staleRevisionConflict('FiscalPeriodRepository.update', expectedRevision);
    }

    return { revision: expectedRevision.next() };
  }

  public async setActive(periodId: EntityId, tenantId: TenantReference): Promise<void> {
    assertTenantOwnership(tenantId.value, 'FiscalPeriodRepository.setActive');
    const db = scopedDatabase(this.database);

    await db
      .update(fiscalPeriods)
      .set({ isActive: false, updatedAt: new Date() })
      .where(and(eq(fiscalPeriods.tenantId, tenantId.value), eq(fiscalPeriods.isActive, true)));

    await db
      .update(fiscalPeriods)
      .set({ isActive: true, updatedAt: new Date() })
      .where(and(eq(fiscalPeriods.id, periodId.value), eq(fiscalPeriods.tenantId, tenantId.value)));
  }

  private toAggregate(row: Row): FiscalPeriod {
    return FiscalPeriod.rehydrate({
      id: row.id,
      tenantId: row.tenantId,
      fiscalYearId: row.fiscalYearId,
      sequenceNumber: row.sequenceNumber,
      label: row.label,
      startDate: row.startDate,
      endDate: row.endDate,
      status: row.status,
      isActive: row.isActive,
      reopenReason: row.reopenReason ?? undefined,
      createdAt: DateTime.from(row.createdAt),
      updatedAt: DateTime.from(row.updatedAt),
    });
  }
}
