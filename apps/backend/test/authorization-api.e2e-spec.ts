import { randomUUID } from 'node:crypto';

import { Controller, Get, type INestApplication } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { AppModule } from '../src/app.module.js';
import { configureApplication } from '../src/bootstrap.js';
import { AppConfigModule } from '../src/infrastructure/config/app-config.module.js';
import { TRANSACTION_BOUNDARY } from '../src/infrastructure/database/database.tokens.js';
import {
  AUTHENTICATION_AUDIT_RECORDER,
  AUTH_SESSION_REPOSITORY,
  SESSION_TOKEN_SERVICE,
} from '../src/modules/identity/application/authentication.tokens.js';
import { AUTHORIZATION } from '../src/modules/identity/application/authorization/authorization.tokens.js';
import {
  MEMBERSHIP_EVENT_RECORDER,
  MEMBERSHIP_REPOSITORY,
} from '../src/modules/identity/application/membership.tokens.js';
import type { Authorization } from '../src/modules/identity/application/ports/authorization.port.js';
import {
  MEMBERSHIP_ROLE_REPOSITORY,
  ROLE_REPOSITORY,
} from '../src/modules/identity/application/role.tokens.js';
import {
  USER_EVENT_RECORDER,
  USER_REPOSITORY,
} from '../src/modules/identity/application/user.tokens.js';
import { AuthSession } from '../src/modules/identity/domain/aggregates/auth-session.js';
import { Membership } from '../src/modules/identity/domain/aggregates/membership.js';
import { MembershipRole } from '../src/modules/identity/domain/aggregates/membership-role.js';
import { Role } from '../src/modules/identity/domain/aggregates/role.js';
import { User } from '../src/modules/identity/domain/aggregates/user.js';
import { PermissionKey } from '../src/modules/identity/domain/value-objects/permission-key.js';
import { RoleName } from '../src/modules/identity/domain/value-objects/role-name.js';
import { tenantReferenceFrom } from '../src/modules/identity/domain/value-objects/tenant-reference.js';
import { GetAuthenticatedSessionUseCase } from '../src/modules/identity/application/use-cases/get-authenticated-session.use-case.js';
import { ListPermissionsUseCase } from '../src/modules/identity/application/use-cases/list-permissions.use-case.js';
import { AuthorizeActionUseCase } from '../src/modules/identity/application/use-cases/authorize-action.use-case.js';
import { ChangeMembershipStatusUseCase } from '../src/modules/identity/application/use-cases/change-membership-status.use-case.js';
import { CreateMembershipUseCase } from '../src/modules/identity/application/use-cases/create-membership.use-case.js';
import { GetMembershipUseCase } from '../src/modules/identity/application/use-cases/get-membership.use-case.js';
import { ListTenantMembersUseCase } from '../src/modules/identity/application/use-cases/list-tenant-members.use-case.js';
import { ListUserMembershipsUseCase } from '../src/modules/identity/application/use-cases/list-user-memberships.use-case.js';
import { ChangeUserStatusUseCase } from '../src/modules/identity/application/use-cases/change-user-status.use-case.js';
import { CreateUserUseCase } from '../src/modules/identity/application/use-cases/create-user.use-case.js';
import { GetUserUseCase } from '../src/modules/identity/application/use-cases/get-user.use-case.js';
import { UpdateUserUseCase } from '../src/modules/identity/application/use-cases/update-user.use-case.js';
import { MembershipsController } from '../src/modules/identity/presentation/controllers/membership.controller.js';
import { PermissionsController } from '../src/modules/identity/presentation/controllers/permission.controller.js';
import { UsersController } from '../src/modules/identity/presentation/controllers/user.controller.js';
import { AuthorizationGuard } from '../src/modules/identity/presentation/guards/authorization.guard.js';
import { CryptoSessionTokenService } from '../src/modules/identity/infrastructure/security/crypto-session-token-service.js';
import { TENANT_DIRECTORY } from '../src/modules/tenant/application/tenant.tokens.js';
import { DateTime } from '../src/shared/time/date-time.js';
import {
  InMemoryMembershipRepository,
  PassthroughTransactionBoundary,
  RecordingMembershipEvents,
  StubTenantDirectory,
} from './support/membership-doubles.js';
import {
  InMemoryMembershipRoleRepository,
  InMemoryRoleRepository,
} from './support/role-doubles.js';
import { InMemoryUserRepository, RecordingUserEvents } from './support/user-doubles.js';
import {
  InMemoryAuthSessionRepository,
  RecordingAuthenticationAudit,
} from './support/authentication-doubles.js';

