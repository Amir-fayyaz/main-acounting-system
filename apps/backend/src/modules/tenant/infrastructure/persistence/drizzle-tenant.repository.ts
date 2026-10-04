import { and, eq } from 'drizzle-orm';

import type { Database } from '../../../../infrastructure/database/database.module.js';
import { scopedDatabase } from '../../../../infrastructure/database/scoped-database.js';
import { staleRevisionConflict } from '../../../../shared/persistence/optimistic-concurrency.js';
import {
  PersistenceError,
  PersistenceFailureKind,
} from '../../../../shared/persistence/persistence-error.js';
import type { Loaded, WriteReceipt } from '../../../../shared/persistence/repository-ports.js';
import { Revision } from '../../../../shared/persistence/revision.js';
import { DateTime } from '../../../../shared/time/date-time.js';
import { Tenant } from '../../domain/aggregates/tenant.js';
import type { TenantId } from '../../domain/value-objects/tenant-id.js';
import type { TenantRepository } from '../../domain/repositories/tenant.repository.js';
import { tenants } from './tenant.schema.js';

type TenantRow = typeof tenants.$inferSelect;

/**
 * Drizzle/MySQL implementation of the tenant persistence port (IAM-001;
 * SHR-004, SHR-008).
 *
 * Two properties make this adapter correct rather than merely convenient:
 *
 * - **Every statement goes through `scopedDatabase`.** Inside a use case's
 *   transaction the write joins that boundary and commits with it; outside one
 *   it is a single autocommitted statement. The adapter never opens a
 *   transaction of its own (SHR-005).
 * - **`update` is one compare-and-swap.** The revision check and the write are
 *   the same statement, so no other transaction can land between them; zero
 *   affected rows means the record moved, and that is reported through
 *   `staleRevisionConflict` — the shared SHR-008 failure — instead of
 *   overwriting the winner.
 */
export class DrizzleTenantRepository implements TenantRepository {
  public constructor(private readonly database: Database) {}

  public async get(id: TenantId): Promise<Loaded<Tenant> | undefined> {
    const rows = await scopedDatabase(this.database)
      .select()
      .from(tenants)
      .where(eq(tenants.id, id.value))
      .limit(1);

    const row = rows[0];
    return row === undefined
      ? undefined
      : { aggregate: toTenant(row), revision: Revision.of(row.revision) };
  }

  public async add(tenant: Tenant): Promise<WriteReceipt> {
    try {
      await scopedDatabase(this.database).insert(tenants).values({
        id: tenant.id.value,
        name: tenant.name.value,
        status: tenant.status.value,
        revision: Revision.initial().value,
        createdAt: tenant.createdAt.toDate(),
        updatedAt: tenant.updatedAt.toDate(),
      });
    } catch (error) {
      // A duplicate identity is a conflict — someone already owns this id —
      // not a shape the caller should have to interpret the driver for.
      if (isDuplicateKeyError(error)) {
        throw new PersistenceError(PersistenceFailureKind.CONFLICT, 'TenantRepository.add', {
          cause: error,
        });
      }
      throw error;
    }

    return { revision: Revision.initial() };
  }

  public async update(tenant: Tenant, expectedRevision: Revision): Promise<WriteReceipt> {
    const [header] = await scopedDatabase(this.database)
      .update(tenants)
      .set({
        name: tenant.name.value,
        status: tenant.status.value,
        revision: expectedRevision.value + 1,
        updatedAt: tenant.updatedAt.toDate(),
      })
      .where(and(eq(tenants.id, tenant.id.value), eq(tenants.revision, expectedRevision.value)));

    if (header.affectedRows === 0) {
      // The store answers "nothing matched" without naming what is stored
      // instead, so the cause stays honest about the unknown current revision.
      throw staleRevisionConflict('TenantRepository.update', expectedRevision);
    }

    return { revision: expectedRevision.next() };
  }
}

/** Rebuilds the aggregate from a stored row, re-validating every value. */
function toTenant(row: TenantRow): Tenant {
  return Tenant.rehydrate({
    id: row.id,
    name: row.name,
    status: row.status,
    createdAt: DateTime.from(row.createdAt),
    updatedAt: DateTime.from(row.updatedAt),
  });
}

/** Whether a driver reported a duplicate primary key (MySQL `ER_DUP_ENTRY`). */
function isDuplicateKeyError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    (error as { readonly code?: unknown }).code === 'ER_DUP_ENTRY'
  );
}
