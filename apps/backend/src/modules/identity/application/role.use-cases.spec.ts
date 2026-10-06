import { describe, expect, it } from 'vitest';
import {
  FIXED_NOW,
  InMemoryMembershipRepository,
  PassthroughTransactionBoundary,
  StubTenantDirectory,
} from '../../../../test/support/membership-doubles.js';
import {
  InMemoryMembershipRoleRepository,
  InMemoryRoleRepository,
  RecordingRoleEvents,
} from '../../../../test/support/role-doubles.js';
import { ConflictError } from '../../../shared/errors/category-errors.js';
import { EntityId } from '../../../shared/id/entity-id.js';
import { createTenantContext } from '../../../shared/tenant/tenant-context.js';
import { TenantScope } from '../../../shared/tenant/tenant-scope.js';
import { TenantContextMissingError } from '../../../shared/tenant/tenant.errors.js';
import { Membership } from '../domain/aggregates/membership.js';
import { MembershipRole } from '../domain/aggregates/membership-role.js';
import { Role } from '../domain/aggregates/role.js';
import type { MembershipId } from '../domain/value-objects/membership-id.js';
import { membershipRoleIdFrom } from '../domain/value-objects/membership-role-id.js';
import { RoleName } from '../domain/value-objects/role-name.js';
import { type RoleId } from '../domain/value-objects/role-id.js';
import { tenantReferenceFrom } from '../domain/value-objects/tenant-reference.js';
import { userIdFrom } from '../domain/value-objects/user-id.js';
import { AssignRoleToMembership } from './commands/assign-role-to-membership.command.js';
import { ChangeRoleStatus } from './commands/change-role-status.command.js';
import { CreateRole } from './commands/create-role.command.js';
import { GrantRolePermission } from './commands/grant-role-permission.command.js';
import { RemoveRoleFromMembership } from './commands/remove-role-from-membership.command.js';
import { RevokeRolePermission } from './commands/revoke-role-permission.command.js';
import { UpdateRole } from './commands/update-role.command.js';
import { GetEffectivePermissions } from './queries/effective-permissions.query.js';
import { GetRole } from './queries/get-role.query.js';
import { ListMembershipRoles } from './queries/list-membership-roles.query.js';
import { ListRoles } from './queries/list-roles.query.js';
import { AssignRoleToMembershipUseCase } from './use-cases/assign-role-to-membership.use-case.js';
import { ChangeRoleStatusUseCase } from './use-cases/change-role-status.use-case.js';
import { CreateRoleUseCase } from './use-cases/create-role.use-case.js';
import { GetRoleUseCase } from './use-cases/get-role.use-case.js';
import { GrantRolePermissionUseCase } from './use-cases/grant-role-permission.use-case.js';
import { ListMembershipRolesUseCase } from './use-cases/list-membership-roles.use-case.js';
import { ListPermissionsUseCase } from './use-cases/list-permissions.use-case.js';
import { ListRolesUseCase } from './use-cases/list-roles.use-case.js';
import { RemoveRoleFromMembershipUseCase } from './use-cases/remove-role-from-membership.use-case.js';
import { ResolveEffectivePermissionsUseCase } from './use-cases/resolve-effective-permissions.use-case.js';
import { RevokeRolePermissionUseCase } from './use-cases/revoke-role-permission.use-case.js';
import { UpdateRoleUseCase } from './use-cases/update-role.use-case.js';

interface Harness {
  readonly roles: InMemoryRoleRepository;
  readonly assignments: InMemoryMembershipRoleRepository;
  readonly memberships: InMemoryMembershipRepository;
  readonly tenants: StubTenantDirectory;
  readonly events: RecordingRoleEvents;
  readonly boundary: PassthroughTransactionBoundary;
  readonly createRole: CreateRoleUseCase;
  readonly getRole: GetRoleUseCase;
  readonly listRoles: ListRolesUseCase;
  readonly updateRole: UpdateRoleUseCase;
  readonly changeRoleStatus: ChangeRoleStatusUseCase;
  readonly grantPermission: GrantRolePermissionUseCase;
  readonly revokePermission: RevokeRolePermissionUseCase;
  readonly assignRole: AssignRoleToMembershipUseCase;
  readonly removeRole: RemoveRoleFromMembershipUseCase;
  readonly listMembershipRoles: ListMembershipRolesUseCase;
  readonly effectivePermissions: ResolveEffectivePermissionsUseCase;
  readonly listPermissions: ListPermissionsUseCase;
}

