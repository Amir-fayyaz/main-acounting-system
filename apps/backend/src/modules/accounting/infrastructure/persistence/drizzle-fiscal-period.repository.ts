import { and, asc, eq } from 'drizzle-orm';

import type { Database } from '../../../../infrastructure/database/database.module.js';
import { scopedDatabase } from '../../../../infrastructure/database/scoped-database.js';
import {
  assertTenantCriterion,
  assertTenantOwnership,
  tenantEq,
} from '../../../../infrastructure/database/tenant-scoped.js';
import { staleRevisionConflict } from '../../../../shared/persistence/optimistic-concurrency.js';
import {
  PersistenceError,
  PersistenceFailureKind,
} from '../../../../shared/persistence/persistence-error.js';
import type { Loaded, WriteReceipt } from '../../../../shared/persistence/repository-ports.js';
import { Revision } from '../../../../shared/persistence/revision.js';
import { BusinessDate } from '../../../../shared/time/business-date.js';
import { DateTime } from '../../../../shared/time/date-time.js';
import { FiscalPeriod } from '../../domain/aggregates/fiscal-period.js';
import { FiscalPeriodDuplicateError } from '../../domain/errors/fiscal-period.errors.js';
import type { FiscalPeriodRepository } from '../../domain/repositories/fiscal-period.repository.js';
import type { FiscalYearId } from '../../domain/value-objects/fiscal-year-id.js';
import type { FiscalPeriodId } from '../../domain/value-objects/fiscal-period-id.js';
import type { TenantReference } from '../../domain/value-objects/tenant-reference.js';
import { fiscalPeriods } from './fiscal-period.schema.js';

type FiscalPeriodRow = typeof fiscalPeriods.$inferSelect;

/**
 * Drizzle/MySQL implementation of the fiscal period persistence port (FIS-004;
 * SHR-004, SHR-008; IAM-007).
 *
 * The same three properties that make the fiscal year adapter correct make
 * this one correct:
 *
 * - **Every statement goes through `scopedDatabase`** — inside a use case's
 *   transaction the write joins that boundary and commits with it; outside one
 *   it is a single autocommitted statement (SHR-005).
 * - **The tenant boundary is enforced here, not only in the application** —
 *   reads filter by the ambient scope and refuse a foreign criterion; writes
 *   re-check ownership immediately before the statement (IAM-007).
 * - **Driver vocabulary stops here** — the store's unique
 *   `(tenant_id, fiscal_year_id, sequence)` key, the storage half of the
 *   idempotency rule, surfaces as `ER_DUP_ENTRY` and is translated into a
 *   `PersistenceError(CONFLICT)` whose cause is the module's own
 *   `FiscalPeriodDuplicateError` (design section 6.5).
 */
export class DrizzleFiscalPeriodRepository implements FiscalPeriodRepository {
  public constructor(private readonly database: Database) {}

  public async get(id: FiscalPeriodId): Promise<Loaded<FiscalPeriod> | undefined> {
    // Scoped by the ambient tenant as well as the identity: another tenant's
    // period is simply not there to be read (IAM-007).
    const rows = await scopedDatabase(this.database)
      .select()
      .from(fiscalPeriods)
      .where(and(eq(fiscalPeriods.id, id.value), tenantEq(fiscalPeriods.tenantId)))
      .limit(1);

    const row = rows[0];
    return row === undefined
      ? undefined
      : { aggregate: toFiscalPeriod(row), revision: Revision.of(row.revision) };
  }

  public async findByYear(
    fiscalYearId: FiscalYearId,
    tenantId: TenantReference,
  ): Promise<readonly Loaded<FiscalPeriod>[]> {
    // The criterion must be the active tenant: a caller cannot widen the read
    // to another company, and with no scope at all it fails closed.
    assertTenantCriterion(tenantId.value, 'FiscalPeriodRepository.findByYear');

    const rows = await scopedDatabase(this.database)
      .select()
      .from(fiscalPeriods)
      .where(
        and(
          eq(fiscalPeriods.tenantId, tenantId.value),
          eq(fiscalPeriods.fiscalYearId, fiscalYearId.value),
        ),
      )
      .orderBy(asc(fiscalPeriods.sequence));

    return rows.map((row) => ({
      aggregate: toFiscalPeriod(row),
      revision: Revision.of(row.revision),
    }));
  }

