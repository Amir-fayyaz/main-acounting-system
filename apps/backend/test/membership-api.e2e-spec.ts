import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { configureApplication } from '../src/bootstrap.js';
import { AppConfigModule } from '../src/infrastructure/config/app-config.module.js';
import { TRANSACTION_BOUNDARY } from '../src/infrastructure/database/database.tokens.js';
import { ChangeMembershipStatusUseCase } from '../src/modules/identity/application/use-cases/change-membership-status.use-case.js';
import { CreateMembershipUseCase } from '../src/modules/identity/application/use-cases/create-membership.use-case.js';
import { GetMembershipUseCase } from '../src/modules/identity/application/use-cases/get-membership.use-case.js';
import { ListTenantMembersUseCase } from '../src/modules/identity/application/use-cases/list-tenant-members.use-case.js';
import { ListUserMembershipsUseCase } from '../src/modules/identity/application/use-cases/list-user-memberships.use-case.js';
import {
  MEMBERSHIP_EVENT_RECORDER,
  MEMBERSHIP_REPOSITORY,
} from '../src/modules/identity/application/membership.tokens.js';
import type { MembershipEventRecorder } from '../src/modules/identity/application/ports/membership-event-recorder.port.js';
import {
  USER_EVENT_RECORDER,
  USER_REPOSITORY,
} from '../src/modules/identity/application/user.tokens.js';
import type { UserEventRecorder } from '../src/modules/identity/application/ports/user-event-recorder.port.js';
import { ChangeUserStatusUseCase } from '../src/modules/identity/application/use-cases/change-user-status.use-case.js';
import { CreateUserUseCase } from '../src/modules/identity/application/use-cases/create-user.use-case.js';
import { GetUserUseCase } from '../src/modules/identity/application/use-cases/get-user.use-case.js';
import { UpdateUserUseCase } from '../src/modules/identity/application/use-cases/update-user.use-case.js';
import type { MembershipRepository } from '../src/modules/identity/domain/repositories/membership.repository.js';
import type { UserRepository } from '../src/modules/identity/domain/repositories/user.repository.js';
import { MembershipsController } from '../src/modules/identity/presentation/controllers/membership.controller.js';
import { UsersController } from '../src/modules/identity/presentation/controllers/user.controller.js';
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
import { InMemoryTenantRepository, RecordingTenantEvents } from './support/tenant-doubles.js';
import { InMemoryUserRepository, RecordingUserEvents } from './support/user-doubles.js';

/**
 * The Membership resource over the real HTTP boundary (IAM-003; FND-006).
 *
 * These tests compose all three Identity/Tenant resources against in-memory
 * doubles, so the verification flow runs end to end at the HTTP level: create a
 * real User and a real Tenant through their own endpoints, link them, read the
 * user's memberships and the tenant's members, refuse a duplicate, deactivate,
 * and confirm the user and tenant remain intact. Persistence against MySQL is
 * covered separately by `membership-persistence.e2e-spec.ts`.
 *
 * The tenant directory is backed by the in-memory tenant repository, so the
 * published contract answers existence exactly as production would — but the
 * identity code still never touches tenant storage: it only asks the contract.
 */

interface Harness {
  readonly app: INestApplication;
  readonly memberships: InMemoryMembershipRepository;
  readonly membershipEvents: RecordingMembershipEvents;
}

