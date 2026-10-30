import { eq } from 'drizzle-orm';

import type { Database } from '../../../../infrastructure/database/database.module.js';
import { scopedDatabase } from '../../../../infrastructure/database/scoped-database.js';
import type { DateTime } from '../../../../shared/time/date-time.js';
import type { ActiveCompanyPreference } from '../../application/ports/active-company-preference.port.js';
import {
  tenantReferenceFrom,
  type TenantReference,
} from '../../domain/value-objects/tenant-reference.js';
import type { UserId } from '../../domain/value-objects/user-id.js';
import { userActiveCompanies } from './drizzle-active-company.schema.js';

/**
 * Drizzle/MySQL implementation of the active-company preference port
 * (IAM-009; SHR-005).
 *
 * Every statement goes through `scopedDatabase`, so reading or writing the
 * selection joins the caller's transaction when one is open. This is a
 * user-level preference and not tenant-owned data: it has no `tenant_id`
 * predicate to enforce, because its whole purpose is to remember a company
 * across company boundaries.
 *
 * The write is an upsert keyed on `user_id`: selecting a company twice, or
 * switching to another one, leaves exactly one row and no duplicate.
 */
export class DrizzleActiveCompanyPreferenceRepository implements ActiveCompanyPreference {
  public constructor(private readonly database: Database) {}

  public async findActiveTenant(userId: UserId): Promise<TenantReference | undefined> {
    const rows = await scopedDatabase(this.database)
      .select({ tenantId: userActiveCompanies.tenantId })
      .from(userActiveCompanies)
      .where(eq(userActiveCompanies.userId, userId.value))
      .limit(1);

    const row = rows[0];

    return row === undefined ? undefined : tenantReferenceFrom(row.tenantId);
  }

  public async setActiveTenant(
    userId: UserId,
    tenantId: TenantReference,
    selectedAt: DateTime,
  ): Promise<void> {
    await scopedDatabase(this.database)
      .insert(userActiveCompanies)
      .values({
        userId: userId.value,
        tenantId: tenantId.value,
        selectedAt: selectedAt.toDate(),
      })
      .onDuplicateKeyUpdate({
        set: {
          tenantId: tenantId.value,
          selectedAt: selectedAt.toDate(),
        },
      });
  }
}
