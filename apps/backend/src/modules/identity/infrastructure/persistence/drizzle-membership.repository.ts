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
import { Membership } from '../../domain/aggregates/membership.js';
import type { MembershipRepository } from '../../domain/repositories/membership.repository.js';
import type { MembershipId } from '../../domain/value-objects/membership-id.js';
import type { TenantReference } from '../../domain/value-objects/tenant-reference.js';
import type { UserId } from '../../domain/value-objects/user-id.js';
import { memberships } from './drizzle-membership.schema.js';

type MembershipRow = typeof memberships.$inferSelect;

/**
 * Drizzle/MySQL implementation of the membership persistence port (IAM-003;
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
 *
 * The unique key on `(user_id, tenant_id)` is the last line of defence for the
 * duplicate rule: a second insert for the same pair fails at the database and is
 * mapped to the shared `CONFLICT` failure, so a lost creation race is reported
 * as the duplicate it is rather than as a server error.
 *
 * The adapter, the table object and its DDL live in this module's
 * `infrastructure/persistence/` and are exported to no one else (ADR-002
 * sections 8 and 12; enforced by `src/modules/module-boundaries.spec.ts`).
 */
export class DrizzleMembershipRepository implements MembershipRepository {
  public constructor(private readonly database: Database) {}

  public async get(id: MembershipId): Promise<Loaded<Membership> | undefined> {
    const rows = await scopedDatabase(this.database)
      .select()
      .from(memberships)
      .where(eq(memberships.id, id.value))
      .limit(1);

    const row = rows[0];
    return row === undefined
      ? undefined
      : { aggregate: toMembership(row), revision: Revision.of(row.revision) };
  }

  public async add(membership: Membership): Promise<WriteReceipt> {
    try {
      await scopedDatabase(this.database).insert(memberships).values({
        id: membership.id.value,
        userId: membership.userId.value,
        tenantId: membership.tenantId.value,
        status: membership.status.value,
        revision: Revision.initial().value,
        createdAt: membership.createdAt.toDate(),
        updatedAt: membership.updatedAt.toDate(),
      });
    } catch (error) {
      // A duplicate key is a conflict — someone already created this pair, or
      // this id — not a shape the caller should have to interpret the driver for.
      if (isDuplicateKeyError(error)) {
        throw new PersistenceError(PersistenceFailureKind.CONFLICT, 'MembershipRepository.add', {
          cause: error,
        });
      }
      throw error;
    }

    return { revision: Revision.initial() };
  }

  public async update(membership: Membership, expectedRevision: Revision): Promise<WriteReceipt> {
    const [header] = await scopedDatabase(this.database)
      .update(memberships)
      .set({
        status: membership.status.value,
        revision: expectedRevision.value + 1,
        updatedAt: membership.updatedAt.toDate(),
      })
      .where(
        and(
          eq(memberships.id, membership.id.value),
          eq(memberships.revision, expectedRevision.value),
        ),
      );

    if (header.affectedRows === 0) {
      // The store answers "nothing matched" without naming what is stored
      // instead, so the cause stays honest about the unknown current revision.
      throw staleRevisionConflict('MembershipRepository.update', expectedRevision);
    }

    return { revision: expectedRevision.next() };
  }

  public async existsForPair(userId: UserId, tenantId: TenantReference): Promise<boolean> {
    const rows = await scopedDatabase(this.database)
      .select({ id: memberships.id })
      .from(memberships)
      .where(and(eq(memberships.userId, userId.value), eq(memberships.tenantId, tenantId.value)))
      .limit(1);

    return rows.length > 0;
  }

  public async findByUserId(userId: UserId): Promise<readonly Loaded<Membership>[]> {
    const rows = await scopedDatabase(this.database)
      .select()
      .from(memberships)
      .where(eq(memberships.userId, userId.value));

    return rows.map(toLoadedMembership);
  }

  public async findByTenantId(tenantId: TenantReference): Promise<readonly Loaded<Membership>[]> {
    const rows = await scopedDatabase(this.database)
      .select()
      .from(memberships)
      .where(eq(memberships.tenantId, tenantId.value));

    return rows.map(toLoadedMembership);
  }
}

/** Rebuilds the aggregate from a stored row, re-validating every value. */
function toMembership(row: MembershipRow): Membership {
  return Membership.rehydrate({
    id: row.id,
    userId: row.userId,
    tenantId: row.tenantId,
    status: row.status,
    createdAt: DateTime.from(row.createdAt),
    updatedAt: DateTime.from(row.updatedAt),
  });
}

function toLoadedMembership(row: MembershipRow): Loaded<Membership> {
  return { aggregate: toMembership(row), revision: Revision.of(row.revision) };
}

/**
 * Whether a driver reported a duplicate unique key (MySQL `ER_DUP_ENTRY`).
 *
 * Drizzle wraps the driver failure (`DrizzleQueryError`), and the MySQL code
 * lives on the wrapped cause rather than the outermost error, so the cause
 * chain is walked instead of checking only the top level — otherwise a duplicate
 * pair would escape as an unexpected 500 rather than the conflict the caller can
 * act on.
 */
function isDuplicateKeyError(error: unknown): boolean {
  let current: unknown = error;

  for (let depth = 0; depth < 5 && typeof current === 'object' && current !== null; depth += 1) {
    if ((current as { readonly code?: unknown }).code === 'ER_DUP_ENTRY') {
      return true;
    }
    current = (current as { readonly cause?: unknown }).cause;
  }

  return false;
}
