import { describe, expect, it } from 'vitest';

import { Result } from '../../shared/errors/result.js';
import { TenantScope } from '../../shared/tenant/tenant-scope.js';
import { PERMISSION_CATALOG } from '../../modules/identity/domain/permission.js';
import { DevelopmentSeedRunner, SeedEnvironmentRefusedError } from './development-seed.runner.js';
import { SEED_ROLES, SEED_TENANTS, SEED_USER_PASSWORD } from './seed-dataset.js';

/**
 * Focused tests for the development seeder (DEV-001).
 *
 * They exercise the runner's *decisions* over in-memory stand-ins for the use
 * cases it composes: which environment it refuses, what it creates the first
 * time and what it reuses afterwards. The use cases themselves are covered by
 * their own suites, and the persisted behaviour is the integration suite's job.
 */

interface FakeUser {
  readonly userId: string;
  status: 'active' | 'inactive';
}

function harness(
  environment: 'development' | 'test' | 'production' = 'development',
  systemAdminEnabled = true,
) {
  let sequence = 0;
  const nextId = (prefix: string): string => `${prefix}-${(sequence += 1)}`;
  const users = new Map<string, FakeUser>();
  const tenants = new Map<string, string>(); // tenantId -> name
  const memberships: { id: string; userId: string; tenantId: string }[] = [];
  const roles: {
    id: string;
    tenantId: string;
    name: string;
    permissions: string[];
    revision: number;
  }[] = [];
  const assignments: { membershipId: string; roleId: string; status: 'active' }[] = [];
  const fiscalYears: { tenantId: string; label: string }[] = [];
  const registry = new Map<string, { fixtureKey: string; entityType: string; entityId: string }>();

  const runner = new DevelopmentSeedRunner({
    config: {
      environment: {
        name: environment,
        isDevelopment: environment === 'development',
        isTest: environment === 'test',
        isProduction: environment === 'production',
      },
      systemAdmin: {
        enabled: systemAdminEnabled,
        email: 'owner@example.test',
        password: 'owner-password',
        displayName: 'Product Owner',
      },
    } as never,
    bootstrap: { execute: async () => 'verified' } as never,
    users: {
      findByEmail: async (email: string) => users.get(email),
    } as never,
    createUser: {
      execute: async (command: { payload: { email: string } }) => {
        const userId = nextId('user');
        users.set(command.payload.email, { userId, status: 'active' });
        return Result.ok({ id: userId } as never);
      },
    } as never,
    setCredential: { execute: async () => Result.ok(undefined as never) } as never,
    createTenant: {
      execute: async (command: { payload: { name: string } }) => {
        const id = nextId('tenant');
        tenants.set(id, command.payload.name);
        return Result.ok({ id } as never);
      },
    } as never,
    tenants: {
      exists: async (tenantId: string) => tenants.has(tenantId),
    } as never,
    createMembership: {
      execute: async (command: { payload: { userId: string; tenantId: string } }) => {
        const id = nextId('membership');
        memberships.push({ id, ...command.payload });
        return Result.ok({ id } as never);
      },
    } as never,
    listUserMemberships: {
      execute: async (query: { params: { userId: string } }) =>
        Result.ok(
          memberships
            .filter((membership) => membership.userId === query.params.userId)
            .map((membership) => ({ id: membership.id, tenantId: membership.tenantId })) as never,
        ),
    } as never,
    createRole: {
      execute: async (command: { payload: { tenantId: string; name: string } }) => {
        const role = { id: nextId('role'), ...command.payload, permissions: [], revision: 1 };
        roles.push(role);
        return Result.ok(role as never);
      },
    } as never,
    listRoles: {
      execute: async (query: { params: { tenantId: string } }) =>
        Result.ok(roles.filter((role) => role.tenantId === query.params.tenantId) as never),
    } as never,
    grantRolePermission: {
      execute: async (command: {
        payload: { roleId: string; permissionKey: string; expectedRevision: number };
      }) => {
        const role = roles.find((candidate) => candidate.id === command.payload.roleId);
        if (role === undefined) throw new Error('unknown role');
        role.permissions = [...role.permissions, command.payload.permissionKey];
        role.revision += 1;
        return Result.ok(role as never);
      },
    } as never,
    assignRole: {
      execute: async (command: { payload: { membershipId: string; roleId: string } }) => {
        assignments.push({ ...command.payload, status: 'active' });
        return Result.ok({ id: nextId('assignment') } as never);
      },
    } as never,
    listMembershipRoles: {
      execute: async (query: { params: { membershipId: string } }) =>
        Result.ok(
          assignments
            .filter((assignment) => assignment.membershipId === query.params.membershipId)
            .map((assignment) => ({ ...assignment })) as never,
        ),
    } as never,
    createFiscalYear: {
      execute: async (command: { payload: { label: string } }) => {
        const tenantId = TenantScope.requireTenantId();
        if (
          fiscalYears.some(
            (year) => year.tenantId === tenantId && year.label === command.payload.label,
          )
        ) {
          return Result.fail({
            code: 'FISCAL_YEAR_LABEL_DUPLICATE',
            message: 'another fiscal year uses that label',
          } as never);
        }
        fiscalYears.push({ tenantId, label: command.payload.label });
        return Result.ok({ id: nextId('fiscal-year') } as never);
      },
    } as never,
    registry: {
      load: async () => new Map(registry),
      record: async (fixture: typeof registry extends Map<string, infer V> ? V : never) => {
        registry.set(fixture.fixtureKey, fixture);
      },
    } as never,
  });

  return { runner, users, tenants, memberships, roles, assignments, fiscalYears, registry };
}

