import { describe, expect, it, vi } from 'vitest';

import {
  FIXED_NOW,
  InMemoryMembershipRepository,
} from '../../../../test/support/membership-doubles.js';
import {
  InMemoryMembershipRoleRepository,
  InMemoryRoleRepository,
} from '../../../../test/support/role-doubles.js';
import { InMemoryUserRepository, aUser } from '../../../../test/support/user-doubles.js';
import { Membership } from '../domain/aggregates/membership.js';
import { MembershipRole } from '../domain/aggregates/membership-role.js';
import { Role } from '../domain/aggregates/role.js';
import type { User } from '../domain/aggregates/user.js';
import { PermissionKey } from '../domain/value-objects/permission-key.js';
import { RoleName } from '../domain/value-objects/role-name.js';
import { tenantReferenceFrom } from '../domain/value-objects/tenant-reference.js';
import { AuthorizeActionUseCase } from './use-cases/authorize-action.use-case.js';

/**
 * The authorization decision over the real use case (IAM-006).
 *
 * The domain spec proves the rule; this one proves the *resolution*: that the
 * application reads the subject's current state, the membership it actually has
 * and the effective permissions of its active roles — and that every path which
 * is not a definite "yes" is a failure that stops a protected action from
 * running.
 *
 * The repositories are the shared identity doubles, so the use case is exercised
 * against the same compare-and-rehydrate semantics the production adapters
 * implement, and no assertion depends on a shared mutable object.
 */

const TENANT_A = '018f0d3c-6d0f-7a4b-9d4e-2b3c4d5e6f70';
const TENANT_B = '018f0d3c-6d0f-7a4b-9d4e-2b3c4d5e6f71';

interface Harness {
  readonly users: InMemoryUserRepository;
  readonly memberships: InMemoryMembershipRepository;
  readonly assignments: InMemoryMembershipRoleRepository;
  readonly roles: InMemoryRoleRepository;
  readonly authorize: AuthorizeActionUseCase;
}

function harness(): Harness {
  const users = new InMemoryUserRepository();
  const memberships = new InMemoryMembershipRepository();
  const assignments = new InMemoryMembershipRoleRepository();
  const roles = new InMemoryRoleRepository();

  return {
    users,
    memberships,
    assignments,
    roles,
    authorize: new AuthorizeActionUseCase(users, memberships, assignments, roles),
  };
}

/** Seeds an active user and answers it. */
function seedUser(app: Harness, options: { active?: boolean } = {}): User {
  const user = aUser();
  if (options.active === false) {
    user.deactivate(user.createdAt);
  }
  app.users.seed(user);
  return user;
}

/**
 * Seeds an active membership of `user` in `tenantId`, holding one role with the
 * given capabilities — the shape the real write path produces (role → assignment
 * → membership).
 */
function seedMembership(
  app: Harness,
  user: User,
  options: {
    tenantId?: string;
    permissions?: readonly string[];
    membershipActive?: boolean;
    roleActive?: boolean;
    assignmentActive?: boolean;
  } = {},
): Membership {
  const tenantId = options.tenantId ?? TENANT_A;
  const membership = Membership.create({
    userId: user.id,
    tenantId: tenantReferenceFrom(tenantId),
    now: FIXED_NOW,
  });

  if (options.membershipActive === false) {
    membership.deactivate(FIXED_NOW);
  }
  app.memberships.seed(membership);

  const role = Role.create({
    tenantId: tenantReferenceFrom(tenantId),
    name: RoleName.from('Administrator'),
    now: FIXED_NOW,
    permissions: (options.permissions ?? []).map((key) => PermissionKey.from(key)),
  });

  if (options.roleActive === false) {
    role.deactivate(FIXED_NOW);
  }
  app.roles.seed(role);

  const assignment = MembershipRole.assign({
    tenantId: tenantReferenceFrom(tenantId),
    membershipId: membership.id,
    roleId: role.id,
    now: FIXED_NOW,
  });

  if (options.assignmentActive === false) {
    assignment.deactivate(FIXED_NOW);
  }
  app.assignments.seed(assignment);

  return membership;
}

function principalOf(user: User) {
  return { userId: user.id.value, displayName: user.displayName.value, email: user.email.value };
}