/**
 * Authorization over the real HTTP boundary (IAM-006; FND-006).
 *
 * These tests compose the real controllers, the real use cases, the real
 * authorization contract and the real **global** authorization guard, over
 * in-memory repositories. That is the whole point of the file: the enforcement
 * under test is the one the process installs, not a stand-in applied by the
 * test.
 *
 * They pin the acceptance criteria end to end:
 *
 * - an authenticated caller holding the capability succeeds;
 * - a caller without it is refused (403) and the protected action never runs;
 * - an unauthenticated caller is refused differently (401) — authentication and
 *   authorization stay tellable apart;
 * - a tenant-scoped operation requires a valid tenant context and an active
 *   membership in *that* tenant;
 * - a forged tenant identifier degrades to "no membership", so the boundary
 *   cannot be used to probe another tenant;
 * - the same authorization contract, invoked from the application layer,
 *   reaches the same decision the HTTP boundary did.
 */

const TENANT_A = '018f0d3c-6d0f-7a4b-9d4e-2b3c4d5e6f70';
const TENANT_B = '018f0d3c-6d0f-7a4b-9d4e-2b3c4d5e6f71';

/**
 * A test-only route that classifies itself as **nothing**: it declares no
 * `@Public()`, no `@RequiresAuthentication()` and no `@Authorize(...)`.
 *
 * It owns no business behaviour and returns nothing — its only purpose is to
 * prove that the boundary's default is denial rather than silence, which is a
 * property of the guard that no real endpoint can demonstrate (every real
 * endpoint correctly declares what it needs).
 */
@Controller('authorization-probe')
class UnclassifiedProbeController {
  @Get()
  probe(): { readonly reached: true } {
    return { reached: true };
  }
}

interface Harness {
  readonly app: INestApplication;
  readonly users: InMemoryUserRepository;
  readonly memberships: InMemoryMembershipRepository;
  readonly assignments: InMemoryMembershipRoleRepository;
  readonly roles: InMemoryRoleRepository;
  readonly tokens: CryptoSessionTokenService;
  readonly sessions: InMemoryAuthSessionRepository;
  readonly authorization: Authorization;
}