describe('seed dataset', () => {
  it('uses only capabilities the permission catalog registers', () => {
    const registered = new Set(PERMISSION_CATALOG.map((permission) => permission.permissionKey()));

    for (const role of SEED_ROLES) {
      for (const permission of role.permissions) {
        expect(registered.has(permission)).toBe(true);
      }
    }
  });

  it('defines two distinct companies with reserved .test users', () => {
    expect(SEED_TENANTS.length).toBeGreaterThanOrEqual(2);
    expect(new Set(SEED_TENANTS.map((tenant) => tenant.fixtureKey)).size).toBe(SEED_TENANTS.length);

    const emails = SEED_TENANTS.flatMap((tenant) => tenant.users.map((user) => user.email));
    expect(new Set(emails).size).toBe(emails.length);
    for (const email of emails) {
      expect(email.endsWith('@example.test')).toBe(true);
    }
  });

  it('keeps every seeded role tenant-level: no platform role is granted', () => {
    for (const role of SEED_ROLES) {
      expect(role.name.toLowerCase()).not.toContain('system-admin');
    }
    expect(SEED_USER_PASSWORD.length).toBeGreaterThan(0);
  });
});

describe('DevelopmentSeedRunner', () => {
  it('refuses production before reading or writing anything', async () => {
    const app = harness('production');

    await expect(app.runner.run()).rejects.toBeInstanceOf(SeedEnvironmentRefusedError);
    expect(app.users.size).toBe(0);
    expect(app.tenants.size).toBe(0);
    expect(app.registry.size).toBe(0);
  });

  it('creates the documented dataset on the first run', async () => {
    const app = harness();
    const report = await app.runner.run();

    expect(app.tenants.size).toBe(SEED_TENANTS.length);
    expect(app.users.size).toBe(SEED_TENANTS.flatMap((tenant) => tenant.users).length);
    expect(app.memberships).toHaveLength(app.users.size);
    expect(app.roles).toHaveLength(SEED_TENANTS.length * SEED_ROLES.length);
    expect(app.assignments).toHaveLength(app.users.size);
    expect(app.fiscalYears).toHaveLength(SEED_TENANTS.length);
    expect(app.registry.size).toBe(SEED_TENANTS.length);
    expect(report.productOwner).toBe('reused');
    expect(report.created).toBeGreaterThan(0);
  });

  it('reuses every fixture on a second run and creates nothing', async () => {
    const app = harness();
    await app.runner.run();

    const second = await app.runner.run();

    expect(second.created).toBe(0);
    expect(app.tenants.size).toBe(SEED_TENANTS.length);
    expect(app.users.size).toBe(SEED_TENANTS.flatMap((tenant) => tenant.users).length);
    expect(app.memberships).toHaveLength(app.users.size);
    expect(app.roles).toHaveLength(SEED_TENANTS.length * SEED_ROLES.length);
    expect(app.assignments).toHaveLength(app.users.size);
    expect(app.fiscalYears).toHaveLength(SEED_TENANTS.length);
  });

  it('fails with an actionable message when the Product Owner is not configured', async () => {
    const app = harness('development', false);

    await expect(app.runner.run()).rejects.toThrow(/SYSTEM_ADMIN_ENABLED/);
    expect(app.users.size).toBe(0);
    expect(app.tenants.size).toBe(0);
  });
});
