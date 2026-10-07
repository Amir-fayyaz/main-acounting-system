import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { configureApplication } from '../src/bootstrap.js';
import { AppConfigModule } from '../src/infrastructure/config/app-config.module.js';
import { TRANSACTION_BOUNDARY } from '../src/infrastructure/database/database.tokens.js';
import { AssignRoleToMembershipUseCase } from '../src/modules/identity/application/use-cases/assign-role-to-membership.use-case.js';
import { ChangeRoleStatusUseCase } from '../src/modules/identity/application/use-cases/change-role-status.use-case.js';
import { ChangeMembershipStatusUseCase } from '../src/modules/identity/application/use-cases/change-membership-status.use-case.js';
import { CreateMembershipUseCase } from '../src/modules/identity/application/use-cases/create-membership.use-case.js';
import { CreateRoleUseCase } from '../src/modules/identity/application/use-cases/create-role.use-case.js';
import { GetMembershipUseCase } from '../src/modules/identity/application/use-cases/get-membership.use-case.js';
import { GetRoleUseCase } from '../src/modules/identity/application/use-cases/get-role.use-case.js';
import { GrantRolePermissionUseCase } from '../src/modules/identity/application/use-cases/grant-role-permission.use-case.js';
import { ListMembershipRolesUseCase } from '../src/modules/identity/application/use-cases/list-membership-roles.use-case.js';
import { ListPermissionsUseCase } from '../src/modules/identity/application/use-cases/list-permissions.use-case.js';
import { ListRolesUseCase } from '../src/modules/identity/application/use-cases/list-roles.use-case.js';
import { ListTenantMembersUseCase } from '../src/modules/identity/application/use-cases/list-tenant-members.use-case.js';
import { ListUserMembershipsUseCase } from '../src/modules/identity/application/use-cases/list-user-memberships.use-case.js';
import { RemoveRoleFromMembershipUseCase } from '../src/modules/identity/application/use-cases/remove-role-from-membership.use-case.js';
import { ResolveEffectivePermissionsUseCase } from '../src/modules/identity/application/use-cases/resolve-effective-permissions.use-case.js';
import { RevokeRolePermissionUseCase } from '../src/modules/identity/application/use-cases/revoke-role-permission.use-case.js';
import { UpdateRoleUseCase } from '../src/modules/identity/application/use-cases/update-role.use-case.js';
import {
  MEMBERSHIP_EVENT_RECORDER,
  MEMBERSHIP_REPOSITORY,
} from '../src/modules/identity/application/membership.tokens.js';
import type { MembershipEventRecorder } from '../src/modules/identity/application/ports/membership-event-recorder.port.js';
import type { RoleEventRecorder } from '../src/modules/identity/application/ports/role-event-recorder.port.js';
import {
  MEMBERSHIP_ROLE_REPOSITORY,
  ROLE_EVENT_RECORDER,
  ROLE_REPOSITORY,
} from '../src/modules/identity/application/role.tokens.js';
import { USER_REPOSITORY } from '../src/modules/identity/application/user.tokens.js';
import type { MembershipRepository } from '../src/modules/identity/domain/repositories/membership.repository.js';
import type { MembershipRoleRepository } from '../src/modules/identity/domain/repositories/membership-role.repository.js';
import type { RoleRepository } from '../src/modules/identity/domain/repositories/role.repository.js';
import type { UserRepository } from '../src/modules/identity/domain/repositories/user.repository.js';
import { MembershipRolesController } from '../src/modules/identity/presentation/controllers/membership-role.controller.js';
import { MembershipsController } from '../src/modules/identity/presentation/controllers/membership.controller.js';
import { PermissionsController } from '../src/modules/identity/presentation/controllers/permission.controller.js';
import { RolesController } from '../src/modules/identity/presentation/controllers/role.controller.js';
import {
  TENANT_DIRECTORY,
  TENANT_EVENT_RECORDER,
  TENANT_REPOSITORY,
} from '../src/modules/tenant/application/tenant.tokens.js';
import type { TenantEventRecorder } from '../src/modules/tenant/application/ports/tenant-event-recorder.port.js';
import type { TenantDirectory } from '../src/modules/tenant/application/ports/tenant-directory.port.js';
import { ChangeTenantStatusUseCase } from '../src/modules/tenant/application/use-cases/change-tenant-status.use-case.js';
import { CreateTenantUseCase } from '../src/modules/tenant/application/use-cases/create-tenant.use-case.js';
import { GetTenantUseCase } from '../src/modules/tenant/application/use-cases/get-tenant.use-case.js';
import { UpdateTenantUseCase } from '../src/modules/tenant/application/use-cases/update-tenant.use-case.js';
import type { TenantRepository } from '../src/modules/tenant/domain/repositories/tenant.repository.js';
import { isTenantId, tenantIdFrom } from '../src/modules/tenant/domain/value-objects/tenant-id.js';
import { TenantController } from '../src/modules/tenant/presentation/controllers/tenant.controller.js';
import type { TransactionBoundary } from '../src/shared/transaction/transaction-boundary.js';
import {
  InMemoryMembershipRepository,
  PassthroughTransactionBoundary,
  RecordingMembershipEvents,
} from './support/membership-doubles.js';
import {
  InMemoryMembershipRoleRepository,
  InMemoryRoleRepository,
  RecordingRoleEvents,
} from './support/role-doubles.js';
import { InMemoryTenantRepository, RecordingTenantEvents } from './support/tenant-doubles.js';
import { aUser, InMemoryUserRepository } from './support/user-doubles.js';