describe('authorize — tenant-scoped decisions', () => {
  it('allows an authenticated user with an active membership and the required permission', async () => {
    const app = harness();
    const user = seedUser(app);
    const membership = seedMembership(app, user, { permissions: ['role.manage', 'role.read'] });

    const outcome = await app.authorize.authorize({
      principal: principalOf(user),
      requiredPermission: PermissionKey.from('role.manage'),
      targetTenantId: TENANT_A,
    });

    expect(outcome.isOk()).toBe(true);
    expect(outcome.valueOrThrow()).toEqual({
      userId: user.id.value,
      tenantId: TENANT_A,
      membershipId: membership.id.value,
      membershipStatus: 'active',
      permissions: ['role.manage', 'role.read'],
    });
  });

  it('denies an authenticated user without the required permission', async () => {
    const app = harness();
    const user = seedUser(app);
    seedMembership(app, user, { permissions: ['role.read'] });

    const outcome = await app.authorize.authorize({
      principal: principalOf(user),
      requiredPermission: PermissionKey.from('role.manage'),
      targetTenantId: TENANT_A,
    });

    expect(outcome.isFail()).toBe(true);
    expect(outcome.errorOrThrow().code).toBe('AUTHORIZATION_DENIED');
  });

  it('denies a tenant-scoped operation with no tenant context', async () => {
    const app = harness();
    const user = seedUser(app);
    seedMembership(app, user, { permissions: ['role.manage'] });

    const outcome = await app.authorize.authorize({
      principal: principalOf(user),
      requiredPermission: PermissionKey.from('role.manage'),
      targetTenantId: '',
    });

    expect(outcome.errorOrThrow().code).toBe('TENANT_CONTEXT_REQUIRED');
  });

  it('treats a malformed tenant identifier as invalid tenant context', async () => {
    const app = harness();
    const user = seedUser(app);
    seedMembership(app, user, { permissions: ['role.manage'] });

    const outcome = await app.authorize.authorize({
      principal: principalOf(user),
      requiredPermission: PermissionKey.from('role.manage'),
      targetTenantId: 'not-a-tenant',
    });

    expect(outcome.errorOrThrow().code).toBe('TENANT_CONTEXT_REQUIRED');
  });

  it('denies a caller who is a member of another tenant (a forged identifier)', async () => {
    const app = harness();
    const user = seedUser(app);
    seedMembership(app, user, { tenantId: TENANT_A, permissions: ['role.manage'] });

    const outcome = await app.authorize.authorize({
      principal: principalOf(user),
      requiredPermission: PermissionKey.from('role.manage'),
      targetTenantId: TENANT_B,
    });

    // Indistinguishable from a tenant that does not exist: the boundary never
    // confirms what the caller cannot see.
    expect(outcome.errorOrThrow().code).toBe('MEMBERSHIP_REQUIRED');
  });

  it('denies an inactive membership even when the role grants the capability', async () => {
    const app = harness();
    const user = seedUser(app);
    seedMembership(app, user, { permissions: ['role.manage'], membershipActive: false });

    const outcome = await app.authorize.authorize({
      principal: principalOf(user),
      requiredPermission: PermissionKey.from('role.manage'),
      targetTenantId: TENANT_A,
    });

    expect(outcome.errorOrThrow().code).toBe('MEMBERSHIP_INACTIVE');
  });
});