async function createHarness(): Promise<Harness> {
  const memberships = new InMemoryMembershipRepository();
  const users = new InMemoryUserRepository();
  const tenants = new InMemoryTenantRepository();
  const membershipEvents = new RecordingMembershipEvents();
  const userEvents = new RecordingUserEvents();
  const tenantEvents = new RecordingTenantEvents();
  const boundary = new PassthroughTransactionBoundary();

  const directory: TenantDirectory = {
    async exists(tenantId: string): Promise<boolean> {
      return isTenantId(tenantId) && (await tenants.get(tenantIdFrom(tenantId))) !== undefined;
    },
  };

  const moduleRef = await Test.createTestingModule({
    imports: [AppConfigModule],
    controllers: [UsersController, TenantController, MembershipsController],
    providers: [
      { provide: USER_REPOSITORY, useValue: users },
      { provide: USER_EVENT_RECORDER, useValue: userEvents },
      { provide: TENANT_REPOSITORY, useValue: tenants },
      { provide: TENANT_EVENT_RECORDER, useValue: tenantEvents },
      { provide: TENANT_DIRECTORY, useValue: directory },
      { provide: MEMBERSHIP_REPOSITORY, useValue: memberships },
      { provide: MEMBERSHIP_EVENT_RECORDER, useValue: membershipEvents },
      { provide: TRANSACTION_BOUNDARY, useValue: boundary },
      {
        provide: CreateUserUseCase,
        useFactory: (r: UserRepository, e: UserEventRecorder, b: TransactionBoundary) =>
          new CreateUserUseCase(r, e, b),
        inject: [USER_REPOSITORY, USER_EVENT_RECORDER, TRANSACTION_BOUNDARY],
      },
      {
        provide: GetUserUseCase,
        useFactory: (r: UserRepository) => new GetUserUseCase(r),
        inject: [USER_REPOSITORY],
      },
      {
        provide: UpdateUserUseCase,
        useFactory: (r: UserRepository, e: UserEventRecorder, b: TransactionBoundary) =>
          new UpdateUserUseCase(r, e, b),
        inject: [USER_REPOSITORY, USER_EVENT_RECORDER, TRANSACTION_BOUNDARY],
      },
      {
        provide: ChangeUserStatusUseCase,
        useFactory: (r: UserRepository, e: UserEventRecorder, b: TransactionBoundary) =>
          new ChangeUserStatusUseCase(r, e, b),
        inject: [USER_REPOSITORY, USER_EVENT_RECORDER, TRANSACTION_BOUNDARY],
      },
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
    ],
  }).compile();

  const app = moduleRef.createNestApplication();
  configureApplication(app);
  await app.init();

  return { app, memberships, membershipEvents };
}

