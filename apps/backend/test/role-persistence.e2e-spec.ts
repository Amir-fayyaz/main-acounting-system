import { env } from 'node:process';

import { drizzle } from 'drizzle-orm/mysql2';
import { createPool, type Pool, type RowDataPacket } from 'mysql2/promise';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { AppConfigService } from '../src/infrastructure/config/app-config.service.js';
import { loadConfiguration } from '../src/infrastructure/config/configuration.js';
import { loadDotEnvFiles } from '../src/infrastructure/config/dotenv.js';
import type { Database } from '../src/infrastructure/database/database.module.js';
import { DrizzleTransactionRunner } from '../src/infrastructure/database/drizzle-transaction-runner.js';
import { AssignRoleToMembership } from '../src/modules/identity/application/commands/assign-role-to-membership.command.js';
import { CreateRole } from '../src/modules/identity/application/commands/create-role.command.js';
import { GrantRolePermission } from '../src/modules/identity/application/commands/grant-role-permission.command.js';
import { RemoveRoleFromMembership } from '../src/modules/identity/application/commands/remove-role-from-membership.command.js';
import { RevokeRolePermission } from '../src/modules/identity/application/commands/revoke-role-permission.command.js';
import { GetEffectivePermissions } from '../src/modules/identity/application/queries/effective-permissions.query.js';
import { ListMembershipRoles } from '../src/modules/identity/application/queries/list-membership-roles.query.js';
import { AssignRoleToMembershipUseCase } from '../src/modules/identity/application/use-cases/assign-role-to-membership.use-case.js';
import { CreateRoleUseCase } from '../src/modules/identity/application/use-cases/create-role.use-case.js';
import { GrantRolePermissionUseCase } from '../src/modules/identity/application/use-cases/grant-role-permission.use-case.js';
import { ListMembershipRolesUseCase } from '../src/modules/identity/application/use-cases/list-membership-roles.use-case.js';
import { RemoveRoleFromMembershipUseCase } from '../src/modules/identity/application/use-cases/remove-role-from-membership.use-case.js';
import { ResolveEffectivePermissionsUseCase } from '../src/modules/identity/application/use-cases/resolve-effective-permissions.use-case.js';
import { RevokeRolePermissionUseCase } from '../src/modules/identity/application/use-cases/revoke-role-permission.use-case.js';
import { Membership } from '../src/modules/identity/domain/aggregates/membership.js';
import { MembershipRole } from '../src/modules/identity/domain/aggregates/membership-role.js';
import { Role } from '../src/modules/identity/domain/aggregates/role.js';
import { User } from '../src/modules/identity/domain/aggregates/user.js';
import { PermissionKey } from '../src/modules/identity/domain/value-objects/permission-key.js';
import { roleIdFrom } from '../src/modules/identity/domain/value-objects/role-id.js';
import { tenantReferenceFrom } from '../src/modules/identity/domain/value-objects/tenant-reference.js';
import { DrizzleMembershipRoleRepository } from '../src/modules/identity/infrastructure/persistence/drizzle-membership-role.repository.js';
import { ensureMembershipRoleSchema } from '../src/modules/identity/infrastructure/persistence/drizzle-membership-role.schema.js';
import { DrizzleMembershipRepository } from '../src/modules/identity/infrastructure/persistence/drizzle-membership.repository.js';
import { ensureMembershipSchema } from '../src/modules/identity/infrastructure/persistence/drizzle-membership.schema.js';
import { DrizzleRoleRepository } from '../src/modules/identity/infrastructure/persistence/drizzle-role.repository.js';
import { ensureRoleSchema } from '../src/modules/identity/infrastructure/persistence/drizzle-role.schema.js';
import { DrizzleUserRepository } from '../src/modules/identity/infrastructure/persistence/drizzle-user.repository.js';
import { ensureUserSchema } from '../src/modules/identity/infrastructure/persistence/drizzle-user.schema.js';
import type { TenantDirectory } from '../src/modules/tenant/application/ports/tenant-directory.port.js';
import { Tenant } from '../src/modules/tenant/domain/aggregates/tenant.js';
import { isTenantId, tenantIdFrom } from '../src/modules/tenant/domain/value-objects/tenant-id.js';
import { TenantName } from '../src/modules/tenant/domain/value-objects/tenant-name.js';
import { DrizzleTenantRepository } from '../src/modules/tenant/infrastructure/persistence/drizzle-tenant.repository.js';
import { ensureTenantSchema } from '../src/modules/tenant/infrastructure/persistence/tenant.schema.js';
import { ConflictError } from '../src/shared/errors/category-errors.js';
import { toConflict } from '../src/shared/persistence/optimistic-concurrency.js';
import {
  PersistenceError,
  PersistenceFailureKind,
} from '../src/shared/persistence/persistence-error.js';
import { Revision } from '../src/shared/persistence/revision.js';
import { DateTime } from '../src/shared/time/date-time.js';
import { createTenantContext } from '../src/shared/tenant/tenant-context.js';
import { TenantScope } from '../src/shared/tenant/tenant-scope.js';
import {
  createTransactionBoundary,
  type TransactionBoundary,
} from '../src/shared/transaction/transaction-boundary.js';
import { RecordingRoleEvents } from './support/role-doubles.js';