function harness(): Harness {
  const roles = new InMemoryRoleRepository();
  const assignments = new InMemoryMembershipRoleRepository();
  const memberships = new InMemoryMembershipRepository();
  const tenants = new StubTenantDirectory();
  const events = new RecordingRoleEvents();
  const boundary = new PassthroughTransactionBoundary();

  return {
    roles,
    assignments,
    memberships,
    tenants,
    events,
    boundary,
    createRole: new CreateRoleUseCase(roles, tenants, events, boundary),
    getRole: new GetRoleUseCase(roles),
    listRoles: new ListRolesUseCase(roles),
    updateRole: new UpdateRoleUseCase(roles, events, boundary),
    changeRoleStatus: new ChangeRoleStatusUseCase(roles, events, boundary),
    grantPermission: new GrantRolePermissionUseCase(roles, events, boundary),
    revokePermission: new RevokeRolePermissionUseCase(roles, events, boundary),
    assignRole: new AssignRoleToMembershipUseCase(
      memberships,
      roles,
      assignments,
      events,
      boundary,
    ),
    removeRole: new RemoveRoleFromMembershipUseCase(assignments, roles, events, boundary),
    listMembershipRoles: new ListMembershipRolesUseCase(memberships, assignments, roles),
    effectivePermissions: new ResolveEffectivePermissionsUseCase(memberships, assignments, roles),
    listPermissions: new ListPermissionsUseCase(),
  };
}

/** Runs tenant-scoped work the way the trusted entry point does. */
function inTenant<T>(tenantId: string, work: () => Promise<T>): Promise<T> {
  return TenantScope.run(createTenantContext(tenantId), work);
}

function randomId(): string {
  return EntityId.generate().value;
}

/** A tenant that exists, returning its identity. */
function existingTenant(app: Harness): string {
  const tenantId = randomId();
  app.tenants.grant(tenantId);
  return tenantId;
}

/** A membership of `tenantId`, seeded directly, returning its identity. */
function seedMembership(app: Harness, tenantId: string): MembershipId {
  const membership = Membership.create({
    userId: userIdFrom(randomId()),
    tenantId: tenantReferenceFrom(tenantId),
    now: FIXED_NOW,
  });
  app.memberships.seed(membership);
  return membership.id;
}

/** A role of `tenantId`, seeded directly, returning it. */
function seedRole(app: Harness, tenantId: string, name = 'Accountant'): Role {
  const role = Role.create({
    tenantId: tenantReferenceFrom(tenantId),
    name: RoleName.from(name),
    now: FIXED_NOW,
  });
  app.roles.seed(role);
  return role;
}

/** An active assignment, seeded directly. */
function seedAssignment(
  app: Harness,
  tenantId: string,
  membershipId: MembershipId,
  roleId: RoleId,
) {
  app.assignments.seed(
    MembershipRole.assign({
      tenantId: tenantReferenceFrom(tenantId),
      membershipId,
      roleId,
      now: FIXED_NOW,
    }),
  );
}