  public async add(fiscalPeriod: FiscalPeriod): Promise<WriteReceipt> {
    assertTenantOwnership(fiscalPeriod.tenantId.value, 'FiscalPeriodRepository.add');

    try {
      await scopedDatabase(this.database)
        .insert(fiscalPeriods)
        .values({
          id: fiscalPeriod.id.value,
          tenantId: fiscalPeriod.tenantId.value,
          fiscalYearId: fiscalPeriod.fiscalYearId.value,
          jalaliYear: fiscalPeriod.jalaliYear,
          sequence: fiscalPeriod.sequence,
          startDate: fiscalPeriod.range.startDate.toIsoString(),
          endDate: fiscalPeriod.range.endDate.toIsoString(),
          state: fiscalPeriod.state.value,
          revision: Revision.initial().value,
          createdAt: fiscalPeriod.createdAt.toDate(),
          updatedAt: fiscalPeriod.updatedAt.toDate(),
        });
    } catch (error) {
      throw translateWriteFailure(error, 'FiscalPeriodRepository.add') ?? error;
    }

    return { revision: Revision.initial() };
  }

  public async update(
    fiscalPeriod: FiscalPeriod,
    expectedRevision: Revision,
  ): Promise<WriteReceipt> {
    assertTenantOwnership(fiscalPeriod.tenantId.value, 'FiscalPeriodRepository.update');

    let header;
    try {
      [header] = await scopedDatabase(this.database)
        .update(fiscalPeriods)
        .set({
          state: fiscalPeriod.state.value,
          revision: expectedRevision.value + 1,
          updatedAt: fiscalPeriod.updatedAt.toDate(),
        })
        .where(
          and(
            eq(fiscalPeriods.id, fiscalPeriod.id.value),
            eq(fiscalPeriods.revision, expectedRevision.value),
            tenantEq(fiscalPeriods.tenantId),
          ),
        );
    } catch (error) {
      throw translateWriteFailure(error, 'FiscalPeriodRepository.update') ?? error;
    }

    if (header.affectedRows === 0) {
      // The store answers "nothing matched" without naming what is stored
      // instead, so the cause stays honest about the unknown current revision.
      throw staleRevisionConflict('FiscalPeriodRepository.update', expectedRevision);
    }

    return { revision: expectedRevision.next() };
  }
}

/**
 * Translates the refusals the database can issue for a fiscal period write,
 * or returns `undefined` for anything this adapter cannot classify — which
 * then propagates untouched rather than being guessed at.
 *
 * - the year-sequence unique key (`ER_DUP_ENTRY`) → `CONFLICT`, caused by
 *   `FiscalPeriodDuplicateError` — the same idempotency rule the domain holds;
 * - the range `CHECK` (`ER_CHECK_CONSTRAINT_VIOLATED`) → `REJECTED`: the
 *   store refused the shape, nothing was applied.
 */
function translateWriteFailure(error: unknown, operation: string): PersistenceError | undefined {
  if (isDriverError(error, 'ER_DUP_ENTRY')) {
    return new PersistenceError(PersistenceFailureKind.CONFLICT, operation, {
      cause: new FiscalPeriodDuplicateError(),
    });
  }
  if (isDriverError(error, 'ER_CHECK_CONSTRAINT_VIOLATED')) {
    return new PersistenceError(PersistenceFailureKind.REJECTED, operation, { cause: error });
  }
  return undefined;
}

/** Whether `error` is a mysql2 failure the adapter recognises by code. */
function isDriverError(
  error: unknown,
  code: string,
): error is Error & { readonly code: string } {
  return (
    typeof error === 'object' &&
    error !== null &&
    (error as { readonly code?: unknown }).code === code
  );
}

/** Rebuilds the aggregate from a stored row, re-validating every value. */
function toFiscalPeriod(row: FiscalPeriodRow): FiscalPeriod {
  return FiscalPeriod.rehydrate({
    id: row.id,
    tenantId: row.tenantId,
    fiscalYearId: row.fiscalYearId,
    jalaliYear: row.jalaliYear,
    sequence: row.sequence,
    startDate: BusinessDate.parse(row.startDate).toIsoString(),
    endDate: BusinessDate.parse(row.endDate).toIsoString(),
    state: row.state,
    createdAt: DateTime.from(row.createdAt),
    updatedAt: DateTime.from(row.updatedAt),
  });
}