describe('authorize — effective permissions', () => {
  it('combines the permissions of every role the membership holds', async () => {
    const app = harness();
    const user = seedUser(app);
    const membership = seedMembership(app, user, { permissions: ['company.read'] });

    const secondRole = Role.create({
      tenantId: tenantReferenceFrom(TENANT_A),
      name: RoleName.from('Auditor'),
      now: FIXED_NOW,
      permissions: [PermissionKey.from('role.read')],
    });
    app.roles.seed(secondRole);
    app.assignments.seed(
      MembershipRole.assign({
        tenantId: tenantReferenceFrom(TENANT_A),
        membershipId: membership.id,
        roleId: secondRole.id,
        now: FIXED_NOW,
      }),
    );

    const outcome = await app.authorize.authorize({
      principal: principalOf(user),
      requiredPermission: PermissionKey.from('role.read'),
      targetTenantId: TENANT_A,
    });

    expect(outcome.valueOrThrow().permissions).toEqual(['company.read', 'role.read']);
  });

  it('ignores a deactivated role and a removed assignment', async () => {
    const app = harness();
    const user = seedUser(app);

    const withInactiveRole = Membership.create({
      userId: user.id,
      tenantId: tenantReferenceFrom(TENANT_A),
      now: FIXED_NOW,
    });
    app.memberships.seed(withInactiveRole);
    seedMembership(app, user, {
      tenantId: TENANT_B,
      permissions: ['role.read'],
      assignmentActive: false,
    });

    const inactiveRole = Role.create({
      tenantId: tenantReferenceFrom(TENANT_A),
      name: RoleName.from('Retired'),
      now: FIXED_NOW,
      permissions: [PermissionKey.from('role.manage')],
    });
    inactiveRole.deactivate(FIXED_NOW);
    app.roles.seed(inactiveRole);
    app.assignments.seed(
      MembershipRole.assign({
        tenantId: tenantReferenceFrom(TENANT_A),
        membershipId: withInactiveRole.id,
        roleId: inactiveRole.id,
        now: FIXED_NOW,
      }),
    );

    const outcome = await app.authorize.authorize({
      principal: principalOf(user),
      requiredPermission: PermissionKey.from('role.manage'),
      targetTenantId: TENANT_A,
    });

    expect(outcome.errorOrThrow().code).toBe('AUTHORIZATION_DENIED');
  });

  it('resolves a platform capability across the subject’s active memberships', async () => {
    const app = harness();
    const user = seedUser(app);
    seedMembership(app, user, { tenantId: TENANT_A, permissions: ['user.read'] });
    seedMembership(app, user, { tenantId: TENANT_B, permissions: ['user.manage'] });
    // An inactive membership contributes nothing.
    seedMembership(app, user, {
      tenantId: '018f0d3c-6d0f-7a4b-9d4e-2b3c4d5e6f72',
      permissions: ['role.manage'],
      membershipActive: false,
    });

    const outcome = await app.authorize.authorize({
      principal: principalOf(user),
      requiredPermission: PermissionKey.from('user.manage'),
    });

    const context = outcome.valueOrThrow();
    expect(context.tenantId).toBeUndefined();
    expect(context.membershipId).toBeUndefined();
    expect(context.permissions).toEqual(['user.manage', 'user.read']);
  });

  it('denies a platform capability the subject does not hold anywhere', async () => {
    const app = harness();
    const user = seedUser(app);
    seedMembership(app, user, { permissions: ['user.read'] });

    const outcome = await app.authorize.authorize({
      principal: principalOf(user),
      requiredPermission: PermissionKey.from('user.manage'),
    });

    expect(outcome.errorOrThrow().code).toBe('AUTHORIZATION_DENIED');
  });
});

describe('authorize — authentication is told apart from authorization', () => {
  it('fails an inactive subject as not authenticatable, not as unauthorized', async () => {
    const app = harness();
    const user = seedUser(app, { active: false });
    seedMembership(app, user, { permissions: ['role.manage'] });

    const outcome = await app.authorize.authorize({
      principal: principalOf(user),
      requiredPermission: PermissionKey.from('role.manage'),
      targetTenantId: TENANT_A,
    });

    expect(outcome.errorOrThrow().code).toBe('ACCOUNT_NOT_AUTHENTICATABLE');
  });

  it('fails an inconsistent principal identity as an invalid context', async () => {
    const app = harness();

    const outcome = await app.authorize.authorize({
      principal: { userId: 'not-a-user', displayName: 'Broken', email: 'broken@example.com' },
      requiredPermission: PermissionKey.from('user.read'),
    });

    expect(outcome.errorOrThrow().code).toBe('AUTHORIZATION_CONTEXT_INVALID');
  });
});

describe('authorize — the protected action does not run on denial', () => {
  it('lets the action run only after a permitted decision', async () => {
    const app = harness();
    const user = seedUser(app);
    seedMembership(app, user, { permissions: ['role.manage'] });
    const action = vi.fn();

    const outcome = await app.authorize.authorize({
      principal: principalOf(user),
      requiredPermission: PermissionKey.from('role.manage'),
      targetTenantId: TENANT_A,
    });

    if (outcome.isOk()) {
      action();
    }

    expect(action).toHaveBeenCalledTimes(1);
  });

  it('prevents the action when the decision fails', async () => {
    const app = harness();
    const user = seedUser(app);
    seedMembership(app, user, { permissions: ['role.read'] });
    const action = vi.fn();

    const outcome = await app.authorize.authorize({
      principal: principalOf(user),
      requiredPermission: PermissionKey.from('role.manage'),
      targetTenantId: TENANT_A,
    });

    if (outcome.isOk()) {
      action();
    }

    expect(outcome.isFail()).toBe(true);
    expect(action).not.toHaveBeenCalled();
  });
});

describe('permits', () => {
  it('answers from a resolved context without another read', async () => {
    const app = harness();
    const user = seedUser(app);
    seedMembership(app, user, { permissions: ['role.manage'] });

    const context = (
      await app.authorize.authorize({
        principal: principalOf(user),
        requiredPermission: PermissionKey.from('role.manage'),
        targetTenantId: TENANT_A,
      })
    ).valueOrThrow();

    expect(app.authorize.permits(context, PermissionKey.from('role.manage'))).toBe(true);
    expect(app.authorize.permits(context, PermissionKey.from('role.read'))).toBe(false);
  });
});