describe('role use cases', () => {
  describe('create', () => {
    it('creates an active, empty role, persists it and records a tenant-scoped event', async () => {
      const app = harness();
      const tenantId = existingTenant(app);

      const outcome = await inTenant(tenantId, () =>
        app.createRole.execute(new CreateRole({ tenantId, name: 'Accountant' })),
      );

      expect(outcome.isOk()).toBe(true);
      const view = outcome.valueOrThrow();
      expect(view.tenantId).toBe(tenantId);
      expect(view.name).toBe('Accountant');
      expect(view.status).toBe('active');
      expect(view.permissions).toEqual([]);
      expect(view.revision).toBe(1);
      expect(view.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
      expect(app.roles.addCalls).toBe(1);
      expect(app.boundary.executions).toBe(1);

      expect(app.events.recorded).toHaveLength(1);
      expect(app.events.recorded[0]?.name).toBe('RoleCreated');
      expect(app.events.recorded[0]?.metadata.tenantId).toBe(tenantId);
    });

    it('owns every role it creates, so two roles never share an identity', async () => {
      const app = harness();
      const tenantId = existingTenant(app);

      const first = await inTenant(tenantId, () =>
        app.createRole.execute(new CreateRole({ tenantId, name: 'Accountant' })),
      );
      const second = await inTenant(tenantId, () =>
        app.createRole.execute(new CreateRole({ tenantId, name: 'Sales' })),
      );

      expect(first.valueOrThrow().id).not.toBe(second.valueOrThrow().id);
    });

    it('refuses a tenant that does not exist, through the published contract', async () => {
      const app = harness();
      const tenantId = randomId();

      const outcome = await inTenant(tenantId, () =>
        app.createRole.execute(new CreateRole({ tenantId, name: 'Accountant' })),
      );

      expect(outcome.isFail()).toBe(true);
      expect(outcome.errorOrThrow().code).toBe('ROLE_TENANT_NOT_FOUND');
      expect(app.roles.addCalls).toBe(0);
    });

    it('refuses an invalid name without persisting', async () => {
      const app = harness();
      const tenantId = existingTenant(app);

      const outcome = await inTenant(tenantId, () =>
        app.createRole.execute(new CreateRole({ tenantId, name: '   ' })),
      );

      expect(outcome.isFail()).toBe(true);
      expect(outcome.errorOrThrow().code).toBe('VALIDATION_FAILED');
      expect(app.roles.addCalls).toBe(0);
    });

    it('requires a valid tenant identity and an established tenant context', async () => {
      const app = harness();
      const tenantId = existingTenant(app);

      const invalid = await inTenant(tenantId, () =>
        app.createRole.execute(new CreateRole({ tenantId: 'not-a-uuid', name: 'Accountant' })),
      );
      expect(invalid.isFail()).toBe(true);
      expect(invalid.errorOrThrow().code).toBe('VALIDATION_FAILED');

      await expect(
        app.createRole.execute(new CreateRole({ tenantId, name: 'Accountant' })),
      ).rejects.toThrow(TenantContextMissingError);
    });

    it('refuses a tenant that is not the scope, answering as not-found', async () => {
      const app = harness();
      const scopeTenant = existingTenant(app);
      const otherTenant = existingTenant(app);

      const outcome = await inTenant(scopeTenant, () =>
        app.createRole.execute(new CreateRole({ tenantId: otherTenant, name: 'Accountant' })),
      );

      expect(outcome.isFail()).toBe(true);
      expect(outcome.errorOrThrow().code).toBe('NOT_FOUND');
    });
  });

  describe('read', () => {
    it('reads a role within its tenant', async () => {
      const app = harness();
      const tenantId = existingTenant(app);
      const role = seedRole(app, tenantId);

      const outcome = await inTenant(tenantId, () =>
        app.getRole.execute(new GetRole({ roleId: role.roleId(), tenantId })),
      );

      expect(outcome.isOk()).toBe(true);
      expect(outcome.valueOrThrow().id).toBe(role.roleId());
    });

    it('does not read a role through another tenant', async () => {
      const app = harness();
      const tenantId = existingTenant(app);
      const otherTenant = existingTenant(app);
      const role = seedRole(app, tenantId);

      const outcome = await inTenant(otherTenant, () =>
        app.getRole.execute(new GetRole({ roleId: role.roleId(), tenantId: otherTenant })),
      );

      expect(outcome.isFail()).toBe(true);
      expect(outcome.errorOrThrow().code).toBe('ROLE_NOT_FOUND');
    });

    it('lists only the roles of the requested tenant', async () => {
      const app = harness();
      const tenantId = existingTenant(app);
      const otherTenant = existingTenant(app);
      seedRole(app, tenantId, 'Accountant');
      seedRole(app, tenantId, 'Sales');
      seedRole(app, otherTenant, 'Foreign');

      const outcome = await inTenant(tenantId, () =>
        app.listRoles.execute(new ListRoles({ tenantId })),
      );

      expect(outcome.isOk()).toBe(true);
      expect(
        outcome
          .valueOrThrow()
          .map((role) => role.name)
          .sort(),
      ).toEqual(['Accountant', 'Sales']);
    });
  });

  describe('rename', () => {
    it('renames the role and records the change', async () => {
      const app = harness();
      const tenantId = existingTenant(app);
      const role = seedRole(app, tenantId);

      const outcome = await inTenant(tenantId, () =>
        app.updateRole.execute(
          new UpdateRole({
            roleId: role.roleId(),
            tenantId,
            name: 'Senior Accountant',
            expectedRevision: 1,
          }),
        ),
      );

      expect(outcome.valueOrThrow().name).toBe('Senior Accountant');
      expect(outcome.valueOrThrow().revision).toBe(2);
      expect(app.events.recorded.at(-1)?.name).toBe('RoleRenamed');
    });

    it('does not write when the name is unchanged, so the revision does not advance', async () => {
      const app = harness();
      const tenantId = existingTenant(app);
      const role = seedRole(app, tenantId, 'Accountant');

      const outcome = await inTenant(tenantId, () =>
        app.updateRole.execute(
          new UpdateRole({
            roleId: role.roleId(),
            tenantId,
            name: 'Accountant',
            expectedRevision: 1,
          }),
        ),
      );

      expect(outcome.valueOrThrow().revision).toBe(1);
      expect(app.roles.updateCalls).toBe(0);
      expect(app.events.recorded).toEqual([]);
    });

    it('refuses a stale revision as a conflict', async () => {
      const app = harness();
      const tenantId = existingTenant(app);
      const role = seedRole(app, tenantId);

      const outcome = await inTenant(tenantId, () =>
        app.updateRole.execute(
          new UpdateRole({
            roleId: role.roleId(),
            tenantId,
            name: 'Renamed',
            expectedRevision: 99,
          }),
        ),
      );

      expect(outcome.errorOrThrow()).toBeInstanceOf(ConflictError);
    });

    it('refuses to change an inactive role', async () => {
      const app = harness();
      const tenantId = existingTenant(app);
      const role = seedRole(app, tenantId);
      await inTenant(tenantId, () =>
        app.changeRoleStatus.execute(
          new ChangeRoleStatus({
            roleId: role.roleId(),
            tenantId,
            status: 'inactive',
            expectedRevision: 1,
          }),
        ),
      );

      const outcome = await inTenant(tenantId, () =>
        app.updateRole.execute(
          new UpdateRole({
            roleId: role.roleId(),
            tenantId,
            name: 'Renamed',
            expectedRevision: 2,
          }),
        ),
      );

      expect(outcome.errorOrThrow().code).toBe('ROLE_INACTIVE');
      expect(outcome.errorOrThrow().category).toBe('STATE_VIOLATION');
    });
  });

  describe('lifecycle', () => {
    it('deactivates and reactivates a role', async () => {
      const app = harness();
      const tenantId = existingTenant(app);
      const role = seedRole(app, tenantId);

      const deactivated = await inTenant(tenantId, () =>
        app.changeRoleStatus.execute(
          new ChangeRoleStatus({
            roleId: role.roleId(),
            tenantId,
            status: 'inactive',
            expectedRevision: 1,
          }),
        ),
      );
      expect(deactivated.valueOrThrow().status).toBe('inactive');
      expect(app.events.recorded.at(-1)?.name).toBe('RoleStatusChanged');

      const reactivated = await inTenant(tenantId, () =>
        app.changeRoleStatus.execute(
          new ChangeRoleStatus({
            roleId: role.roleId(),
            tenantId,
            status: 'active',
            expectedRevision: 2,
          }),
        ),
      );
      expect(reactivated.valueOrThrow().status).toBe('active');
    });

    it('refuses a transition that does not apply from the current state', async () => {
      const app = harness();
      const tenantId = existingTenant(app);
      const role = seedRole(app, tenantId);

      const outcome = await inTenant(tenantId, () =>
        app.changeRoleStatus.execute(
          new ChangeRoleStatus({
            roleId: role.roleId(),
            tenantId,
            status: 'active',
            expectedRevision: 1,
          }),
        ),
      );

      expect(outcome.errorOrThrow().code).toBe('INVALID_ROLE_STATUS_TRANSITION');
    });
  });

  describe('permissions', () => {
    it('grants a known capability, deterministically ordered', async () => {
      const app = harness();
      const tenantId = existingTenant(app);
      const role = seedRole(app, tenantId);

      await inTenant(tenantId, () =>
        app.grantPermission.execute(
          new GrantRolePermission({
            roleId: role.roleId(),
            tenantId,
            permissionKey: 'user.manage',
            expectedRevision: 1,
          }),
        ),
      );
      const outcome = await inTenant(tenantId, () =>
        app.grantPermission.execute(
          new GrantRolePermission({
            roleId: role.roleId(),
            tenantId,
            permissionKey: 'company.read',
            expectedRevision: 2,
          }),
        ),
      );

      expect(outcome.valueOrThrow().permissions).toEqual(['company.read', 'user.manage']);
      expect(app.events.recorded.at(-1)?.name).toBe('RolePermissionGranted');
    });

    it('refuses a duplicate grant as a conflict, counting the capability once', async () => {
      const app = harness();
      const tenantId = existingTenant(app);
      const role = seedRole(app, tenantId);
      await inTenant(tenantId, () =>
        app.grantPermission.execute(
          new GrantRolePermission({
            roleId: role.roleId(),
            tenantId,
            permissionKey: 'company.read',
            expectedRevision: 1,
          }),
        ),
      );

      const outcome = await inTenant(tenantId, () =>
        app.grantPermission.execute(
          new GrantRolePermission({
            roleId: role.roleId(),
            tenantId,
            permissionKey: 'company.read',
            expectedRevision: 2,
          }),
        ),
      );

      expect(outcome.errorOrThrow().code).toBe('DUPLICATE_ROLE_PERMISSION');
      expect(app.roles.stored(role.id)?.permissionCount()).toBe(1);
    });

    it('refuses a capability the catalog does not define', async () => {
      const app = harness();
      const tenantId = existingTenant(app);
      const role = seedRole(app, tenantId);

      const outcome = await inTenant(tenantId, () =>
        app.grantPermission.execute(
          new GrantRolePermission({
            roleId: role.roleId(),
            tenantId,
            permissionKey: 'purchase.create',
            expectedRevision: 1,
          }),
        ),
      );

      expect(outcome.errorOrThrow().code).toBe('UNKNOWN_PERMISSION');
      expect(app.roles.updateCalls).toBe(0);
    });

    it('refuses to grant through another tenant', async () => {
      const app = harness();
      const tenantId = existingTenant(app);
      const otherTenant = existingTenant(app);
      const role = seedRole(app, tenantId);

      const outcome = await inTenant(otherTenant, () =>
        app.grantPermission.execute(
          new GrantRolePermission({
            roleId: role.roleId(),
            tenantId: otherTenant,
            permissionKey: 'company.read',
            expectedRevision: 1,
          }),
        ),
      );

      expect(outcome.errorOrThrow().code).toBe('ROLE_NOT_FOUND');
    });

    it('removes a capability, and refuses one the role does not grant', async () => {
      const app = harness();
      const tenantId = existingTenant(app);
      const role = seedRole(app, tenantId);
      await inTenant(tenantId, () =>
        app.grantPermission.execute(
          new GrantRolePermission({
            roleId: role.roleId(),
            tenantId,
            permissionKey: 'company.read',
            expectedRevision: 1,
          }),
        ),
      );

      const removed = await inTenant(tenantId, () =>
        app.revokePermission.execute(
          new RevokeRolePermission({
            roleId: role.roleId(),
            tenantId,
            permissionKey: 'company.read',
            expectedRevision: 2,
          }),
        ),
      );
      expect(removed.valueOrThrow().permissions).toEqual([]);
      expect(app.events.recorded.at(-1)?.name).toBe('RolePermissionRevoked');

      const again = await inTenant(tenantId, () =>
        app.revokePermission.execute(
          new RevokeRolePermission({
            roleId: role.roleId(),
            tenantId,
            permissionKey: 'company.read',
            expectedRevision: 3,
          }),
        ),
      );
      expect(again.errorOrThrow().code).toBe('ROLE_PERMISSION_NOT_FOUND');
    });
  });

  describe('assign a role to a membership', () => {
    it('assigns a role of the same tenant and records the change', async () => {
      const app = harness();
      const tenantId = existingTenant(app);
      const role = seedRole(app, tenantId);
      const membershipId = seedMembership(app, tenantId);

      const outcome = await inTenant(tenantId, () =>
        app.assignRole.execute(
          new AssignRoleToMembership({
            tenantId,
            membershipId: membershipId.value,
            roleId: role.roleId(),
          }),
        ),
      );

      expect(outcome.isOk()).toBe(true);
      const view = outcome.valueOrThrow();
      expect(view.membershipId).toBe(membershipId.value);
      expect(view.roleId).toBe(role.roleId());
      expect(view.roleName).toBe('Accountant');
      expect(view.status).toBe('active');
      expect(view.revision).toBe(1);
      expect(app.events.recorded.at(-1)?.name).toBe('RoleAssigned');
    });

    it('refuses a role from another tenant as not-found', async () => {
      const app = harness();
      const tenantId = existingTenant(app);
      const otherTenant = existingTenant(app);
      const foreign = seedRole(app, otherTenant, 'Foreign');
      const membershipId = seedMembership(app, tenantId);

      const outcome = await inTenant(tenantId, () =>
        app.assignRole.execute(
          new AssignRoleToMembership({
            tenantId,
            membershipId: membershipId.value,
            roleId: foreign.roleId(),
          }),
        ),
      );

      expect(outcome.isFail()).toBe(true);
      expect(outcome.errorOrThrow().code).toBe('ROLE_NOT_FOUND');
      expect(app.assignments.size).toBe(0);
    });

    it('refuses a membership of another tenant as not-found', async () => {
      const app = harness();
      const tenantId = existingTenant(app);
      const otherTenant = existingTenant(app);
      const role = seedRole(app, tenantId);
      const foreignMembership = seedMembership(app, otherTenant);

      const outcome = await inTenant(tenantId, () =>
        app.assignRole.execute(
          new AssignRoleToMembership({
            tenantId,
            membershipId: foreignMembership.value,
            roleId: role.roleId(),
          }),
        ),
      );

      expect(outcome.errorOrThrow().code).toBe('MEMBERSHIP_NOT_FOUND');
    });

    it('refuses an inactive role, which confers nothing', async () => {
      const app = harness();
      const tenantId = existingTenant(app);
      const role = seedRole(app, tenantId);
      const membershipId = seedMembership(app, tenantId);
      await inTenant(tenantId, () =>
        app.changeRoleStatus.execute(
          new ChangeRoleStatus({
            roleId: role.roleId(),
            tenantId,
            status: 'inactive',
            expectedRevision: 1,
          }),
        ),
      );

      const outcome = await inTenant(tenantId, () =>
        app.assignRole.execute(
          new AssignRoleToMembership({
            tenantId,
            membershipId: membershipId.value,
            roleId: role.roleId(),
          }),
        ),
      );

      expect(outcome.errorOrThrow().code).toBe('ROLE_INACTIVE');
    });

    it('refuses a role the membership already actively holds', async () => {
      const app = harness();
      const tenantId = existingTenant(app);
      const role = seedRole(app, tenantId);
      const membershipId = seedMembership(app, tenantId);

      await inTenant(tenantId, () =>
        app.assignRole.execute(
          new AssignRoleToMembership({
            tenantId,
            membershipId: membershipId.value,
            roleId: role.roleId(),
          }),
        ),
      );
      const outcome = await inTenant(tenantId, () =>
        app.assignRole.execute(
          new AssignRoleToMembership({
            tenantId,
            membershipId: membershipId.value,
            roleId: role.roleId(),
          }),
        ),
      );

      expect(outcome.errorOrThrow().code).toBe('DUPLICATE_ROLE_ASSIGNMENT');
      expect(outcome.errorOrThrow().category).toBe('CONFLICT');
      expect(app.assignments.size).toBe(1);
    });
  });

  describe('remove a role from a membership', () => {
    it('deactivates the assignment and retains it as history', async () => {
      const app = harness();
      const tenantId = existingTenant(app);
      const role = seedRole(app, tenantId);
      const membershipId = seedMembership(app, tenantId);
      const assigned = await inTenant(tenantId, () =>
        app.assignRole.execute(
          new AssignRoleToMembership({
            tenantId,
            membershipId: membershipId.value,
            roleId: role.roleId(),
          }),
        ),
      );

      const outcome = await inTenant(tenantId, () =>
        app.removeRole.execute(
          new RemoveRoleFromMembership({
            tenantId,
            membershipId: membershipId.value,
            assignmentId: assigned.valueOrThrow().id,
            expectedRevision: 1,
          }),
        ),
      );

      expect(outcome.isOk()).toBe(true);
      expect(outcome.valueOrThrow().status).toBe('inactive');
      expect(outcome.valueOrThrow().id).toBe(assigned.valueOrThrow().id);
      expect(app.events.recorded.at(-1)?.name).toBe('RoleUnassigned');

      // The record is deactivated, never deleted.
      expect(app.assignments.size).toBe(1);
    });

    it('refuses to remove a role the membership does not actively hold', async () => {
      const app = harness();
      const tenantId = existingTenant(app);
      const role = seedRole(app, tenantId);
      const membershipId = seedMembership(app, tenantId);
      const assigned = await inTenant(tenantId, () =>
        app.assignRole.execute(
          new AssignRoleToMembership({
            tenantId,
            membershipId: membershipId.value,
            roleId: role.roleId(),
          }),
        ),
      );
      await inTenant(tenantId, () =>
        app.removeRole.execute(
          new RemoveRoleFromMembership({
            tenantId,
            membershipId: membershipId.value,
            assignmentId: assigned.valueOrThrow().id,
            expectedRevision: 1,
          }),
        ),
      );

      const outcome = await inTenant(tenantId, () =>
        app.removeRole.execute(
          new RemoveRoleFromMembership({
            tenantId,
            membershipId: membershipId.value,
            assignmentId: assigned.valueOrThrow().id,
            expectedRevision: 2,
          }),
        ),
      );

      expect(outcome.errorOrThrow().code).toBe('INVALID_ROLE_ASSIGNMENT_TRANSITION');
    });

    it('does not remove an assignment through another tenant', async () => {
      const app = harness();
      const tenantId = existingTenant(app);
      const otherTenant = existingTenant(app);
      const role = seedRole(app, tenantId);
      const membershipId = seedMembership(app, tenantId);
      const assigned = await inTenant(tenantId, () =>
        app.assignRole.execute(
          new AssignRoleToMembership({
            tenantId,
            membershipId: membershipId.value,
            roleId: role.roleId(),
          }),
        ),
      );

      const outcome = await inTenant(otherTenant, () =>
        app.removeRole.execute(
          new RemoveRoleFromMembership({
            tenantId: otherTenant,
            membershipId: membershipId.value,
            assignmentId: assigned.valueOrThrow().id,
            expectedRevision: 1,
          }),
        ),
      );

      expect(outcome.errorOrThrow().code).toBe('MEMBERSHIP_ROLE_NOT_FOUND');
      expect(
        app.assignments.stored(membershipRoleIdFrom(assigned.valueOrThrow().id))?.isActive(),
      ).toBe(true);
    });

    it('reactivates the retained record when the role is assigned again', async () => {
      const app = harness();
      const tenantId = existingTenant(app);
      const role = seedRole(app, tenantId);
      const membershipId = seedMembership(app, tenantId);
      const assigned = await inTenant(tenantId, () =>
        app.assignRole.execute(
          new AssignRoleToMembership({
            tenantId,
            membershipId: membershipId.value,
            roleId: role.roleId(),
          }),
        ),
      );
      await inTenant(tenantId, () =>
        app.removeRole.execute(
          new RemoveRoleFromMembership({
            tenantId,
            membershipId: membershipId.value,
            assignmentId: assigned.valueOrThrow().id,
            expectedRevision: 1,
          }),
        ),
      );

      const reassigned = await inTenant(tenantId, () =>
        app.assignRole.execute(
          new AssignRoleToMembership({
            tenantId,
            membershipId: membershipId.value,
            roleId: role.roleId(),
          }),
        ),
      );

      expect(reassigned.isOk()).toBe(true);
      expect(reassigned.valueOrThrow().id).toBe(assigned.valueOrThrow().id);
      expect(reassigned.valueOrThrow().status).toBe('active');
      expect(app.assignments.size).toBe(1);
    });
  });

  describe('list a membership’s roles', () => {
    it('returns the history — active and removed — with the role’s current name and state', async () => {
      const app = harness();
      const tenantId = existingTenant(app);
      const role = seedRole(app, tenantId);
      const other = seedRole(app, tenantId, 'Sales');
      const membershipId = seedMembership(app, tenantId);
      seedAssignment(app, tenantId, membershipId, role.id);
      seedAssignment(app, tenantId, membershipId, other.id);

      const outcome = await inTenant(tenantId, () =>
        app.listMembershipRoles.execute(
          new ListMembershipRoles({ tenantId, membershipId: membershipId.value }),
        ),
      );

      expect(outcome.isOk()).toBe(true);
      expect(
        outcome
          .valueOrThrow()
          .map((view) => view.roleName)
          .sort(),
      ).toEqual(['Accountant', 'Sales']);
      expect(outcome.valueOrThrow().every((view) => view.status === 'active')).toBe(true);
    });

    it('answers not-found for another tenant’s membership', async () => {
      const app = harness();
      const tenantId = existingTenant(app);
      const otherTenant = existingTenant(app);
      const foreignMembership = seedMembership(app, otherTenant);

      const outcome = await inTenant(tenantId, () =>
        app.listMembershipRoles.execute(
          new ListMembershipRoles({ tenantId, membershipId: foreignMembership.value }),
        ),
      );

      expect(outcome.errorOrThrow().code).toBe('MEMBERSHIP_NOT_FOUND');
    });
  });

  describe('effective permissions', () => {
    /** Creates a role with the given permissions and assigns it, returning the membership. */
    async function appointed(
      app: Harness,
      tenantId: string,
      permissions: string[],
    ): Promise<MembershipId> {
      const role = seedRole(app, tenantId, `Role ${permissions.join('+')}`);
      const membershipId = seedMembership(app, tenantId);
      for (const [index, permission] of permissions.entries()) {
        await inTenant(tenantId, () =>
          app.grantPermission.execute(
            new GrantRolePermission({
              roleId: role.roleId(),
              tenantId,
              permissionKey: permission,
              expectedRevision: index + 1,
            }),
          ),
        );
      }
      await inTenant(tenantId, () =>
        app.assignRole.execute(
          new AssignRoleToMembership({
            tenantId,
            membershipId: membershipId.value,
            roleId: role.roleId(),
          }),
        ),
      );

      return membershipId;
    }

    it('resolves the union of the membership’s active roles, deterministically ordered', async () => {
      const app = harness();
      const tenantId = existingTenant(app);
      const membershipId = await appointed(app, tenantId, ['user.manage', 'company.read']);
      await appointed(app, tenantId, ['role.read']);
      const secondRole = seedRole(app, tenantId, 'Second');
      await inTenant(tenantId, () =>
        app.grantPermission.execute(
          new GrantRolePermission({
            roleId: secondRole.roleId(),
            tenantId,
            permissionKey: 'company.read',
            expectedRevision: 1,
          }),
        ),
      );
      await inTenant(tenantId, () =>
        app.assignRole.execute(
          new AssignRoleToMembership({
            tenantId,
            membershipId: membershipId.value,
            roleId: secondRole.roleId(),
          }),
        ),
      );

      const outcome = await inTenant(tenantId, () =>
        app.effectivePermissions.execute(
          new GetEffectivePermissions({ tenantId, membershipId: membershipId.value }),
        ),
      );

      expect(outcome.isOk()).toBe(true);
      expect(outcome.valueOrThrow().map((permission) => permission.key)).toEqual([
        'company.read',
        'user.manage',
      ]);
      // The catalog supplies the descriptions, so the resolved set is API-ready.
      expect(outcome.valueOrThrow()[0]?.description).toBeTruthy();
    });

    it('drops a permission as soon as it is removed from the role', async () => {
      const app = harness();
      const tenantId = existingTenant(app);
      const membershipId = await appointed(app, tenantId, ['company.read', 'user.read']);
      const role = (
        await inTenant(tenantId, () => app.listRoles.execute(new ListRoles({ tenantId })))
      ).valueOrThrow()[0]!;

      await inTenant(tenantId, () =>
        app.revokePermission.execute(
          new RevokeRolePermission({
            roleId: role.id,
            tenantId,
            permissionKey: 'user.read',
            expectedRevision: 3,
          }),
        ),
      );

      const outcome = await inTenant(tenantId, () =>
        app.effectivePermissions.execute(
          new GetEffectivePermissions({ tenantId, membershipId: membershipId.value }),
        ),
      );

      expect(outcome.valueOrThrow().map((permission) => permission.key)).toEqual(['company.read']);
    });

    it('drops every permission of a removed assignment, and restores them on re-assignment', async () => {
      const app = harness();
      const tenantId = existingTenant(app);
      const membershipId = await appointed(app, tenantId, ['company.read']);
      const assignment = await inTenant(tenantId, () =>
        app.listMembershipRoles.execute(
          new ListMembershipRoles({ tenantId, membershipId: membershipId.value }),
        ),
      );

      await inTenant(tenantId, () =>
        app.removeRole.execute(
          new RemoveRoleFromMembership({
            tenantId,
            membershipId: membershipId.value,
            assignmentId: assignment.valueOrThrow()[0]!.id,
            expectedRevision: 1,
          }),
        ),
      );

      const afterRemoval = await inTenant(tenantId, () =>
        app.effectivePermissions.execute(
          new GetEffectivePermissions({ tenantId, membershipId: membershipId.value }),
        ),
      );
      expect(afterRemoval.valueOrThrow()).toEqual([]);

      await inTenant(tenantId, () =>
        app.assignRole.execute(
          new AssignRoleToMembership({
            tenantId,
            membershipId: membershipId.value,
            roleId: assignment.valueOrThrow()[0]!.roleId,
          }),
        ),
      );

      const afterReassignment = await inTenant(tenantId, () =>
        app.effectivePermissions.execute(
          new GetEffectivePermissions({ tenantId, membershipId: membershipId.value }),
        ),
      );
      expect(afterReassignment.valueOrThrow().map((permission) => permission.key)).toEqual([
        'company.read',
      ]);
    });

    it('contributes nothing for a deactivated role, even while its assignment remains', async () => {
      const app = harness();
      const tenantId = existingTenant(app);
      const membershipId = await appointed(app, tenantId, ['company.read']);
      const role = (
        await inTenant(tenantId, () => app.listRoles.execute(new ListRoles({ tenantId })))
      ).valueOrThrow()[0]!;

      await inTenant(tenantId, () =>
        app.changeRoleStatus.execute(
          new ChangeRoleStatus({
            roleId: role.id,
            tenantId,
            status: 'inactive',
            expectedRevision: 2,
          }),
        ),
      );

      const outcome = await inTenant(tenantId, () =>
        app.effectivePermissions.execute(
          new GetEffectivePermissions({ tenantId, membershipId: membershipId.value }),
        ),
      );

      expect(outcome.valueOrThrow()).toEqual([]);
      // The assignment itself is untouched: the role was deactivated, not removed.
      expect(app.assignments.size).toBe(1);
    });

    it('answers not-found for another tenant’s membership', async () => {
      const app = harness();
      const tenantId = existingTenant(app);
      const otherTenant = existingTenant(app);
      const foreignMembership = seedMembership(app, otherTenant);

      const outcome = await inTenant(tenantId, () =>
        app.effectivePermissions.execute(
          new GetEffectivePermissions({ tenantId, membershipId: foreignMembership.value }),
        ),
      );

      expect(outcome.errorOrThrow().code).toBe('MEMBERSHIP_NOT_FOUND');
    });
  });

  describe('permission catalog', () => {
    it('lists the catalog in a deterministic order without any tenant scope', async () => {
      const app = harness();

      const outcome = await app.listPermissions.execute();

      expect(outcome.isOk()).toBe(true);
      const keys = outcome.valueOrThrow().map((permission) => permission.key);
      // Declaration order, so the list is stable across calls.
      expect(keys).toEqual([
        'company.read',
        'company.update',
        'user.read',
        'user.manage',
        'role.read',
        'role.manage',
      ]);
      expect(app.boundary.executions).toBe(0);
    });
  });
});