async function createHarness(): Promise<Harness> {
  const users = new InMemoryUserRepository();
  const memberships = new InMemoryMembershipRepository();
  const assignments = new InMemoryMembershipRoleRepository();
  const roles = new InMemoryRoleRepository();
  const tenants = new StubTenantDirectory([TENANT_A, TENANT_B]);
  const userEvents = new RecordingUserEvents();
  const membershipEvents = new RecordingMembershipEvents();
  const boundary = new PassthroughTransactionBoundary();
  const tokens = new CryptoSessionTokenService();
  const sessions = new InMemoryAuthSessionRepository();
  const audit = new RecordingAuthenticationAudit();

  const moduleRef = await Test.createTestingModule({
    imports: [AppConfigModule],
    controllers: [
      UsersController,
      MembershipsController,
      PermissionsController,
      UnclassifiedProbeController,
    ],
    providers: [
      { provide: USER_REPOSITORY, useValue: users },
      { provide: USER_EVENT_RECORDER, useValue: userEvents },
      { provide: MEMBERSHIP_REPOSITORY, useValue: memberships },
      { provide: MEMBERSHIP_EVENT_RECORDER, useValue: membershipEvents },
      { provide: ROLE_REPOSITORY, useValue: roles },
      { provide: MEMBERSHIP_ROLE_REPOSITORY, useValue: assignments },
      { provide: TENANT_DIRECTORY, useValue: tenants },
      { provide: TRANSACTION_BOUNDARY, useValue: boundary },
      { provide: AUTH_SESSION_REPOSITORY, useValue: sessions },
      { provide: SESSION_TOKEN_SERVICE, useValue: tokens },
      { provide: AUTHENTICATION_AUDIT_RECORDER, useValue: audit },
      {
        provide: AUTHORIZATION,
        useFactory: (
          u: InMemoryUserRepository,
          m: InMemoryMembershipRepository,
          a: InMemoryMembershipRoleRepository,
          r: InMemoryRoleRepository,
        ): Authorization => new AuthorizeActionUseCase(u, m, a, r),
        inject: [
          USER_REPOSITORY,
          MEMBERSHIP_REPOSITORY,
          MEMBERSHIP_ROLE_REPOSITORY,
          ROLE_REPOSITORY,
        ],
      },
      {
        provide: CreateUserUseCase,
        useFactory: () => new CreateUserUseCase(users, userEvents, boundary),
      },
      { provide: GetUserUseCase, useFactory: () => new GetUserUseCase(users) },
      {
        provide: UpdateUserUseCase,
        useFactory: () => new UpdateUserUseCase(users, userEvents, boundary),
      },
      {
        provide: ChangeUserStatusUseCase,
        useFactory: () => new ChangeUserStatusUseCase(users, userEvents, boundary),
      },
      {
        provide: CreateMembershipUseCase,
        useFactory: () =>
          new CreateMembershipUseCase(memberships, users, tenants, membershipEvents, boundary),
      },
      { provide: GetMembershipUseCase, useFactory: () => new GetMembershipUseCase(memberships) },
      {
        provide: ListUserMembershipsUseCase,
        useFactory: () => new ListUserMembershipsUseCase(memberships, users),
      },
      {
        provide: ListTenantMembersUseCase,
        useFactory: () => new ListTenantMembersUseCase(memberships, users),
      },
      {
        provide: ChangeMembershipStatusUseCase,
        useFactory: () =>
          new ChangeMembershipStatusUseCase(memberships, membershipEvents, boundary),
      },
      ListPermissionsUseCase,
      {
        provide: GetAuthenticatedSessionUseCase,
        useFactory: () => new GetAuthenticatedSessionUseCase(users, sessions, tokens, audit),
      },
      AuthorizationGuard,
      { provide: APP_GUARD, useExisting: AuthorizationGuard },
    ],
  }).compile();

  const app = moduleRef.createNestApplication();
  configureApplication(app);
  await app.init();

  return {
    app,
    users,
    memberships,
    assignments,
    roles,
    tokens,
    sessions,
    authorization: app.get<Authorization>(AUTHORIZATION),
  };
}