describe('membership resource (e2e)', () => {
  let app: INestApplication;
  let membershipEvents: RecordingMembershipEvents;

  beforeAll(async () => {
    ({ app, membershipEvents } = await createHarness());
  });

  afterAll(async () => {
    await app.close();
  });

  let emailCounter = 0;
  async function createUser(): Promise<string> {
    emailCounter += 1;
    const response = await request(app.getHttpServer())
      .post('/api/v1/users')
      .send({ displayName: 'Ali Rezaei', email: `ali.${emailCounter}@example.com` })
      .expect(201);

    return response.body.id as string;
  }

  async function createTenant(name = 'Acme Trading Co.'): Promise<string> {
    const response = await request(app.getHttpServer())
      .post('/api/v1/tenants')
      .send({ name })
      .expect(201);

    return response.body.id as string;
  }

  async function createMembership(
    tenantId: string,
    userId: string,
  ): Promise<Record<string, unknown>> {
    const response = await request(app.getHttpServer())
      .post(`/api/v1/tenants/${tenantId}/memberships`)
      .send({ userId })
      .expect(201);

    return response.body as Record<string, unknown>;
  }

  describe('create', () => {
    it('links an existing user and tenant and returns 201', async () => {
      const userId = await createUser();
      const tenantId = await createTenant();

      const response = await request(app.getHttpServer())
        .post(`/api/v1/tenants/${tenantId}/memberships`)
        .send({ userId })
        .expect(201);

      expect(response.body).toMatchObject({ userId, tenantId, status: 'active', revision: 1 });
      expect(response.body.id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
      );
      expect(response.headers['x-correlation-id']).toBeTruthy();
      expect(membershipEvents.recorded.some((event) => event.name === 'MembershipCreated')).toBe(
        true,
      );
      expect(membershipEvents.recorded.some((event) => event.metadata.tenantId === tenantId)).toBe(
        true,
      );
    });

    it('rejects a malformed user id at the boundary', async () => {
      const tenantId = await createTenant();

      const response = await request(app.getHttpServer())
        .post(`/api/v1/tenants/${tenantId}/memberships`)
        .send({ userId: 'not-a-uuid' })
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_FAILED');
    });

    it('answers not-found for an unknown user', async () => {
      const tenantId = await createTenant();

      const response = await request(app.getHttpServer())
        .post(`/api/v1/tenants/${tenantId}/memberships`)
        .send({ userId: '018f0d3c-6d0f-7a4b-9d4e-2b3c4d5e6f70' })
        .expect(404);

      expect(response.body.error.code).toBe('NOT_FOUND');
    });

    it('answers not-found for a tenant that does not exist', async () => {
      const userId = await createUser();

      const response = await request(app.getHttpServer())
        .post('/api/v1/tenants/018f0d3c-6d0f-7a4b-9d4e-2b3c4d5e6f70/memberships')
        .send({ userId })
        .expect(404);

      expect(response.body.error.code).toBe('NOT_FOUND');
    });

    it('refuses a duplicate membership with the conflict contract', async () => {
      const userId = await createUser();
      const tenantId = await createTenant();
      await createMembership(tenantId, userId);

      const response = await request(app.getHttpServer())
        .post(`/api/v1/tenants/${tenantId}/memberships`)
        .send({ userId })
        .expect(409);

      expect(response.body.error).toMatchObject({ code: 'CONFLICT', category: 'client' });
    });

    it('treats a malformed tenant path as not-found', async () => {
      const userId = await createUser();

      await request(app.getHttpServer())
        .post('/api/v1/tenants/not-a-uuid/memberships')
        .send({ userId })
        .expect(404);
    });
  });

  describe('read one', () => {
    it('returns the membership within its tenant', async () => {
      const userId = await createUser();
      const tenantId = await createTenant();
      const created = await createMembership(tenantId, userId);

      const response = await request(app.getHttpServer())
        .get(`/api/v1/tenants/${tenantId}/memberships/${String(created.id)}`)
        .expect(200);

      expect(response.body).toMatchObject({ id: created.id, userId, tenantId, status: 'active' });
    });

    it('does not read a membership through another tenant', async () => {
      const userId = await createUser();
      const tenantId = await createTenant();
      const otherTenant = await createTenant('Other Co.');
      const created = await createMembership(tenantId, userId);

      await request(app.getHttpServer())
        .get(`/api/v1/tenants/${otherTenant}/memberships/${String(created.id)}`)
        .expect(404);
    });
  });

  describe('user memberships', () => {
    it('lists every membership of a user using the pagination envelope', async () => {
      const userId = await createUser();
      const first = await createTenant('First Co.');
      const second = await createTenant('Second Co.');
      await createMembership(first, userId);
      await createMembership(second, userId);

      const response = await request(app.getHttpServer())
        .get(`/api/v1/users/${userId}/memberships`)
        .expect(200);

      expect(response.body.meta).toEqual({ page: 1, limit: 20, total: 2, totalPages: 1 });
      expect(response.body.data).toHaveLength(2);
      expect(
        response.body.data.map((membership: { tenantId: string }) => membership.tenantId).sort(),
      ).toEqual([first, second].sort());
    });

    it('answers not-found for an unknown user', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/users/018f0d3c-6d0f-7a4b-9d4e-2b3c4d5e6f70/memberships')
        .expect(404);
    });
  });

  describe('tenant members', () => {
    it('lists the tenant’s members with current user data', async () => {
      const userId = await createUser();
      const tenantId = await createTenant();
      await createMembership(tenantId, userId);

      const response = await request(app.getHttpServer())
        .get(`/api/v1/tenants/${tenantId}/memberships`)
        .expect(200);

      expect(response.body.meta).toMatchObject({ total: 1 });
      expect(response.body.data[0]).toMatchObject({
        userId,
        displayName: 'Ali Rezaei',
        email: expect.stringContaining('@example.com'),
        status: 'active',
        userStatus: 'active',
      });
    });

    it('does not list members of another tenant', async () => {
      const userId = await createUser();
      const tenantId = await createTenant('Membership Owner Co.');
      const otherTenant = await createTenant('Empty Co.');
      await createMembership(tenantId, userId);

      const response = await request(app.getHttpServer())
        .get(`/api/v1/tenants/${otherTenant}/memberships`)
        .expect(200);

      expect(response.body.data).toHaveLength(0);
    });
  });

  describe('lifecycle', () => {
    it('deactivates a membership and reactivates it', async () => {
      const userId = await createUser();
      const tenantId = await createTenant();
      const created = await createMembership(tenantId, userId);

      const deactivated = await request(app.getHttpServer())
        .post(`/api/v1/tenants/${tenantId}/memberships/${String(created.id)}/status`)
        .send({ status: 'inactive', expectedRevision: 1 })
        .expect(200);
      expect(deactivated.body).toMatchObject({ status: 'inactive', revision: 2 });

      const reactivated = await request(app.getHttpServer())
        .post(`/api/v1/tenants/${tenantId}/memberships/${String(created.id)}/status`)
        .send({ status: 'active', expectedRevision: 2 })
        .expect(200);
      expect(reactivated.body).toMatchObject({ status: 'active', revision: 3 });
    });

    it('leaves the user and the tenant intact after deactivation', async () => {
      const userId = await createUser();
      const tenantId = await createTenant();
      const created = await createMembership(tenantId, userId);

      await request(app.getHttpServer())
        .post(`/api/v1/tenants/${tenantId}/memberships/${String(created.id)}/status`)
        .send({ status: 'inactive', expectedRevision: 1 })
        .expect(200);

      const user = await request(app.getHttpServer()).get(`/api/v1/users/${userId}`).expect(200);
      const tenant = await request(app.getHttpServer())
        .get(`/api/v1/tenants/${tenantId}`)
        .expect(200);

      expect(user.body).toMatchObject({ id: userId, status: 'active' });
      expect(tenant.body).toMatchObject({ id: tenantId, status: 'active' });

      // The relationship is inactive, but it is still there.
      const memberships = await request(app.getHttpServer())
        .get(`/api/v1/users/${userId}/memberships`)
        .expect(200);
      expect(memberships.body.data).toHaveLength(1);
      expect(memberships.body.data[0]).toMatchObject({ status: 'inactive', id: created.id });
    });

    it('rejects an invalid transition as a domain failure', async () => {
      const userId = await createUser();
      const tenantId = await createTenant();
      const created = await createMembership(tenantId, userId);

      const response = await request(app.getHttpServer())
        .post(`/api/v1/tenants/${tenantId}/memberships/${String(created.id)}/status`)
        .send({ status: 'active', expectedRevision: 1 })
        .expect(422);

      expect(response.body.error).toMatchObject({
        code: 'INVALID_MEMBERSHIP_STATUS_TRANSITION',
        category: 'domain',
      });
    });

    it('rejects an unknown status at the boundary', async () => {
      const userId = await createUser();
      const tenantId = await createTenant();
      const created = await createMembership(tenantId, userId);

      await request(app.getHttpServer())
        .post(`/api/v1/tenants/${tenantId}/memberships/${String(created.id)}/status`)
        .send({ status: 'revoked', expectedRevision: 1 })
        .expect(400);
    });

    it('rejects a stale change with the conflict contract and stale-revision detail', async () => {
      const userId = await createUser();
      const tenantId = await createTenant();
      const created = await createMembership(tenantId, userId);
      await request(app.getHttpServer())
        .post(`/api/v1/tenants/${tenantId}/memberships/${String(created.id)}/status`)
        .send({ status: 'inactive', expectedRevision: 1 })
        .expect(200);

      const response = await request(app.getHttpServer())
        .post(`/api/v1/tenants/${tenantId}/memberships/${String(created.id)}/status`)
        .send({ status: 'active', expectedRevision: 1 })
        .expect(409);

      expect(response.body.error).toMatchObject({ code: 'CONFLICT', category: 'client' });
      expect(response.body.error.details.map((detail: { code: string }) => detail.code)).toContain(
        'STALE_REVISION',
      );
    });

    it('does not change a membership through another tenant', async () => {
      const userId = await createUser();
      const tenantId = await createTenant();
      const otherTenant = await createTenant('Other Co.');
      const created = await createMembership(tenantId, userId);

      await request(app.getHttpServer())
        .post(`/api/v1/tenants/${otherTenant}/memberships/${String(created.id)}/status`)
        .send({ status: 'inactive', expectedRevision: 1 })
        .expect(404);
    });
  });

  describe('security posture', () => {
    it('declares the bearer requirement on every protected operation (IAM-006)', async () => {
      const response = await request(app.getHttpServer()).get('/api/docs-json').expect(200);

      const paths = response.body.paths;
      expect(paths['/api/v1/tenants/{tenantId}/memberships'].post.security).toEqual([
        { bearer: [] },
      ]);
      expect(paths['/api/v1/tenants/{tenantId}/memberships'].get.security).toEqual([
        { bearer: [] },
      ]);
      expect(paths['/api/v1/users/{userId}/memberships'].get.security).toEqual([{ bearer: [] }]);
      // The requirement is stated per operation rather than globally, so a
      // future public endpoint cannot inherit it by accident.
      expect(response.body.security).toBeUndefined();
    });

    it('describes no role or permission data on the membership schema', async () => {
      const response = await request(app.getHttpServer()).get('/api/docs-json').expect(200);

      const schema = response.body.components.schemas.MembershipResponseDto;
      expect(Object.keys(schema.properties)).toEqual(
        expect.arrayContaining([
          'id',
          'userId',
          'tenantId',
          'status',
          'createdAt',
          'updatedAt',
          'revision',
        ]),
      );
      expect(Object.keys(schema.properties)).not.toContain('role');
      expect(Object.keys(schema.properties)).not.toContain('permissions');
      expect(Object.keys(schema.properties)).not.toContain('displayName');
    });

    it('ignores a client-supplied tenant header', async () => {
      const userId = await createUser();
      const tenantId = await createTenant();
      const otherTenant = await createTenant('Header Co.');
      const created = await createMembership(tenantId, userId);

      const response = await request(app.getHttpServer())
        .get(`/api/v1/tenants/${tenantId}/memberships/${String(created.id)}`)
        .set('x-tenant-id', otherTenant)
        .expect(200);

      expect(response.body.id).toBe(created.id);
    });
  });
});
