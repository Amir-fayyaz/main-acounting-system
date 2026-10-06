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
import { Role } from '../../domain/aggregates/role.js';
import type { RoleRepository } from '../../domain/repositories/role.repository.js';
import type { RoleId } from '../../domain/value-objects/role-id.js';
import type { TenantReference } from '../../domain/value-objects/tenant-reference.js';
import { rolePermissions, roles } from './drizzle-role.schema.js';

type RoleRow = typeof roles.$inferSelect;

/**
 * Drizzle/MySQL implementation of the role persistence port (IAM-004; SHR-004,
 * SHR-008).
 *
 * The role and its capability set are written together through `scopedDatabase`,
 * so they join the use case's transaction and commit or roll back as one;
 * outside a boundary each statement is its own unit of work. `update` is a
 * compare-and-swap on the `roles` row — the revision check and the write are the
 * same statement — and the child `role_permissions` rows are then synchronised
 * to the aggregate's current set, so a stale change affects zero rows and is
 * reported through `staleRevisionConflict` instead of overwriting the winner.
 *
 * The adapter, the table objects and their DDL live in this module's
 * `infrastructure/persistence/` and are exported to no one else (ADR-002
 * sections 8 and 12; enforced by `src/modules/module-boundaries.spec.ts`).
 */
export class DrizzleRoleRepository implements RoleRepository {
  public constructor(private readonly database: Database) {}

  public async get(id: RoleId): Promise<Loaded<Role> | undefined> {
    const rows = await scopedDatabase(this.database)
      .select()
      .from(roles)
      .where(eq(roles.id, id.value))
      .limit(1);

    const row = rows[0];
    if (row === undefined) {
      return undefined;
    }

    return {
      aggregate: toRole(row, await this.permissionsOf(row.id)),
      revision: Revision.of(row.revision),
    };
  }

  public async add(role: Role): Promise<WriteReceipt> {
    const database = scopedDatabase(this.database);

    try {
      await database.insert(roles).values({
        id: role.id.value,
        tenantId: role.tenantId.value,
        name: role.name.value,
        status: role.status.value,
        revision: Revision.initial().value,
        createdAt: role.createdAt.toDate(),
        updatedAt: role.updatedAt.toDate(),
      });
    } catch (error) {
      if (isDuplicateKeyError(error)) {
        throw new PersistenceError(PersistenceFailureKind.CONFLICT, 'RoleRepository.add', {
          cause: error,
        });
      }
      throw error;
    }

    await this.replacePermissions(role, role.permissions());

    return { revision: Revision.initial() };
  }

  public async update(role: Role, expectedRevision: Revision): Promise<WriteReceipt> {
    const database = scopedDatabase(this.database);

    const [header] = await database
      .update(roles)
      .set({
        name: role.name.value,
        status: role.status.value,
        revision: expectedRevision.value + 1,
        updatedAt: role.updatedAt.toDate(),
      })
      .where(and(eq(roles.id, role.id.value), eq(roles.revision, expectedRevision.value)));

    if (header.affectedRows === 0) {
      // The store answers "nothing matched" without naming what is stored
      // instead, so the cause stays honest about the unknown current revision.
      throw staleRevisionConflict('RoleRepository.update', expectedRevision);
    }

    await this.replacePermissions(role, role.permissions());

    return { revision: expectedRevision.next() };
  }

  public async findByTenantId(tenantId: TenantReference): Promise<readonly Loaded<Role>[]> {
    const rows = await scopedDatabase(this.database)
      .select()
      .from(roles)
      .where(eq(roles.tenantId, tenantId.value));

    const loaded: Loaded<Role>[] = [];
    for (const row of rows) {
      loaded.push({
        aggregate: toRole(row, await this.permissionsOf(row.id)),
        revision: Revision.of(row.revision),
      });
    }

    return loaded;
  }

  /** The granted capability keys of a role, as stored. */
  private async permissionsOf(roleId: string): Promise<string[]> {
    const rows = await scopedDatabase(this.database)
      .select({ key: rolePermissions.permissionKey })
      .from(rolePermissions)
      .where(eq(rolePermissions.roleId, roleId));

    return rows.map((row) => row.key);
  }

  /**
   * Writes the role's capability set to match the aggregate's current set.
   *
   * The child rows are only ever read as a set, never referenced as history, so
   * a replace (clear, then insert the current keys) is the correct sync and the
   * simplest one — and it always runs in the caller's transaction, so no other
   * connection observes the intermediate state.
   */
  private async replacePermissions(role: Role, keys: readonly string[]): Promise<void> {
    const database = scopedDatabase(this.database);

    await database.delete(rolePermissions).where(eq(rolePermissions.roleId, role.id.value));

    if (keys.length > 0) {
      await database
        .insert(rolePermissions)
        .values(keys.map((key) => ({ roleId: role.id.value, permissionKey: key })));
    }
  }
}

/** Rebuilds the aggregate from a stored row and its permission keys. */
function toRole(row: RoleRow, permissions: readonly string[]): Role {
  return Role.rehydrate({
    id: row.id,
    tenantId: row.tenantId,
    name: row.name,
    status: row.status,
    permissions,
    createdAt: DateTime.from(row.createdAt),
    updatedAt: DateTime.from(row.updatedAt),
  });
}

/**
 * Whether a driver reported a duplicate unique key (MySQL `ER_DUP_ENTRY`).
 *
 * Drizzle wraps the driver failure (`DrizzleQueryError`), and the MySQL code
 * lives on the wrapped cause rather than the outermost error, so the cause chain
 * is walked instead of checking only the top level.
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
