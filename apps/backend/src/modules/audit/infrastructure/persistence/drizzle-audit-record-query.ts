import { and, desc, eq, gte, lte, sql, type SQL } from 'drizzle-orm';

import type { Database } from '../../../../infrastructure/database/database.module.js';
import { scopedDatabase } from '../../../../infrastructure/database/scoped-database.js';
import { assertTenantCriterion } from '../../../../infrastructure/database/tenant-scoped.js';
import type {
  AuditRecordCriteria,
  AuditRecordPage,
  AuditRecordQuery,
} from '../../application/ports/audit-record-query.port.js';
import { toAuditRecordView } from '../../application/views/audit-record.mapper.js';
import { toAuditRecord } from './audit-record.rows.js';
import { auditRecords } from './audit-record.schema.js';

/**
 * Drizzle/MySQL implementation of the audit read port (AUD-001; SHR-004;
 * ADR-009).
 *
 * Two statements per read, and both are deliberately bounded:
 *
 * - **the page** — the tenant scope plus the requested filters, newest first,
 *   with `LIMIT`/`OFFSET` applied by the database. A trail grows forever, so the
 *   only shape that stays honest is "the store returns one page", never "load
 *   the tenant's history and slice it in memory".
 * - **the total** — the same criteria counted, which is what the standard
 *   pagination envelope reports. Counting the filtered set (rather than the
 *   whole table) is what makes `totalPages` mean something to a caller who
 *   filtered.
 *
 * The tenant condition is not optional and is not derived from anything the
 * adapter sees: `criteria.tenantId` is filled by the application from the
 * resolved tenant scope (SHR-007). There is no code path here that reads a trail
 * across tenants, which is the property the isolation tests pin.
 *
 * Ordering is `occurred_at DESC, id DESC`: the newest fact first, with the id as
 * a tie-breaker so two records written in the same millisecond still have one
 * deterministic order — without it, paging could repeat or skip a record.
 */
export class DrizzleAuditRecordQuery implements AuditRecordQuery {
  public constructor(private readonly database: Database) {}

  public async read(criteria: AuditRecordCriteria): Promise<AuditRecordPage> {
    // The criterion must be the active tenant: a caller cannot widen the read
    // by constructing a different id, and an unscoped read is refused.
    assertTenantCriterion(criteria.tenantId, 'AuditRecordQuery.read');

    const db = scopedDatabase(this.database);
    const where = conditionsOf(criteria);
    const offset = (criteria.page - 1) * criteria.limit;

    const rows = await db
      .select()
      .from(auditRecords)
      .where(where)
      .orderBy(desc(auditRecords.occurredAt), desc(auditRecords.id))
      .limit(criteria.limit)
      .offset(offset);

    const [counted] = await db
      .select({ total: sql<number>`count(*)` })
      .from(auditRecords)
      .where(where);

    return {
      records: rows.map((row) => toAuditRecordView(toAuditRecord(row))),
      // MySQL reports `COUNT(*)` as a bigint, which a driver may hand back as a
      // string; the envelope needs a number either way.
      total: Number(counted?.total ?? 0),
    };
  }
}

/** The closed set of conditions a read may carry: the tenant scope plus the filters. */
function conditionsOf(criteria: AuditRecordCriteria): SQL {
  const conditions: SQL[] = [eq(auditRecords.tenantId, criteria.tenantId)];

  if (criteria.actorUserId !== undefined) {
    conditions.push(eq(auditRecords.actorUserId, criteria.actorUserId));
  }
  if (criteria.action !== undefined) {
    conditions.push(eq(auditRecords.action, criteria.action));
  }
  if (criteria.targetType !== undefined) {
    conditions.push(eq(auditRecords.targetType, criteria.targetType));
  }
  if (criteria.targetId !== undefined) {
    conditions.push(eq(auditRecords.targetId, criteria.targetId));
  }
  if (criteria.outcome !== undefined) {
    conditions.push(eq(auditRecords.outcome, criteria.outcome));
  }
  if (criteria.from !== undefined) {
    conditions.push(gte(auditRecords.occurredAt, criteria.from.toDate()));
  }
  if (criteria.to !== undefined) {
    conditions.push(lte(auditRecords.occurredAt, criteria.to.toDate()));
  }

  // The tenant is always present, so `and(...)` always has at least one term.
  return and(...conditions) as SQL;
}