/**
 * Role, permission and assignment persistence against a real MySQL server
 * (IAM-004).
 *
 * The use-case tests prove the feature over in-memory repositories; these prove
 * the parts only a real server can: the module's own tables are created from
 * their DDL, a role round-trips with its capability set, the composite primary
 * key refuses a duplicate grant, the unique key refuses a second assignment for a
 * membership/role pair, a compare-and-swap write refuses the loser of a race, and
 * deactivation retains the row instead of deleting it.
 *
 * Opt-in, so the required quality gate still runs without infrastructure:
 *
 * ```bash
 * pnpm infra:up
 * MYSQL_INTEGRATION=1 pnpm --filter @accounting-saas/backend test:e2e
 * ```
 *
 * The schemas are applied by the modules' idempotent DDL and dropped afterwards,
 * so the run leaves no migration implied.
 */
const integrationEnabled = env.MYSQL_INTEGRATION === '1';

const ROLE_TABLE = 'roles';
const ROLE_PERMISSION_TABLE = 'role_permissions';
const MEMBERSHIP_ROLE_TABLE = 'membership_roles';
const MEMBERSHIP_TABLE = 'memberships';
const USER_TABLE = 'users';
const TENANT_TABLE = 'tenants';

describe.skipIf(!integrationEnabled)('role persistence (integration)', () => {
  let pool: Pool;
  let database: Database;
  let boundary: TransactionBoundary;
  let roles: DrizzleRoleRepository;
  let assignments: DrizzleMembershipRoleRepository;
  let memberships: DrizzleMembershipRepository;
  let users: DrizzleUserRepository;
  let tenants: DrizzleTenantRepository;
  let directory: TenantDirectory;
  let events: RecordingRoleEvents;

  beforeAll(async () => {
    loadDotEnvFiles();

    const config = new AppConfigService(
      loadConfiguration({
        NODE_ENV: 'test',
        MYSQL_HOST: env.MYSQL_HOST,
        MYSQL_PORT: env.MYSQL_PORT,
        MYSQL_DATABASE: env.MYSQL_DATABASE,
        MYSQL_USER: env.MYSQL_USER,
        MYSQL_PASSWORD: env.MYSQL_PASSWORD,
      }),
    );

    pool = createPool({
      host: config.database.host,
      port: config.database.port,
      user: config.database.user,
      password: config.database.password,
      database: config.database.name,
      connectionLimit: 10,
      waitForConnections: true,
      queueLimit: 0,
      timezone: 'Z',
    });

    database = drizzle(pool);
    await ensureTenantSchema(database);
    await ensureUserSchema(database);
    await ensureMembershipSchema(database);
    await ensureRoleSchema(database);
    await ensureMembershipRoleSchema(database);

    roles = new DrizzleRoleRepository(database);
    assignments = new DrizzleMembershipRoleRepository(database);
    memberships = new DrizzleMembershipRepository(database);
    users = new DrizzleUserRepository(database);
    tenants = new DrizzleTenantRepository(database);
    boundary = createTransactionBoundary(new DrizzleTransactionRunner(database));
    directory = {
      async exists(tenantId: string): Promise<boolean> {
        return isTenantId(tenantId) && (await tenants.get(tenantIdFrom(tenantId))) !== undefined;
      },
    };
  });

  beforeEach(async () => {
    events = new RecordingRoleEvents();
    await pool.query(`DELETE FROM ${ROLE_PERMISSION_TABLE}`);
    await pool.query(`DELETE FROM ${MEMBERSHIP_ROLE_TABLE}`);
    await pool.query(`DELETE FROM ${ROLE_TABLE}`);
    await pool.query(`DELETE FROM ${MEMBERSHIP_TABLE}`);
    await pool.query(`DELETE FROM ${USER_TABLE}`);
    await pool.query(`DELETE FROM ${TENANT_TABLE}`);
  });

  afterAll(async () => {
    if (pool !== undefined) {
      await pool.query(`DROP TABLE IF EXISTS ${ROLE_PERMISSION_TABLE}`);
      await pool.query(`DROP TABLE IF EXISTS ${MEMBERSHIP_ROLE_TABLE}`);
      await pool.query(`DROP TABLE IF EXISTS ${ROLE_TABLE}`);
      await pool.query(`DROP TABLE IF EXISTS ${MEMBERSHIP_TABLE}`);
      await pool.query(`DROP TABLE IF EXISTS ${USER_TABLE}`);
      await pool.query(`DROP TABLE IF EXISTS ${TENANT_TABLE}`);
      await pool.end();
    }
  });

  function inTenant<T>(tenantId: string, work: () => Promise<T>): Promise<T> {
    return TenantScope.run(createTenantContext(tenantId), work);
  }

  async function seedTenant(name = 'Acme Trading Co.'): Promise<Tenant> {
    const tenant = Tenant.create({ name: TenantName.from(name), now: DateTime.now() });
    await tenants.add(tenant);

    return tenant;
  }

  async function seedMembership(tenantId: string): Promise<Membership> {
    const user = User.create({
      displayName: 'Ali Rezaei',
      email: `ali.${Math.random().toString(16).slice(2)}@example.com`,
      now: DateTime.now(),
    });
    await users.add(user);

    const membership = Membership.create({
      userId: user.id,
      tenantId: tenantIdFrom(tenantId),
      now: DateTime.now(),
    });
    await memberships.add(membership);

    return membership;
  }

  function createRole(): CreateRoleUseCase {
    return new CreateRoleUseCase(roles, directory, events, boundary);
  }

  async function aRole(tenantId: string, name = 'Accountant'): Promise<string> {
    const created = await inTenant(tenantId, () =>
      createRole().execute(new CreateRole({ tenantId, name })),
    );
    expect(created.isOk()).toBe(true);

    return created.valueOrThrow().id;
  }

  it('round-trips a role with its permission set through storage', async () => {
    const tenant = await seedTenant();
    const id = await aRole(tenant.id.value);

    await inTenant(tenant.id.value, () =>
      new GrantRolePermissionUseCase(roles, events, boundary).execute(
        new GrantRolePermission({
          roleId: id,
          tenantId: tenant.id.value,
          permissionKey: 'user.manage',
          expectedRevision: 1,
        }),
      ),
    );
    const granted = await inTenant(tenant.id.value, () =>
      new GrantRolePermissionUseCase(roles, events, boundary).execute(
        new GrantRolePermission({
          roleId: id,
          tenantId: tenant.id.value,
          permissionKey: 'company.read',
          expectedRevision: 2,
        }),
      ),
    );
    expect(granted.isOk()).toBe(true);

    const stored = await roles.get(roleIdFrom(id));
    expect(stored).toBeDefined();
    expect(stored?.aggregate.tenantId.value).toBe(tenant.id.value);
    expect(stored?.aggregate.permissions()).toEqual(['company.read', 'user.manage']);
    expect(stored?.revision.value).toBe(3);

    // The child rows are the permission set, not a duplicate-prone log.
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT permission_key FROM ${ROLE_PERMISSION_TABLE} WHERE role_id = ? ORDER BY permission_key`,
      [id],
    );
    expect(rows.map((row) => String(row.permission_key))).toEqual(['company.read', 'user.manage']);
  });

  it('enforces the role/permission uniqueness invariant in storage', async () => {
    const tenant = await seedTenant();
    const id = await aRole(tenant.id.value);

    await pool.query(
      `INSERT INTO ${ROLE_PERMISSION_TABLE} (role_id, permission_key) VALUES (?, ?)`,
      [id, 'company.read'],
    );

    let failure: unknown;
    try {
      await pool.query(
        `INSERT INTO ${ROLE_PERMISSION_TABLE} (role_id, permission_key) VALUES (?, ?)`,
        [id, 'company.read'],
      );
    } catch (error) {
      failure = error;
    }

    expect(failure).toBeDefined();
    expect((failure as { code?: string }).code).toBe('ER_DUP_ENTRY');
  });

  it('refuses the second of two role writes that read the same revision', async () => {
    const tenant = await seedTenant();
    const id = await aRole(tenant.id.value);

    const observed = await roles.get(roleIdFrom(id));
    expect(observed?.revision.value).toBe(1);

    // The first writer commits against the revision both writers read.
    observed!.aggregate.grantPermission(PermissionKey.from('company.read'), DateTime.now());
    await boundary.execute(() => roles.update(observed!.aggregate, Revision.initial()));

    // The second writer prepared its own aggregate from the same read.
    const stale = Role.rehydrate(observed!.aggregate.snapshot());
    stale.grantPermission(PermissionKey.from('user.read'), DateTime.now());

    let failure: unknown;
    try {
      await boundary.execute(() => roles.update(stale, Revision.initial()));
    } catch (error) {
      failure = error;
    }

    const conflict = toConflict(failure);
    expect(conflict).toBeInstanceOf(ConflictError);
    expect(conflict?.details[0]).toMatchObject({ code: 'STALE_REVISION', expected: 1 });

    // The winner's permission set is intact and the loser changed nothing.
    expect((await roles.get(roleIdFrom(id)))?.aggregate.permissions()).toEqual(['company.read']);
    expect((await roles.get(roleIdFrom(id)))?.revision.value).toBe(2);
  });

  it('enforces the (membership, role) uniqueness invariant in storage', async () => {
    const tenant = await seedTenant();
    const membership = await seedMembership(tenant.id.value);
    const id = await aRole(tenant.id.value);

    const first = MembershipRole.assign({
      tenantId: tenantReferenceFrom(tenant.id.value),
      membershipId: membership.id,
      roleId: roleIdFrom(id),
      now: DateTime.now(),
    });
    await assignments.add(first);

    const duplicate = MembershipRole.assign({
      tenantId: tenantReferenceFrom(tenant.id.value),
      membershipId: membership.id,
      roleId: roleIdFrom(id),
      now: DateTime.now(),
    });

    let failure: unknown;
    try {
      await assignments.add(duplicate);
    } catch (error) {
      failure = error;
    }

    expect(failure).toBeInstanceOf(PersistenceError);
    expect((failure as PersistenceError).kind).toBe(PersistenceFailureKind.CONFLICT);

    const stored = await assignments.findPair(membership.id, roleIdFrom(id));
    expect(stored?.aggregate.id.value).toBe(first.id.value);
    expect(stored?.aggregate.isActive()).toBe(true);
  });

  it('deactivates an assignment without deleting the row', async () => {
    const tenant = await seedTenant();
    const membership = await seedMembership(tenant.id.value);
    const id = await aRole(tenant.id.value);

    const assigned = await inTenant(tenant.id.value, () =>
      new AssignRoleToMembershipUseCase(memberships, roles, assignments, events, boundary).execute(
        new AssignRoleToMembership({
          tenantId: tenant.id.value,
          membershipId: membership.id.value,
          roleId: id,
        }),
      ),
    );
    expect(assigned.isOk()).toBe(true);
    const assignmentId = assigned.valueOrThrow().id;

    const removed = await inTenant(tenant.id.value, () =>
      new RemoveRoleFromMembershipUseCase(assignments, roles, events, boundary).execute(
        new RemoveRoleFromMembership({
          tenantId: tenant.id.value,
          membershipId: membership.id.value,
          assignmentId,
          expectedRevision: 1,
        }),
      ),
    );
    expect(removed.valueOrThrow().status).toBe('inactive');

    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT status FROM ${MEMBERSHIP_ROLE_TABLE} WHERE id = ?`,
      [assignmentId],
    );
    expect(rows).toHaveLength(1);
    expect(String(rows[0]?.status)).toBe('inactive');
  });

  it('resolves effective permissions from storage as access changes', async () => {
    const tenant = await seedTenant();
    const membership = await seedMembership(tenant.id.value);
    const id = await aRole(tenant.id.value);
    const tenantId = tenant.id.value;

    const grant = new GrantRolePermissionUseCase(roles, events, boundary);
    await inTenant(tenantId, () =>
      grant.execute(
        new GrantRolePermission({
          roleId: id,
          tenantId,
          permissionKey: 'company.read',
          expectedRevision: 1,
        }),
      ),
    );
    await inTenant(tenantId, () =>
      grant.execute(
        new GrantRolePermission({
          roleId: id,
          tenantId,
          permissionKey: 'user.read',
          expectedRevision: 2,
        }),
      ),
    );
    await inTenant(tenantId, () =>
      new AssignRoleToMembershipUseCase(memberships, roles, assignments, events, boundary).execute(
        new AssignRoleToMembership({
          tenantId,
          membershipId: membership.id.value,
          roleId: id,
        }),
      ),
    );

    const resolve = new ResolveEffectivePermissionsUseCase(memberships, assignments, roles);
    const resolved = await inTenant(tenantId, () =>
      resolve.execute(new GetEffectivePermissions({ tenantId, membershipId: membership.id.value })),
    );
    expect(resolved.valueOrThrow().map((permission) => permission.key)).toEqual([
      'company.read',
      'user.read',
    ]);
    expect(resolved.valueOrThrow()[0]?.description).toBeTruthy();

    // Removing a capability updates the resolved set on the next read.
    await inTenant(tenantId, () =>
      new RevokeRolePermissionUseCase(roles, events, boundary).execute(
        new RevokeRolePermission({
          roleId: id,
          tenantId,
          permissionKey: 'user.read',
          expectedRevision: 3,
        }),
      ),
    );
    const afterRevoke = await inTenant(tenantId, () =>
      resolve.execute(new GetEffectivePermissions({ tenantId, membershipId: membership.id.value })),
    );
    expect(afterRevoke.valueOrThrow().map((permission) => permission.key)).toEqual([
      'company.read',
    ]);

    // Removing the role ends its effect, while the assignment stays as history.
    const history = await inTenant(tenantId, () =>
      new ListMembershipRolesUseCase(memberships, assignments, roles).execute(
        new ListMembershipRoles({ tenantId, membershipId: membership.id.value }),
      ),
    );
    await inTenant(tenantId, () =>
      new RemoveRoleFromMembershipUseCase(assignments, roles, events, boundary).execute(
        new RemoveRoleFromMembership({
          tenantId,
          membershipId: membership.id.value,
          assignmentId: history.valueOrThrow()[0]!.id,
          expectedRevision: 1,
        }),
      ),
    );

    const afterRemoval = await inTenant(tenantId, () =>
      resolve.execute(new GetEffectivePermissions({ tenantId, membershipId: membership.id.value })),
    );
    expect(afterRemoval.valueOrThrow()).toEqual([]);

    const retained = await inTenant(tenantId, () =>
      new ListMembershipRolesUseCase(memberships, assignments, roles).execute(
        new ListMembershipRoles({ tenantId, membershipId: membership.id.value }),
      ),
    );
    expect(retained.valueOrThrow()).toHaveLength(1);
    expect(retained.valueOrThrow()[0]?.status).toBe('inactive');
  });

  it('does not read or resolve another tenant’s role or membership', async () => {
    const tenant = await seedTenant('First Co.');
    const otherTenant = await seedTenant('Second Co.');
    const id = await aRole(tenant.id.value);
    const membership = await seedMembership(tenant.id.value);

    const foreignRead = await inTenant(otherTenant.id.value, () =>
      new CreateRoleUseCase(roles, directory, events, boundary).execute(
        new CreateRole({ tenantId: otherTenant.id.value, name: 'Foreign' }),
      ),
    );
    expect(foreignRead.isOk()).toBe(true);

    // The role is invisible from the other tenant.
    const foreignGrant = await inTenant(otherTenant.id.value, () =>
      new GrantRolePermissionUseCase(roles, events, boundary).execute(
        new GrantRolePermission({
          roleId: id,
          tenantId: otherTenant.id.value,
          permissionKey: 'company.read',
          expectedRevision: 1,
        }),
      ),
    );
    expect(foreignGrant.errorOrThrow().code).toBe('ROLE_NOT_FOUND');

    const foreignMembership = await inTenant(otherTenant.id.value, () =>
      new ResolveEffectivePermissionsUseCase(memberships, assignments, roles).execute(
        new GetEffectivePermissions({
          tenantId: otherTenant.id.value,
          membershipId: membership.id.value,
        }),
      ),
    );
    expect(foreignMembership.errorOrThrow().code).toBe('MEMBERSHIP_NOT_FOUND');
  });
});
