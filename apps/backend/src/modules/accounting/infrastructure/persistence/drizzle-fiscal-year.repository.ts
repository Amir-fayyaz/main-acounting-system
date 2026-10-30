import { and, eq } from 'drizzle-orm';

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
import { FiscalYear } from '../../domain/aggregates/fiscal-year.js';
import {
  FiscalYearLabelDuplicateError,
  FiscalYearOverlapError,
} from '../../domain/errors/fiscal-year.errors.js';
import type { FiscalYearRepository } from '../../domain/repositories/fiscal-year.repository.js';
import type { FiscalYearId } from '../../domain/value-objects/fiscal-year-id.js';
import type { TenantReference } from '../../domain/value-objects/tenant-reference.js';
import { fiscalYears } from './fiscal-year.schema.js';

type FiscalYearRow = typeof fiscalYears.$inferSelect;

/**
 * Drizzle/MySQL implementation of the fiscal year persistence port (FIS-002;
 * SHR-004, SHR-008; IAM-007).
 *
 * Three properties make this adapter correct rather than merely convenient:
 *
 * - **Every statement goes through `scopedDatabase`.** Inside a use case's
 *   transaction the write joins that boundary and commits with it; outside one
 *   it is a single autocommitted statement. The adapter never opens a
 *   transaction of its own (SHR-005).
 * - **The tenant boundary is enforced here, not only in the application.**
 *   Reads filter by the ambient scope and refuse a foreign criterion; writes
 *   re-check ownership immediately before the statement, so one company can
 *   never read or store another's years (IAM-007).
 * - **Driver vocabulary stops here.** The database defends itself with two
 *   rules the domain also holds — the overlap triggers and the label unique
 *   key. Both surface as MySQL errors this adapter translates into a
 *   `PersistenceError(CONFLICT)` whose *cause* is the module's own domain
 *   error, so the use case maps them to `FISCAL_YEAR_OVERLAP` /
 *   `FISCAL_YEAR_LABEL_DUPLICATE` whichever path noticed first, and no SQL
 *   state or message text leaks past this file (design section 6.5).
 */
export class DrizzleFiscalYearRepository implements FiscalYearRepository {
  public constructor(private readonly database: Database) {}

  public async get(id: FiscalYearId): Promise<Loaded<FiscalYear> | undefined> {
    // Scoped by the ambient tenant as well as the identity: another tenant's
    // year is simply not there to be read (IAM-007).
    const rows = await scopedDatabase(this.database)
      .select()
      .from(fiscalYears)
      .where(and(eq(fiscalYears.id, id.value), tenantEq(fiscalYears.tenantId)))
      .limit(1);

    const row = rows[0];
    return row === undefined
      ? undefined
      : { aggregate: toFiscalYear(row), revision: Revision.of(row.revision) };
  }

  public async findByTenant(tenantId: TenantReference): Promise<readonly Loaded<FiscalYear>[]> {
    // The criterion must be the active tenant: a caller cannot widen the read
    // to another company, and with no scope at all it fails closed.
    assertTenantCriterion(tenantId.value, 'FiscalYearRepository.findByTenant');

    const rows = await scopedDatabase(this.database)
      .select()
      .from(fiscalYears)
      .where(eq(fiscalYears.tenantId, tenantId.value))
      .orderBy(fiscalYears.startDate);

    return rows.map((row) => ({
      aggregate: toFiscalYear(row),
      revision: Revision.of(row.revision),
    }));
  }

  public async add(fiscalYear: FiscalYear): Promise<WriteReceipt> {
    assertTenantOwnership(fiscalYear.tenantId.value, 'FiscalYearRepository.add');

    try {
      await scopedDatabase(this.database).insert(fiscalYears).values({
        id: fiscalYear.id.value,
        tenantId: fiscalYear.tenantId.value,
        label: fiscalYear.label.value,
        startDate: fiscalYear.range.startDate.toIsoString(),
        endDate: fiscalYear.range.endDate.toIsoString(),
        status: fiscalYear.status.value,
        revision: Revision.initial().value,
        createdAt: fiscalYear.createdAt.toDate(),
        updatedAt: fiscalYear.updatedAt.toDate(),
      });
    } catch (error) {
      throw translateWriteFailure(error, 'FiscalYearRepository.add') ?? error;
    }

    return { revision: Revision.initial() };
  }

  public async update(fiscalYear: FiscalYear, expectedRevision: Revision): Promise<WriteReceipt> {
    assertTenantOwnership(fiscalYear.tenantId.value, 'FiscalYearRepository.update');

    let header;
    try {
      [header] = await scopedDatabase(this.database)
        .update(fiscalYears)
        .set({
          label: fiscalYear.label.value,
          startDate: fiscalYear.range.startDate.toIsoString(),
          endDate: fiscalYear.range.endDate.toIsoString(),
          status: fiscalYear.status.value,
          revision: expectedRevision.value + 1,
          updatedAt: fiscalYear.updatedAt.toDate(),
        })
        .where(
          and(
            eq(fiscalYears.id, fiscalYear.id.value),
            eq(fiscalYears.revision, expectedRevision.value),
            tenantEq(fiscalYears.tenantId),
          ),
        );
    } catch (error) {
      throw translateWriteFailure(error, 'FiscalYearRepository.update') ?? error;
    }

    if (header.affectedRows === 0) {
      // The store answers "nothing matched" without naming what is stored
      // instead, so the cause stays honest about the unknown current revision.
      throw staleRevisionConflict('FiscalYearRepository.update', expectedRevision);
    }

    return { revision: expectedRevision.next() };
  }
}

/**
 * Translates the three refusals the database can issue for a fiscal year
 * write, or returns `undefined` for anything this adapter cannot classify —
 * which then propagates untouched rather than being guessed at.
 *
 * - the overlap trigger (`ER_SIGNAL_EXCEPTION`, `MESSAGE_TEXT =
 *   'FISCAL_YEAR_OVERLAP'`) → `CONFLICT`, caused by `FiscalYearOverlapError`;
 * - the label unique key (`ER_DUP_ENTRY`) → `CONFLICT`, caused by
 *   `FiscalYearLabelDuplicateError`;
 * - the range `CHECK` (`ER_CHECK_CONSTRAINT_VIOLATED`) → `REJECTED`: the
 *   store refused the shape, nothing was applied. The domain refuses such a
 *   range before storage is involved, so this is a defence against a bypassed
 *   write rather than a path the use case expects.
 */
function translateWriteFailure(error: unknown, operation: string): PersistenceError | undefined {
  if (isDriverError(error, 'ER_SIGNAL_EXCEPTION') && /FISCAL_YEAR_OVERLAP/.test(error.message)) {
    return new PersistenceError(PersistenceFailureKind.CONFLICT, operation, {
      cause: new FiscalYearOverlapError(),
    });
  }
  if (isDriverError(error, 'ER_DUP_ENTRY')) {
    return new PersistenceError(PersistenceFailureKind.CONFLICT, operation, {
      cause: new FiscalYearLabelDuplicateError(),
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
function toFiscalYear(row: FiscalYearRow): FiscalYear {
  return FiscalYear.rehydrate({
    id: row.id,
    tenantId: row.tenantId,
    label: row.label,
    // The range re-parses the stored day, so a corrupted column fails here
    // rather than becoming a silently wrong year.
    startDate: BusinessDate.parse(row.startDate).toIsoString(),
    endDate: BusinessDate.parse(row.endDate).toIsoString(),
    status: row.status,
    createdAt: DateTime.from(row.createdAt),
    updatedAt: DateTime.from(row.updatedAt),
  });
}
