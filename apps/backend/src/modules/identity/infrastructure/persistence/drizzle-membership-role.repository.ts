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
import { MembershipRole } from '../../domain/aggregates/membership-role.js';
import type { MembershipRoleRepository } from '../../domain/repositories/membership-role.repository.js';
import type { MembershipId } from '../../domain/value-objects/membership-id.js';
import type { MembershipRoleId } from '../../domain/value-objects/membership-role-id.js';
import type { RoleId } from '../../domain/value-objects/role-id.js';
import { membershipRoles } from './drizzle-membership-role.schema.js';

type MembershipRoleRow = typeof membershipRoles.$inferSelect;

/**
 * Drizzle/MySQL implementation of the membership-role assignment port (IAM-004;
 * SHR-004, SHR-008).
 *
 * Every statement goes through `scopedDatabase`, so a write joins the use case's
 * transaction and commits with it. `update` is one compare-and-swap on the
 * assignment row — removal is a deactivation, never a delete — and the unique key
 * on (membership, role) is the final authority for the duplicate rule: a second
 * active assignment for the pair fails at the database and is mapped to the
 * shared `CONFLICT` failure.
 *
 * The adapter and its table are exported to no one else (ADR-002 sections 8 and
 * 12; enforced by `src/modules/module-boundaries.spec.ts`).
 */
export class DrizzleMembershipRoleRepository implements MembershipRoleRepository {
  public constructor(private readonly database: Database) {}

  public async get(id: MembershipRoleId): Promise<Loaded<MembershipRole> | undefined> {
    const rows = await scopedDatabase(this.database)
      .select()
      .from(membershipRoles)
      .where(eq(membershipRoles.id, id.value))
      .limit(1);

    const row = rows[0];
    return row === undefined
      ? undefined
      : { aggregate: toMembershipRole(row), revision: Revision.of(row.revision) };
  }

  public async add(assignment: MembershipRole): Promise<WriteReceipt> {
    try {
      await scopedDatabase(this.database).insert(membershipRoles).values({
        id: assignment.id.value,
        tenantId: assignment.tenantId.value,
        membershipId: assignment.membershipId.value,
        roleId: assignment.roleId.value,
        status: assignment.status.value,
        revision: Revision.initial().value,
        createdAt: assignment.createdAt.toDate(),
        updatedAt: assignment.updatedAt.toDate(),
      });
    } catch (error) {
      // A duplicate key is a conflict — the pair is already assigned, or this id
      // is taken — not a shape the caller should have to interpret the driver for.
      if (isDuplicateKeyError(error)) {
        throw new PersistenceError(
          PersistenceFailureKind.CONFLICT,
          'MembershipRoleRepository.add',
          { cause: error },
        );
      }
      throw error;
    }

    return { revision: Revision.initial() };
  }

  public async update(
    assignment: MembershipRole,
    expectedRevision: Revision,
  ): Promise<WriteReceipt> {
    const [header] = await scopedDatabase(this.database)
      .update(membershipRoles)
      .set({
        status: assignment.status.value,
        revision: expectedRevision.value + 1,
        updatedAt: assignment.updatedAt.toDate(),
      })
      .where(
        and(
          eq(membershipRoles.id, assignment.id.value),
          eq(membershipRoles.revision, expectedRevision.value),
        ),
      );

    if (header.affectedRows === 0) {
      throw staleRevisionConflict('MembershipRoleRepository.update', expectedRevision);
    }

    return { revision: expectedRevision.next() };
  }

  public async findByMembershipId(
    membershipId: MembershipId,
  ): Promise<readonly Loaded<MembershipRole>[]> {
    const rows = await scopedDatabase(this.database)
      .select()
      .from(membershipRoles)
      .where(eq(membershipRoles.membershipId, membershipId.value));

    return rows.map(toLoadedMembershipRole);
  }

  public async findPair(
    membershipId: MembershipId,
    roleId: RoleId,
  ): Promise<Loaded<MembershipRole> | undefined> {
    const rows = await scopedDatabase(this.database)
      .select()
      .from(membershipRoles)
      .where(
        and(
          eq(membershipRoles.membershipId, membershipId.value),
          eq(membershipRoles.roleId, roleId.value),
        ),
      )
      .limit(1);

    const row = rows[0];
    return row === undefined
      ? undefined
      : { aggregate: toMembershipRole(row), revision: Revision.of(row.revision) };
  }
}

/** Rebuilds the aggregate from a stored row, re-validating every value. */
function toMembershipRole(row: MembershipRoleRow): MembershipRole {
  return MembershipRole.rehydrate({
    id: row.id,
    tenantId: row.tenantId,
    membershipId: row.membershipId,
    roleId: row.roleId,
    status: row.status,
    createdAt: DateTime.from(row.createdAt),
    updatedAt: DateTime.from(row.updatedAt),
  });
}

function toLoadedMembershipRole(row: MembershipRoleRow): Loaded<MembershipRole> {
  return { aggregate: toMembershipRole(row), revision: Revision.of(row.revision) };
}

/** Whether a driver reported a duplicate unique key (MySQL `ER_DUP_ENTRY`). */
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