/**
 * The Role, Permission and Membership-Role resources over the real HTTP boundary
 * (IAM-004; FND-006).
 *
 * These tests compose the tenant, membership and role features against in-memory
 * doubles, so the issue's own verification flow runs end to end at the HTTP
 * level: create a real Tenant, link a real Membership, create a Role inside it,
 * grant it permissions, assign it to the membership, resolve the membership's
 * effective permissions, then remove a permission and remove the role and watch
 * the resolved set change. Cross-tenant role assignment, duplicate grants and the
 * lifecycle are refused through the standard error contract, and the tenant
 * boundary is required for every tenant-scoped operation.
 *
 * Persistence against MySQL is covered separately by
 * `role-persistence.e2e-spec.ts`.
 */

interface Harness {
  readonly app: INestApplication;
  readonly roles: InMemoryRoleRepository;
  readonly assignments: InMemoryMembershipRoleRepository;
  readonly users: InMemoryUserRepository;
  readonly roleEvents: RecordingRoleEvents;
}

async function createHarness(): Promise<Harness> {
  const roles = new InMemoryRoleRepository();
  const assignments = new InMemoryMembershipRoleRepository();
  const memberships = new InMemoryMembershipRepository();
  const tenants = new InMemoryTenantRepository();
  const users = new InMemoryUserRepository();
  const roleEvents = new RecordingRoleEvents();
  const membershipEvents = new RecordingMembershipEvents();
  const tenantEvents = new RecordingTenantEvents();
  const boundary = new PassthroughTransactionBoundary();

  const directory: TenantDirectory = {
    async exists(tenantId: string): Promise<boolean> {
      return isTenantId(tenantId) && (await tenants.get(tenantIdFrom(tenantId))) !== undefined;
    },
  };

  const moduleRef = await Test.createTestingModule({
    imports: [AppConfigModule],
    controllers: [
      TenantController,
      MembershipsController,
      RolesController,
      PermissionsController,
      MembershipRolesController,
    ],
    providers: [
      { provide: TENANT_REPOSITORY, useValue: tenants },
      { provide: USER_REPOSITORY, useValue: users },
      { provide: TENANT_EVENT_RECORDER, useValue: tenantEvents },
      { provide: TENANT_DIRECTORY, useValue: directory },
      { provide: MEMBERSHIP_REPOSITORY, useValue: memberships },
      { provide: MEMBERSHIP_EVENT_RECORDER, useValue: membershipEvents },
      { provide: ROLE_REPOSITORY, useValue: roles },
      { provide: MEMBERSHIP_ROLE_REPOSITORY, useValue: assignments },
      { provide: ROLE_EVENT_RECORDER, useValue: roleEvents },
      { provide: TRANSACTION_BOUNDARY, useValue: boundary },
      {
        provide: CreateTenantUseCase,
        useFactory: (r: TenantRepository, e: TenantEventRecorder, b: TransactionBoundary) =>
          new CreateTenantUseCase(r, e, b),
        inject: [TENANT_REPOSITORY, TENANT_EVENT_RECORDER, TRANSACTION_BOUNDARY],
      },
      {
        provide: GetTenantUseCase,
        useFactory: (r: TenantRepository) => new GetTenantUseCase(r),
        inject: [TENANT_REPOSITORY],
      },
      {
        provide: UpdateTenantUseCase,
        useFactory: (r: TenantRepository, e: TenantEventRecorder, b: TransactionBoundary) =>
          new UpdateTenantUseCase(r, e, b),
        inject: [TENANT_REPOSITORY, TENANT_EVENT_RECORDER, TRANSACTION_BOUNDARY],
      },
      {
        provide: ChangeTenantStatusUseCase,
        useFactory: (r: TenantRepository, e: TenantEventRecorder, b: TransactionBoundary) =>
          new ChangeTenantStatusUseCase(r, e, b),
        inject: [TENANT_REPOSITORY, TENANT_EVENT_RECORDER, TRANSACTION_BOUNDARY],
      },
      {
        provide: CreateMembershipUseCase,
        useFactory: (
          r: MembershipRepository,
          u: UserRepository,
          d: TenantDirectory,
          e: MembershipEventRecorder,
          b: TransactionBoundary,
        ) => new CreateMembershipUseCase(r, u, d, e, b),
        inject: [
          MEMBERSHIP_REPOSITORY,
          USER_REPOSITORY,
          TENANT_DIRECTORY,
          MEMBERSHIP_EVENT_RECORDER,
          TRANSACTION_BOUNDARY,
        ],
      },
      {
        provide: GetMembershipUseCase,
        useFactory: (r: MembershipRepository) => new GetMembershipUseCase(r),
        inject: [MEMBERSHIP_REPOSITORY],
      },
      {
        provide: ListUserMembershipsUseCase,
        useFactory: (r: MembershipRepository, u: UserRepository) =>
          new ListUserMembershipsUseCase(r, u),
        inject: [MEMBERSHIP_REPOSITORY, USER_REPOSITORY],
      },
      {
        provide: ListTenantMembersUseCase,
        useFactory: (r: MembershipRepository, u: UserRepository) =>
          new ListTenantMembersUseCase(r, u),
        inject: [MEMBERSHIP_REPOSITORY, USER_REPOSITORY],
      },
      {
        provide: ChangeMembershipStatusUseCase,
        useFactory: (r: MembershipRepository, e: MembershipEventRecorder, b: TransactionBoundary) =>
          new ChangeMembershipStatusUseCase(r, e, b),
        inject: [MEMBERSHIP_REPOSITORY, MEMBERSHIP_EVENT_RECORDER, TRANSACTION_BOUNDARY],
      },
      {
        provide: CreateRoleUseCase,
        useFactory: (
          r: RoleRepository,
          d: TenantDirectory,
          e: RoleEventRecorder,
          b: TransactionBoundary,
        ) => new CreateRoleUseCase(r, d, e, b),
        inject: [ROLE_REPOSITORY, TENANT_DIRECTORY, ROLE_EVENT_RECORDER, TRANSACTION_BOUNDARY],
      },
      {
        provide: GetRoleUseCase,
        useFactory: (r: RoleRepository) => new GetRoleUseCase(r),
        inject: [ROLE_REPOSITORY],
      },
      {
        provide: ListRolesUseCase,
        useFactory: (r: RoleRepository) => new ListRolesUseCase(r),
        inject: [ROLE_REPOSITORY],
      },
      ListPermissionsUseCase,
      {
        provide: UpdateRoleUseCase,
        useFactory: (r: RoleRepository, e: RoleEventRecorder, b: TransactionBoundary) =>
          new UpdateRoleUseCase(r, e, b),
        inject: [ROLE_REPOSITORY, ROLE_EVENT_RECORDER, TRANSACTION_BOUNDARY],
      },
      {
        provide: ChangeRoleStatusUseCase,
        useFactory: (r: RoleRepository, e: RoleEventRecorder, b: TransactionBoundary) =>
          new ChangeRoleStatusUseCase(r, e, b),
        inject: [ROLE_REPOSITORY, ROLE_EVENT_RECORDER, TRANSACTION_BOUNDARY],
      },
      {
        provide: GrantRolePermissionUseCase,
        useFactory: (r: RoleRepository, e: RoleEventRecorder, b: TransactionBoundary) =>
          new GrantRolePermissionUseCase(r, e, b),
        inject: [ROLE_REPOSITORY, ROLE_EVENT_RECORDER, TRANSACTION_BOUNDARY],
      },
      {
        provide: RevokeRolePermissionUseCase,
        useFactory: (r: RoleRepository, e: RoleEventRecorder, b: TransactionBoundary) =>
          new RevokeRolePermissionUseCase(r, e, b),
        inject: [ROLE_REPOSITORY, ROLE_EVENT_RECORDER, TRANSACTION_BOUNDARY],
      },
      {
        provide: AssignRoleToMembershipUseCase,
        useFactory: (
          m: MembershipRepository,
          r: RoleRepository,
          a: MembershipRoleRepository,
          e: RoleEventRecorder,
          b: TransactionBoundary,
        ) => new AssignRoleToMembershipUseCase(m, r, a, e, b),
        inject: [
          MEMBERSHIP_REPOSITORY,
          ROLE_REPOSITORY,
          MEMBERSHIP_ROLE_REPOSITORY,
          ROLE_EVENT_RECORDER,
          TRANSACTION_BOUNDARY,
        ],
      },
      {
        provide: RemoveRoleFromMembershipUseCase,
        useFactory: (
          a: MembershipRoleRepository,
          r: RoleRepository,
          e: RoleEventRecorder,
          b: TransactionBoundary,
        ) => new RemoveRoleFromMembershipUseCase(a, r, e, b),
        inject: [
          MEMBERSHIP_ROLE_REPOSITORY,
          ROLE_REPOSITORY,
          ROLE_EVENT_RECORDER,
          TRANSACTION_BOUNDARY,
        ],
      },
      {
        provide: ListMembershipRolesUseCase,
        useFactory: (m: MembershipRepository, a: MembershipRoleRepository, r: RoleRepository) =>
          new ListMembershipRolesUseCase(m, a, r),
        inject: [MEMBERSHIP_REPOSITORY, MEMBERSHIP_ROLE_REPOSITORY, ROLE_REPOSITORY],
      },
      {
        provide: ResolveEffectivePermissionsUseCase,
        useFactory: (m: MembershipRepository, a: MembershipRoleRepository, r: RoleRepository) =>
          new ResolveEffectivePermissionsUseCase(m, a, r),
        inject: [MEMBERSHIP_REPOSITORY, MEMBERSHIP_ROLE_REPOSITORY, ROLE_REPOSITORY],
      },
    ],
  }).compile();

  const app = moduleRef.createNestApplication();
  configureApplication(app);
  await app.init();

  return { app, roles, assignments, users, roleEvents };
}

