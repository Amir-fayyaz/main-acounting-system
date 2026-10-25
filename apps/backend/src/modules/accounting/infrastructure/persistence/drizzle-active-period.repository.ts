import { eq } from 'drizzle-orm';

import type { Database } from '../../../../infrastructure/database/database.module.js';
import { scopedDatabase } from '../../../../infrastructure/database/scoped-database.js';
import {
  assertTenantCriterion,
  assertTenantOwnership,
} from '../../../../infrastructure/database/tenant-scoped.js';
import type { ActivePeriodRepository } from '../../domain/repositories/active-period.repository.js';
import { fiscalPeriodIdFrom, type FiscalPeriodId } from '../../domain/value-objects/fiscal-period-id.js';
import type { TenantReference } from '../../domain/value-objects/tenant-reference.js';
import { tenantActivePeriods } from './fiscal-period.schema.js';

/**
 * Drizzle/MySQL implementation of the active-period pointer (FIS-004).
 *
 * The rule lives in the shape of the storage: one row per tenant, primary key
 * `tenant_id`, whose `period_id` is the single active period. `activate` is
 * therefore one **single statement** —
 *
 * ```sql
 * INSERT INTO tenant_active_periods (tenant_id, period_id, updated_at)
 *   VALUES (?, ?, ?)
 *   ON DUPLICATE KEY UPDATE period_id = VALUES(period_id), updated_at = VALUES(updated_at)
 * ```
 *
 * — which is what makes the acceptance property more than an intention:
 * whatever the interleaving, two concurrent "select active" requests leave
 * exactly one row, pointing at whichever write committed last, and the old
 * period stops being active exactly when the new one starts being active,
 * never in between. A row insert and a row update in one transaction would be
 * two facts racing; this is one.
 *
 * The tenant boundary is enforced here like every other adapter's (IAM-007):
 * the read filters by the ambient scope and refuses a foreign criterion; the
 * write re-checks ownership immediately before the statement.
 */
export class DrizzleActivePeriodRepository implements ActivePeriodRepository {
  public constructor(private readonly database: Database) {}

  public async periodIdFor(tenantId: TenantReference): Promise<FiscalPeriodId | undefined> {
    assertTenantCriterion(tenantId.value, 'ActivePeriodRepository.periodIdFor');

    const rows = await scopedDatabase(this.database)
      .select()
      .from(tenantActivePeriods)
      .where(eqTenant(tenantId))
      .limit(1);

    const row = rows[0];
    return row === undefined ? undefined : fiscalPeriodIdFrom(row.periodId);
  }

  public async activate(tenantId: TenantReference, periodId: FiscalPeriodId): Promise<void> {
    assertTenantOwnership(tenantId.value, 'ActivePeriodRepository.activate');

    // One statement; see the class documentation for why there is no
    // check-then-insert and no transaction split here.
    await scopedDatabase(this.database)
      .insert(tenantActivePeriods)
      .values({
        tenantId: tenantId.value,
        periodId: periodId.value,
        updatedAt: new Date(),
      })
      .onDuplicateKeyUpdate({
        set: { periodId: periodId.value, updatedAt: new Date() },
      });
  }
}

/** A scoping predicate against the criterion, already proven to be the scope's. */
function eqTenant(tenantId: TenantReference) {
  return eq(tenantActivePeriods.tenantId, tenantId.value);
}