describe('authorization (e2e)', () => {
  let app: INestApplication;
  let harness: Harness;

  beforeAll(async () => {
    harness = await createHarness();
    app = harness.app;
  });

  afterAll(async () => {
    await app.close();
  });

  /** Seeds an active user and answers it. */
  function seedUser(options: { active?: boolean } = {}): User {
    const user = User.create({
      displayName: 'Ali Rezaei',
      email: `ali.${randomUUID()}@example.com`,
      now: DateTime.now(),
    });

    if (options.active === false) {
      user.deactivate(user.createdAt);
    }

    harness.users.seed(user);
    return user;
  }

  /**
   * Gives `user` a membership in `tenantId` holding one role with `permissions`,
   * the shape the real write path produces.
   */
  function seedMembership(
    user: User,
    options: {
      tenantId?: string;
      permissions?: readonly string[];
      membershipActive?: boolean;
    } = {},
  ): Membership {
    const tenantId = options.tenantId ?? TENANT_A;
    const membership = Membership.create({
      userId: user.id,
      tenantId: tenantReferenceFrom(tenantId),
      now: DateTime.now(),
    });

    if (options.membershipActive === false) {
      membership.deactivate(DateTime.now());
    }
    harness.memberships.seed(membership);

    const role = Role.create({
      tenantId: tenantReferenceFrom(tenantId),
      name: RoleName.from('Administrator'),
      now: DateTime.now(),
      permissions: (options.permissions ?? []).map((key) => PermissionKey.from(key)),
    });
    harness.roles.seed(role);
    harness.assignments.seed(
      MembershipRole.assign({
        tenantId: tenantReferenceFrom(tenantId),
        membershipId: membership.id,
        roleId: role.id,
        now: DateTime.now(),
      }),
    );

    return membership;
  }

  /** Establishes an authenticated session for `user` and answers the raw token. */
  function seedSession(user: User): string {
    const token = `seeded-token-${randomUUID()}`;
    const now = DateTime.now();

    harness.sessions.seed(
      AuthSession.create({
        userId: user.id,
        tokenHash: harness.tokens.hash(token),
        expiresAt: DateTime.fromEpochMillis(now.epochMillis + 3_600_000),
        now,
      }),
    );

    return token;
  }

  function server(): ReturnType<INestApplication['getHttpServer']> {
    return app.getHttpServer();
  }

  describe('platform capability (no tenant)', () => {
    it('allows an authenticated caller holding the required capability', async () => {
      const user = seedUser();
      seedMembership(user, { permissions: ['role.read'] });
      const token = seedSession(user);

      const response = await request(server())
        .get('/api/v1/permissions')
        .set('authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.data.map((entry: { key: string }) => entry.key)).toContain(
        'company.read',
      );
    });

    it('refuses an unauthenticated caller with 401, not 403', async () => {
      const response = await request(server()).get('/api/v1/permissions').expect(401);

      expect(response.body.error).toMatchObject({ code: 'AUTHENTICATION_REQUIRED' });
    });

    it('refuses an authenticated caller without the capability with 403', async () => {
      const user = seedUser();
      seedMembership(user, { permissions: ['company.read'] });
      const token = seedSession(user);

      const response = await request(server())
        .get('/api/v1/permissions')
        .set('authorization', `Bearer ${token}`)
        .expect(403);

      expect(response.body.error).toMatchObject({
        code: 'AUTHORIZATION_DENIED',
        category: 'client',
      });
      expect(response.body.error.message).not.toContain('role.read');
    });

    it('refuses a missing token and an unknown token with 401 and distinct codes', async () => {
      const missing = await request(server()).get('/api/v1/permissions').expect(401);
      const unknown = await request(server())
        .get('/api/v1/permissions')
        .set('authorization', 'Bearer not-a-token-anybody-issued')
        .expect(401);

      expect(missing.body.error.code).toBe('AUTHENTICATION_REQUIRED');
      expect(unknown.body.error.code).toBe('AUTHENTICATION_STATE_REJECTED');
    });

    it('never returns the presented token in an error body', async () => {
      const token = `seeded-token-${randomUUID()}`;
      const response = await request(server())
        .get('/api/v1/permissions')
        .set('authorization', `Bearer ${token}`)
        .expect(401);

      expect(JSON.stringify(response.body)).not.toContain(token);
    });
  });

  describe('protected write does not run on denial', () => {
    it('creates a user for a caller holding "user.manage"', async () => {
      const user = seedUser();
      seedMembership(user, { permissions: ['user.manage'] });
      const token = seedSession(user);

      const response = await request(server())
        .post('/api/v1/users')
        .set('authorization', `Bearer ${token}`)
        .send({ displayName: 'New Person', email: `new.${randomUUID()}@example.com` })
        .expect(201);

      expect(response.body.id).toBeTruthy();
    });

    it('rejects the write before the use case runs when the capability is missing', async () => {
      const user = seedUser();
      seedMembership(user, { permissions: ['user.read'] });
      const token = seedSession(user);
      const writesBefore = harness.users.addCalls;
      const email = `never.${randomUUID()}@example.com`;

      const response = await request(server())
        .post('/api/v1/users')
        .set('authorization', `Bearer ${token}`)
        .send({ displayName: 'Should Not Exist', email })
        .expect(403);

      expect(response.body.error.code).toBe('AUTHORIZATION_DENIED');
      // Authorization failed, so the protected business action never executed.
      expect(harness.users.addCalls).toBe(writesBefore);
      expect(await harness.users.existsByEmail(email)).toBe(false);
    });

    it('rejects an unauthenticated write at the boundary', async () => {
      const writesBefore = harness.users.addCalls;

      await request(server())
        .post('/api/v1/users')
        .send({ displayName: 'Anonymous', email: `anon.${randomUUID()}@example.com` })
        .expect(401);

      expect(harness.users.addCalls).toBe(writesBefore);
    });
  });

  describe('tenant isolation', () => {
    it('reads a tenant’s members only for a caller who belongs to it', async () => {
      const reader = seedUser();
      seedMembership(reader, { tenantId: TENANT_A, permissions: ['user.read'] });
      const token = seedSession(reader);

      const response = await request(server())
        .get(`/api/v1/tenants/${TENANT_A}/memberships`)
        .set('authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.data).toBeInstanceOf(Array);
    });

    it('rejects a cross-tenant attempt as "not a member", never confirming the tenant', async () => {
      const reader = seedUser();
      seedMembership(reader, { tenantId: TENANT_A, permissions: ['user.read'] });
      const token = seedSession(reader);

      const response = await request(server())
        .get(`/api/v1/tenants/${TENANT_B}/memberships`)
        .set('authorization', `Bearer ${token}`)
        .expect(403);

      expect(response.body.error.code).toBe('MEMBERSHIP_REQUIRED');
      expect(JSON.stringify(response.body)).not.toContain(TENANT_B);
    });

    it('ignores a client-supplied tenant header entirely', async () => {
      const reader = seedUser();
      seedMembership(reader, { tenantId: TENANT_A, permissions: ['user.read'] });
      const token = seedSession(reader);

      // The caller really does belong to TENANT_B as well — and the header still
      // changes nothing: the route's tenant is what the boundary verifies.
      seedMembership(reader, { tenantId: TENANT_B, permissions: ['user.read'] });

      const response = await request(server())
        .get(`/api/v1/tenants/${TENANT_A}/memberships`)
        .set('authorization', `Bearer ${token}`)
        .set('x-tenant-id', TENANT_B)
        .expect(200);

      expect(response.body.data).toBeInstanceOf(Array);
    });

    it('rejects an inactive membership in the target tenant', async () => {
      const reader = seedUser();
      seedMembership(reader, {
        tenantId: TENANT_A,
        permissions: ['user.read'],
        membershipActive: false,
      });
      const token = seedSession(reader);

      const response = await request(server())
        .get(`/api/v1/tenants/${TENANT_A}/memberships`)
        .set('authorization', `Bearer ${token}`)
        .expect(403);

      expect(response.body.error.code).toBe('MEMBERSHIP_INACTIVE');
    });

    it('rejects a malformed tenant identifier as invalid tenant context', async () => {
      const reader = seedUser();
      seedMembership(reader, { permissions: ['user.read'] });
      const token = seedSession(reader);

      const response = await request(server())
        .get('/api/v1/tenants/not-a-tenant/memberships')
        .set('authorization', `Bearer ${token}`)
        .expect(403);

      expect(response.body.error.code).toBe('TENANT_CONTEXT_REQUIRED');
    });

    it('denies a tenant-scoped write from a caller who is only authenticated', async () => {
      const outsider = seedUser();
      const token = seedSession(outsider);
      const writesBefore = harness.memberships.addCalls;

      await request(server())
        .post(`/api/v1/tenants/${TENANT_A}/memberships`)
        .set('authorization', `Bearer ${token}`)
        .send({ userId: seedUser().id.value })
        .expect(403);

      expect(harness.memberships.addCalls).toBe(writesBefore);
    });

    it('fails a deactivated user as an authentication failure, not an authorization one', async () => {
      const user = seedUser({ active: false });
      seedMembership(user, { permissions: ['user.read'] });
      const token = seedSession(user);

      const response = await request(server())
        .get('/api/v1/permissions')
        .set('authorization', `Bearer ${token}`)
        .expect(401);

      expect(response.body.error.code).toBe('ACCOUNT_NOT_AUTHENTICATABLE');
    });
  });

  describe('one decision, two entry points', () => {
    it('reaches the same decision from HTTP and from the application contract', async () => {
      const user = seedUser();
      seedMembership(user, { tenantId: TENANT_A, permissions: ['user.read'] });
      const token = seedSession(user);

      const viaHttp = await request(server())
        .get(`/api/v1/tenants/${TENANT_A}/memberships`)
        .set('authorization', `Bearer ${token}`);
      const viaApplication = await harness.authorization.authorize({
        principal: {
          userId: user.id.value,
          displayName: user.displayName.value,
          email: user.email.value,
        },
        requiredPermission: PermissionKey.from('user.read'),
        targetTenantId: TENANT_A,
      });

      expect(viaHttp.status).toBe(200);
      expect(viaApplication.isOk()).toBe(true);

      const deniedHttp = await request(server())
        .get(`/api/v1/tenants/${TENANT_B}/memberships`)
        .set('authorization', `Bearer ${token}`);
      const deniedApplication = await harness.authorization.authorize({
        principal: {
          userId: user.id.value,
          displayName: user.displayName.value,
          email: user.email.value,
        },
        requiredPermission: PermissionKey.from('user.read'),
        targetTenantId: TENANT_B,
      });

      expect(deniedHttp.status).toBe(403);
      expect(deniedApplication.isFail()).toBe(true);
      expect(deniedApplication.errorOrThrow().code).toBe(deniedHttp.body.error.code);
    });
  });

  describe('deny by default', () => {
    it('refuses an operation that declares no authorization policy', async () => {
      const response = await request(server()).get('/api/v1/authorization-probe').expect(403);

      expect(response.body.error.code).toBe('AUTHORIZATION_POLICY_MISSING');
    });
  });
});

/**
 * The **real** process wiring (IAM-006).
 *
 * The suite above composes the boundary explicitly so it can state the evidence;
 * this one proves the process itself installs it. It boots `AppModule` — the very
 * module `main.ts` runs — and shows that a protected endpoint refuses an
 * unauthenticated caller *before any business code is reached*, while the
 * explicitly public operational and reference endpoints stay reachable.
 *
 * The audit recorder is overridden with the in-memory double so the refusal is
 * observed without touching the database: the boundary decides before any
 * repository is reached, and only the audit write would have needed storage —
 * which is exactly the property under test, not a convenience.
 */
describe('the running application installs the boundary (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(AUTHENTICATION_AUDIT_RECORDER)
      .useValue(new RecordingAuthenticationAudit())
      .compile();
    app = moduleRef.createNestApplication();
    configureApplication(app);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  function server(): ReturnType<INestApplication['getHttpServer']> {
    return app.getHttpServer();
  }

  it('refuses an unauthenticated call to a protected resource (401)', async () => {
    const users = await request(server()).get(`/api/v1/users/${randomUUID()}`).expect(401);
    const permissions = await request(server()).get('/api/v1/permissions').expect(401);

    expect(users.body.error.code).toBe('AUTHENTICATION_REQUIRED');
    expect(permissions.body.error.code).toBe('AUTHENTICATION_REQUIRED');
  });

  it('keeps the explicitly public endpoints reachable', async () => {
    await request(server()).get('/api/health').expect(200);
    await request(server()).get('/api/v1/examples').expect(200);
  });
});