describe('role and permission resources (e2e)', () => {
  let app: INestApplication;
  let assignments: InMemoryMembershipRoleRepository;
  let users: InMemoryUserRepository;
  let roleEvents: RecordingRoleEvents;

  beforeAll(async () => {
    ({ app, assignments, users, roleEvents } = await createHarness());
  });

  afterAll(async () => {
    await app.close();
  });

  let counter = 0;

  async function createTenant(name = 'Acme Trading Co.'): Promise<string> {
    const response = await request(app.getHttpServer())
      .post('/api/v1/tenants')
      .send({ name })
      .expect(201);

    return response.body.id as string;
  }

  async function createMembership(tenantId: string): Promise<string> {
    counter += 1;
    const user = aUser('Ali Rezaei', `ali.${counter}@example.com`);
    users.seed(user);

    const response = await request(app.getHttpServer())
      .post(`/api/v1/tenants/${tenantId}/memberships`)
      .send({ userId: user.id.value })
      .expect(201);

    return response.body.id as string;
  }

  async function createRole(
    tenantId: string,
    name = 'Accountant',
  ): Promise<Record<string, unknown>> {
    const response = await request(app.getHttpServer())
      .post(`/api/v1/tenants/${tenantId}/roles`)
      .send({ name })
      .expect(201);

    return response.body as Record<string, unknown>;
  }

  async function grant(
    tenantId: string,
    roleId: string,
    permissionKey: string,
    expectedRevision: number,
  ): Promise<Record<string, unknown>> {
    const response = await request(app.getHttpServer())
      .post(`/api/v1/tenants/${tenantId}/roles/${roleId}/permissions`)
      .send({ permissionKey, expectedRevision })
      .expect(200);

    return response.body as Record<string, unknown>;
  }

  describe('permission catalog', () => {
    it('lists the platform capabilities in the standard envelope', async () => {
      const response = await request(app.getHttpServer()).get('/api/v1/permissions').expect(200);

      expect(response.body.meta).toEqual({ page: 1, limit: 20, total: 6, totalPages: 1 });
      expect(response.body.data.map((permission: { key: string }) => permission.key)).toContain(
        'company.read',
      );
      expect(response.body.data[0]).toMatchObject({
        key: expect.any(String),
        description: expect.any(String),
      });
    });
  });

  describe('role creation and reads', () => {
    it('creates an active, empty role inside a tenant and lists it', async () => {
      const tenantId = await createTenant();

      const created = await createRole(tenantId, 'Accountant');
      expect(created).toMatchObject({
        tenantId,
        name: 'Accountant',
        status: 'active',
        permissions: [],
        revision: 1,
      });
      expect(created.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
      expect(roleEvents.recorded.some((event) => event.name === 'RoleCreated')).toBe(true);
      expect(roleEvents.recorded.some((event) => event.metadata.tenantId === tenantId)).toBe(true);

      const list = await request(app.getHttpServer())
        .get(`/api/v1/tenants/${tenantId}/roles`)
        .expect(200);
      expect(list.body.meta).toMatchObject({ total: 1 });
      expect(list.body.data[0]).toMatchObject({ id: created.id, name: 'Accountant' });

      const read = await request(app.getHttpServer())
        .get(`/api/v1/tenants/${tenantId}/roles/${String(created.id)}`)
        .expect(200);
      expect(read.body.id).toBe(created.id);
    });

    it('rejects a blank name at the boundary', async () => {
      const tenantId = await createTenant();

      await request(app.getHttpServer())
        .post(`/api/v1/tenants/${tenantId}/roles`)
        .send({ name: '' })
        .expect(400);
    });

    it('answers not-found for a tenant that does not exist', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/tenants/018f0d3c-6d0f-7a4b-9d4e-2b3c4d5e6f70/roles')
        .send({ name: 'Accountant' })
        .expect(404);
    });

    it('does not read a role through another tenant', async () => {
      const tenantId = await createTenant();
      const otherTenant = await createTenant('Other Co.');
      const created = await createRole(tenantId);

      await request(app.getHttpServer())
        .get(`/api/v1/tenants/${otherTenant}/roles/${String(created.id)}`)
        .expect(404);
    });

    it('cannot create a role without a usable tenant boundary', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/tenants/not-a-uuid/roles')
        .send({ name: 'Accountant' })
        .expect(404);
    });
  });

  describe('role permissions', () => {
    it('grants and removes a capability, refusing a duplicate', async () => {
      const tenantId = await createTenant();
      const role = await createRole(tenantId);

      const granted = await grant(tenantId, String(role.id), 'company.read', 1);
      expect(granted.permissions).toEqual(['company.read']);
      expect(granted.revision).toBe(2);

      const duplicate = await request(app.getHttpServer())
        .post(`/api/v1/tenants/${tenantId}/roles/${String(role.id)}/permissions`)
        .send({ permissionKey: 'company.read', expectedRevision: 2 })
        .expect(409);
      expect(duplicate.body.error).toMatchObject({ code: 'CONFLICT', category: 'client' });

      const removed = await request(app.getHttpServer())
        .post(`/api/v1/tenants/${tenantId}/roles/${String(role.id)}/permissions/remove`)
        .send({ permissionKey: 'company.read', expectedRevision: 2 })
        .expect(200);
      expect(removed.body.permissions).toEqual([]);
    });

    it('refuses a capability the catalog does not define', async () => {
      const tenantId = await createTenant();
      const role = await createRole(tenantId);

      const response = await request(app.getHttpServer())
        .post(`/api/v1/tenants/${tenantId}/roles/${String(role.id)}/permissions`)
        .send({ permissionKey: 'purchase.create', expectedRevision: 1 })
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_FAILED');
    });

    it('refuses a stale revision with the conflict contract', async () => {
      const tenantId = await createTenant();
      const role = await createRole(tenantId);
      await grant(tenantId, String(role.id), 'company.read', 1);

      const response = await request(app.getHttpServer())
        .post(`/api/v1/tenants/${tenantId}/roles/${String(role.id)}/permissions`)
        .send({ permissionKey: 'user.read', expectedRevision: 1 })
        .expect(409);

      expect(response.body.error).toMatchObject({ code: 'CONFLICT', category: 'client' });
      expect(response.body.error.details.map((detail: { code: string }) => detail.code)).toContain(
        'STALE_REVISION',
      );
    });
  });

  describe('role lifecycle', () => {
    it('deactivates and reactivates a role', async () => {
      const tenantId = await createTenant();
      const role = await createRole(tenantId);

      const deactivated = await request(app.getHttpServer())
        .post(`/api/v1/tenants/${tenantId}/roles/${String(role.id)}/status`)
        .send({ status: 'inactive', expectedRevision: 1 })
        .expect(200);
      expect(deactivated.body).toMatchObject({ status: 'inactive', revision: 2 });

      const reactivated = await request(app.getHttpServer())
        .post(`/api/v1/tenants/${tenantId}/roles/${String(role.id)}/status`)
        .send({ status: 'active', expectedRevision: 2 })
        .expect(200);
      expect(reactivated.body).toMatchObject({ status: 'active', revision: 3 });
    });

    it('refuses an illegal transition and an unknown status', async () => {
      const tenantId = await createTenant();
      const role = await createRole(tenantId);

      const illegal = await request(app.getHttpServer())
        .post(`/api/v1/tenants/${tenantId}/roles/${String(role.id)}/status`)
        .send({ status: 'active', expectedRevision: 1 })
        .expect(422);
      expect(illegal.body.error).toMatchObject({
        code: 'INVALID_ROLE_STATUS_TRANSITION',
        category: 'domain',
      });

      await request(app.getHttpServer())
        .post(`/api/v1/tenants/${tenantId}/roles/${String(role.id)}/status`)
        .send({ status: 'archived', expectedRevision: 1 })
        .expect(400);
    });
  });

  describe('assigning roles to memberships', () => {
    it('assigns a role of the same tenant, lists it and removes it', async () => {
      const tenantId = await createTenant();
      const membershipId = await createMembership(tenantId);
      const role = await createRole(tenantId);

      const assigned = await request(app.getHttpServer())
        .post(`/api/v1/tenants/${tenantId}/memberships/${membershipId}/roles`)
        .send({ roleId: role.id })
        .expect(201);
      expect(assigned.body).toMatchObject({
        membershipId,
        roleId: role.id,
        roleName: 'Accountant',
        roleStatus: 'active',
        status: 'active',
        revision: 1,
      });

      const list = await request(app.getHttpServer())
        .get(`/api/v1/tenants/${tenantId}/memberships/${membershipId}/roles`)
        .expect(200);
      expect(list.body.meta).toMatchObject({ total: 1 });
      expect(list.body.data[0]).toMatchObject({ id: assigned.body.id, status: 'active' });

      const removed = await request(app.getHttpServer())
        .post(
          `/api/v1/tenants/${tenantId}/memberships/${membershipId}/roles/${String(assigned.body.id)}/remove`,
        )
        .send({ expectedRevision: 1 })
        .expect(200);
      expect(removed.body).toMatchObject({ status: 'inactive', revision: 2 });

      // Removal is a deactivation: the assignment remains as history.
      const history = await request(app.getHttpServer())
        .get(`/api/v1/tenants/${tenantId}/memberships/${membershipId}/roles`)
        .expect(200);
      expect(history.body.meta).toMatchObject({ total: 1 });
      expect(history.body.data[0]).toMatchObject({ status: 'inactive' });
    });

    it('refuses a role from another tenant as not-found', async () => {
      const tenantId = await createTenant();
      const otherTenant = await createTenant('Other Co.');
      const membershipId = await createMembership(tenantId);
      const foreignRole = await createRole(otherTenant, 'Foreign');
      const before = assignments.size;

      const response = await request(app.getHttpServer())
        .post(`/api/v1/tenants/${tenantId}/memberships/${membershipId}/roles`)
        .send({ roleId: foreignRole.id })
        .expect(404);

      expect(response.body.error.code).toBe('NOT_FOUND');
      expect(assignments.size).toBe(before);
    });

    it('refuses a duplicate assignment', async () => {
      const tenantId = await createTenant();
      const membershipId = await createMembership(tenantId);
      const role = await createRole(tenantId);
      const before = assignments.size;

      await request(app.getHttpServer())
        .post(`/api/v1/tenants/${tenantId}/memberships/${membershipId}/roles`)
        .send({ roleId: role.id })
        .expect(201);
      expect(assignments.size).toBe(before + 1);

      const response = await request(app.getHttpServer())
        .post(`/api/v1/tenants/${tenantId}/memberships/${membershipId}/roles`)
        .send({ roleId: role.id })
        .expect(409);

      expect(response.body.error).toMatchObject({ code: 'CONFLICT', category: 'client' });
      expect(assignments.size).toBe(before + 1);
    });

    it('refuses an inactive role', async () => {
      const tenantId = await createTenant();
      const membershipId = await createMembership(tenantId);
      const role = await createRole(tenantId);
      await request(app.getHttpServer())
        .post(`/api/v1/tenants/${tenantId}/roles/${String(role.id)}/status`)
        .send({ status: 'inactive', expectedRevision: 1 })
        .expect(200);

      const response = await request(app.getHttpServer())
        .post(`/api/v1/tenants/${tenantId}/memberships/${membershipId}/roles`)
        .send({ roleId: role.id })
        .expect(422);

      expect(response.body.error.code).toBe('ROLE_INACTIVE');
    });
  });

  describe('effective permissions', () => {
    it('resolves the membership’s effective set and updates as access changes', async () => {
      const tenantId = await createTenant();
      const membershipId = await createMembership(tenantId);
      const role = await createRole(tenantId);
      await grant(tenantId, String(role.id), 'company.read', 1);
      await grant(tenantId, String(role.id), 'user.read', 2);
      await request(app.getHttpServer())
        .post(`/api/v1/tenants/${tenantId}/memberships/${membershipId}/roles`)
        .send({ roleId: role.id })
        .expect(201);

      const resolved = await request(app.getHttpServer())
        .get(`/api/v1/tenants/${tenantId}/memberships/${membershipId}/effective-permissions`)
        .expect(200);
      expect(resolved.body.data.map((permission: { key: string }) => permission.key)).toEqual([
        'company.read',
        'user.read',
      ]);
      expect(resolved.body.data[0].description).toBeTruthy();

      // Removing a permission updates the effective set immediately.
      await request(app.getHttpServer())
        .post(`/api/v1/tenants/${tenantId}/roles/${String(role.id)}/permissions/remove`)
        .send({ permissionKey: 'user.read', expectedRevision: 3 })
        .expect(200);

      const afterRevoke = await request(app.getHttpServer())
        .get(`/api/v1/tenants/${tenantId}/memberships/${membershipId}/effective-permissions`)
        .expect(200);
      expect(afterRevoke.body.data.map((permission: { key: string }) => permission.key)).toEqual([
        'company.read',
      ]);

      // Removing the role empties it, while the assignment history remains.
      const assignmentsList = await request(app.getHttpServer())
        .get(`/api/v1/tenants/${tenantId}/memberships/${membershipId}/roles`)
        .expect(200);
      await request(app.getHttpServer())
        .post(
          `/api/v1/tenants/${tenantId}/memberships/${membershipId}/roles/${String(assignmentsList.body.data[0].id)}/remove`,
        )
        .send({ expectedRevision: 1 })
        .expect(200);

      const afterRemoval = await request(app.getHttpServer())
        .get(`/api/v1/tenants/${tenantId}/memberships/${membershipId}/effective-permissions`)
        .expect(200);
      expect(afterRemoval.body.data).toEqual([]);
    });

    it('contributes nothing for a deactivated role, and restores it on reactivation', async () => {
      const tenantId = await createTenant();
      const membershipId = await createMembership(tenantId);
      const role = await createRole(tenantId);
      await grant(tenantId, String(role.id), 'role.read', 1);
      await request(app.getHttpServer())
        .post(`/api/v1/tenants/${tenantId}/memberships/${membershipId}/roles`)
        .send({ roleId: role.id })
        .expect(201);

      await request(app.getHttpServer())
        .post(`/api/v1/tenants/${tenantId}/roles/${String(role.id)}/status`)
        .send({ status: 'inactive', expectedRevision: 2 })
        .expect(200);

      const deactivated = await request(app.getHttpServer())
        .get(`/api/v1/tenants/${tenantId}/memberships/${membershipId}/effective-permissions`)
        .expect(200);
      expect(deactivated.body.data).toEqual([]);

      await request(app.getHttpServer())
        .post(`/api/v1/tenants/${tenantId}/roles/${String(role.id)}/status`)
        .send({ status: 'active', expectedRevision: 3 })
        .expect(200);

      const reactivated = await request(app.getHttpServer())
        .get(`/api/v1/tenants/${tenantId}/memberships/${membershipId}/effective-permissions`)
        .expect(200);
      expect(reactivated.body.data.map((permission: { key: string }) => permission.key)).toEqual([
        'role.read',
      ]);
    });

    it('answers not-found for another tenant’s membership', async () => {
      const tenantId = await createTenant();
      const otherTenant = await createTenant('Other Co.');
      const membershipId = await createMembership(tenantId);

      await request(app.getHttpServer())
        .get(`/api/v1/tenants/${otherTenant}/memberships/${membershipId}/effective-permissions`)
        .expect(404);
    });
  });

  describe('security posture', () => {
    it('declares the bearer requirement on every protected operation (IAM-006)', async () => {
      const response = await request(app.getHttpServer()).get('/api/docs-json').expect(200);
      const paths = response.body.paths;

      expect(paths['/api/v1/tenants/{tenantId}/roles'].post.security).toEqual([{ bearer: [] }]);
      expect(paths['/api/v1/tenants/{tenantId}/roles'].get.security).toEqual([{ bearer: [] }]);
      expect(paths['/api/v1/permissions'].get.security).toEqual([{ bearer: [] }]);
      expect(
        paths['/api/v1/tenants/{tenantId}/memberships/{membershipId}/roles'].post.security,
      ).toEqual([{ bearer: [] }]);
      expect(
        paths['/api/v1/tenants/{tenantId}/memberships/{membershipId}/effective-permissions'].get
          .security,
      ).toEqual([{ bearer: [] }]);
      // The requirement is stated per operation rather than globally, so a
      // future public endpoint cannot inherit it by accident.
      expect(response.body.security).toBeUndefined();
    });

    it('proves the role data is free of user identity', async () => {
      const response = await request(app.getHttpServer()).get('/api/docs-json').expect(200);

      const schema = response.body.components.schemas.RoleResponseDto;
      expect(Object.keys(schema.properties)).toEqual(
        expect.arrayContaining([
          'id',
          'tenantId',
          'name',
          'status',
          'permissions',
          'createdAt',
          'updatedAt',
          'revision',
        ]),
      );
      for (const forbidden of ['userId', 'email', 'displayName', 'password']) {
        expect(Object.keys(schema.properties)).not.toContain(forbidden);
      }
    });

    it('ignores a client-supplied tenant header', async () => {
      const tenantId = await createTenant();
      const otherTenant = await createTenant('Header Co.');
      const role = await createRole(tenantId);

      const response = await request(app.getHttpServer())
        .get(`/api/v1/tenants/${tenantId}/roles/${String(role.id)}`)
        .set('x-tenant-id', otherTenant)
        .expect(200);

      expect(response.body.id).toBe(role.id);
    });
  });
});
