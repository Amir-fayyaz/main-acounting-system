import { randomUUID } from 'node:crypto';

import { Controller, Get, type INestApplication } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { configureApplication } from '../src/bootstrap.js';
import { AUDIT_RECORDER } from '../src/modules/audit/application/audit.tokens.js';
import { Authorize } from '../src/infrastructure/api/authorization/authorization-policy.js';
import { AppConfigModule } from '../src/infrastructure/config/app-config.module.js';
import { AppConfigService } from '../src/infrastructure/config/app-config.service.js';
import { loadConfiguration } from '../src/infrastructure/config/configuration.js';
import { NO_REDACTION } from '../src/infrastructure/config/secrets.js';
import { SILENT_LOGGER } from './support/logging-doubles.js';
import { TRANSACTION_BOUNDARY } from '../src/infrastructure/database/database.tokens.js';
import { JobDispatcher } from '../src/infrastructure/jobs/job-dispatcher.js';
import type { RegisteredJob } from '../src/infrastructure/jobs/job.definition.js';
import { JobRegistry } from '../src/infrastructure/jobs/job.registry.js';
import { NestJobLogger } from '../src/infrastructure/jobs/nest-job-logger.js';
import type { JobEnvelope, JobStatus } from '../src/infrastructure/jobs/job.types.js';
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
import {
  MEMBERSHIP_ROLE_REPOSITORY,
  ROLE_EVENT_RECORDER,
  ROLE_REPOSITORY,
} from '../src/modules/identity/application/role.tokens.js';
import { USER_REPOSITORY } from '../src/modules/identity/application/user.tokens.js';
import { GetAuthenticatedSessionUseCase } from '../src/modules/identity/application/use-cases/get-authenticated-session.use-case.js';
import { AuthorizeActionUseCase } from '../src/modules/identity/application/use-cases/authorize-action.use-case.js';
import { AssignRoleToMembershipUseCase } from '../src/modules/identity/application/use-cases/assign-role-to-membership.use-case.js';
import { ChangeMembershipStatusUseCase } from '../src/modules/identity/application/use-cases/change-membership-status.use-case.js';
import { ChangeRoleStatusUseCase } from '../src/modules/identity/application/use-cases/change-role-status.use-case.js';
import { CreateMembershipUseCase } from '../src/modules/identity/application/use-cases/create-membership.use-case.js';
import { CreateRoleUseCase } from '../src/modules/identity/application/use-cases/create-role.use-case.js';
import { GetMembershipUseCase } from '../src/modules/identity/application/use-cases/get-membership.use-case.js';
import { GetMembership } from '../src/modules/identity/application/queries/get-membership.query.js';
import { ListUserMemberships } from '../src/modules/identity/application/queries/list-user-memberships.query.js';
import { GetRoleUseCase } from '../src/modules/identity/application/use-cases/get-role.use-case.js';
import { GrantRolePermissionUseCase } from '../src/modules/identity/application/use-cases/grant-role-permission.use-case.js';
import { ListMembershipRolesUseCase } from '../src/modules/identity/application/use-cases/list-membership-roles.use-case.js';
import { ListRolesUseCase } from '../src/modules/identity/application/use-cases/list-roles.use-case.js';
import { ListTenantMembersUseCase } from '../src/modules/identity/application/use-cases/list-tenant-members.use-case.js';
import { ListUserMembershipsUseCase } from '../src/modules/identity/application/use-cases/list-user-memberships.use-case.js';
import { ListPermissionsUseCase } from '../src/modules/identity/application/use-cases/list-permissions.use-case.js';
import { RemoveRoleFromMembershipUseCase } from '../src/modules/identity/application/use-cases/remove-role-from-membership.use-case.js';
import { ResolveEffectivePermissionsUseCase } from '../src/modules/identity/application/use-cases/resolve-effective-permissions.use-case.js';
import { RevokeRolePermissionUseCase } from '../src/modules/identity/application/use-cases/revoke-role-permission.use-case.js';
import { UpdateRoleUseCase } from '../src/modules/identity/application/use-cases/update-role.use-case.js';
import { AuthSession } from '../src/modules/identity/domain/aggregates/auth-session.js';
import { Membership } from '../src/modules/identity/domain/aggregates/membership.js';
import { MembershipRole } from '../src/modules/identity/domain/aggregates/membership-role.js';
import { Role } from '../src/modules/identity/domain/aggregates/role.js';
import { User } from '../src/modules/identity/domain/aggregates/user.js';
import { PermissionKey } from '../src/modules/identity/domain/value-objects/permission-key.js';
import { RoleName } from '../src/modules/identity/domain/value-objects/role-name.js';
import { tenantReferenceFrom } from '../src/modules/identity/domain/value-objects/tenant-reference.js';
import { MembershipTenantMembershipAdapter } from '../src/modules/identity/infrastructure/authorization/membership-tenant-membership.adapter.js';
import { CryptoSessionTokenService } from '../src/modules/identity/infrastructure/security/crypto-session-token-service.js';
import { MembershipRolesController } from '../src/modules/identity/presentation/controllers/membership-role.controller.js';
import { MembershipsController } from '../src/modules/identity/presentation/controllers/membership.controller.js';
import { RolesController } from '../src/modules/identity/presentation/controllers/role.controller.js';
import { AuthorizationGuard } from '../src/modules/identity/presentation/guards/authorization.guard.js';
import { TENANT_DIRECTORY } from '../src/modules/tenant/application/tenant.tokens.js';
import { DateTime } from '../src/shared/time/date-time.js';
import { TenantScope } from '../src/shared/tenant/tenant-scope.js';
import { TenantContextMissingError } from '../src/shared/tenant/tenant.errors.js';
import { RecordingAuditTrail } from './support/audit-doubles.js';
import { InMemoryIdempotencyGuard, InMemoryJobQueue } from './support/job-doubles.js';
import {
  InMemoryAuthSessionRepository,
  RecordingAuthenticationAudit,
} from './support/authentication-doubles.js';
import {
  InMemoryMembershipRepository,
  PassthroughTransactionBoundary,
  RecordingMembershipEvents,
  StubTenantDirectory,
} from './support/membership-doubles.js';
import {
  InMemoryMembershipRoleRepository,
  InMemoryRoleRepository,
  RecordingRoleEvents,
} from './support/role-doubles.js';
import { InMemoryUserRepository } from './support/user-doubles.js';

/**
 * Tenant isolation under adversarial conditions (IAM-007).
 *
 * Every other spec proves that a *well-behaved* request works. This one proves
 * that a hostile one does not: the tenant boundary is enforced by trusted
 * backend boundaries, and a client — or an internal caller — cannot cross it by
 * naming another company, by pointing at another company's record, or by
 * turning an ordinary tenant operation into a platform one.
 *
 * The matrix the issue asks for, and where each row is proven:
 *
 * ```text
 * Tenant A user  →  Tenant B resource id      → refused, and B's record is untouched
 * Tenant A user  →  Tenant B tenant id        → refused at the membership check
 * Tenant A job   →  Tenant B resource ref.    → the job never runs
 * Tenant A req.  →  system-level operation    → refused; the scope cannot widen
 * ```
 *
 * The requests below go through the *real* HTTP boundary: the global
 * authorization guard, the global tenant-scope interceptor, the real use cases
 * and the real repositories (over in-memory doubles that enforce the same
 * tenant rules as the Drizzle adapters). The last block calls the same use
 * cases directly, to prove the isolation is not a property of HTTP.
 */
const TENANT_A = '018f0d3c-6d0f-7a4b-9d4e-2b3c4d5e6f70';
const TENANT_B = '018f0d3c-6d0f-7a4b-9d4e-2b3c4d5e6f71';

/**
 * A tenant-scoped endpoint that tries to widen itself into system access.
 *
 * The handler is the attempt, not a business operation: the refusal has to
 * happen at the boundary of the scope, before any work is done.
 */
@Controller('isolation')
class SystemEscalationProbeController {
  @Get(':tenantId/system')
  @Authorize({ permission: 'user.read', tenantParam: 'tenantId' })
  async escalate(): Promise<{ readonly escalated: true }> {
    return TenantScope.runAsSystem(async () => ({ escalated: true }));
  }
}

/** A tenant-scoped endpoint that reports the scope it was given. */
@Controller('isolation')
class ScopeProbeController {
  @Get(':tenantId/scope')
  @Authorize({ permission: 'user.read', tenantParam: 'tenantId' })
  scope(): { readonly tenantId: string } {
    return { tenantId: TenantScope.requireTenantId() };
  }
}

/** A deliberately malformed tenant-scoped route: the declared tenant claim is absent. */
@Controller('isolation')
class MissingTenantProbeController {
  @Get('missing-tenant')
  @Authorize({ permission: 'user.read', tenantParam: 'tenantId' })
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
  readonly membershipEvents: RecordingMembershipEvents;
  readonly auditTrail: RecordingAuditTrail;
}

async function createHarness(): Promise<Harness> {
  const users = new InMemoryUserRepository();
  const memberships = new InMemoryMembershipRepository();
  const assignments = new InMemoryMembershipRoleRepository();
  const roles = new InMemoryRoleRepository();
  const roleEvents = new RecordingRoleEvents();
  const tenants = new StubTenantDirectory([TENANT_A, TENANT_B]);
  const membershipEvents = new RecordingMembershipEvents();
  const boundary = new PassthroughTransactionBoundary();
  const tokens = new CryptoSessionTokenService();
  const sessions = new InMemoryAuthSessionRepository();
  const audit = new RecordingAuthenticationAudit();
  const auditTrail = new RecordingAuditTrail();

  const moduleRef = await Test.createTestingModule({
    imports: [AppConfigModule],
    controllers: [
      MembershipsController,
      MembershipRolesController,
      RolesController,
      SystemEscalationProbeController,
      ScopeProbeController,
      MissingTenantProbeController,
    ],
    providers: [
      { provide: USER_REPOSITORY, useValue: users },
      { provide: MEMBERSHIP_REPOSITORY, useValue: memberships },
      { provide: MEMBERSHIP_EVENT_RECORDER, useValue: membershipEvents },
      { provide: ROLE_REPOSITORY, useValue: roles },
      { provide: MEMBERSHIP_ROLE_REPOSITORY, useValue: assignments },
      { provide: ROLE_EVENT_RECORDER, useValue: roleEvents },
      { provide: TENANT_DIRECTORY, useValue: tenants },
      { provide: TRANSACTION_BOUNDARY, useValue: boundary },
      { provide: AUTH_SESSION_REPOSITORY, useValue: sessions },
      { provide: SESSION_TOKEN_SERVICE, useValue: tokens },
      { provide: AUTHENTICATION_AUDIT_RECORDER, useValue: audit },
      { provide: AUDIT_RECORDER, useValue: auditTrail },
      {
        provide: AUTHORIZATION,
        useFactory: (
          u: InMemoryUserRepository,
          m: InMemoryMembershipRepository,
          a: InMemoryMembershipRoleRepository,
          r: InMemoryRoleRepository,
          au: RecordingAuditTrail,
        ): AuthorizeActionUseCase =>
          new AuthorizeActionUseCase(u, m, new MembershipTenantMembershipAdapter(m), a, r, au),
        inject: [
          USER_REPOSITORY,
          MEMBERSHIP_REPOSITORY,
          MEMBERSHIP_ROLE_REPOSITORY,
          ROLE_REPOSITORY,
          AUDIT_RECORDER,
        ],
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
      {
        provide: ListMembershipRolesUseCase,
        useFactory: () => new ListMembershipRolesUseCase(memberships, assignments, roles),
      },
      {
        provide: ResolveEffectivePermissionsUseCase,
        useFactory: () => new ResolveEffectivePermissionsUseCase(memberships, assignments, roles),
      },
      {
        provide: AssignRoleToMembershipUseCase,
        useFactory: () =>
          new AssignRoleToMembershipUseCase(memberships, roles, assignments, roleEvents, boundary),
      },
      {
        provide: RemoveRoleFromMembershipUseCase,
        useFactory: () =>
          new RemoveRoleFromMembershipUseCase(assignments, roles, roleEvents, boundary),
      },
      {
        provide: CreateRoleUseCase,
        useFactory: () => new CreateRoleUseCase(roles, tenants, roleEvents, boundary),
      },
      { provide: GetRoleUseCase, useFactory: () => new GetRoleUseCase(roles) },
      { provide: ListRolesUseCase, useFactory: () => new ListRolesUseCase(roles) },
      {
        provide: UpdateRoleUseCase,
        useFactory: () => new UpdateRoleUseCase(roles, roleEvents, boundary),
      },
      {
        provide: ChangeRoleStatusUseCase,
        useFactory: () => new ChangeRoleStatusUseCase(roles, roleEvents, boundary),
      },
      {
        provide: GrantRolePermissionUseCase,
        useFactory: () => new GrantRolePermissionUseCase(roles, roleEvents, boundary),
      },
      {
        provide: RevokeRolePermissionUseCase,
        useFactory: () => new RevokeRolePermissionUseCase(roles, roleEvents, boundary),
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
    membershipEvents,
    auditTrail,
  };
}

/** A seeded membership together with the role assignment it owns. */
interface Seeded {
  readonly membership: Membership;
  readonly assignment: MembershipRole;
}

describe('tenant isolation (adversarial, e2e)', () => {
  let app: INestApplication;
  let harness: Harness;

  beforeAll(async () => {
    harness = await createHarness();
    app = harness.app;
  });

  afterAll(async () => {
    await app.close();
  });

  /** Seeds an active user. */
  function seedUser(): User {
    const user = User.create({
      displayName: 'Ali Rezaei',
      email: `ali.${randomUUID()}@example.com`,
      now: DateTime.now(),
    });

    harness.users.seed(user);
    return user;
  }

  /**
   * Gives `user` an active membership in `tenantId` holding one role with
   * `permissions` — the shape the real write path produces.
   */
  function seedMembership(
    user: User,
    options: {
      tenantId?: string;
      permissions?: readonly string[];
    } = {},
  ): Seeded {
    const tenantId = options.tenantId ?? TENANT_A;
    const membership = Membership.create({
      userId: user.id,
      tenantId: tenantReferenceFrom(tenantId),
      now: DateTime.now(),
    });

    harness.memberships.seed(membership);

    const role = Role.create({
      tenantId: tenantReferenceFrom(tenantId),
      name: RoleName.from('Administrator'),
      now: DateTime.now(),
      permissions: (options.permissions ?? []).map((key) => PermissionKey.from(key)),
    });
    harness.roles.seed(role);

    const assignment = MembershipRole.assign({
      tenantId: tenantReferenceFrom(tenantId),
      membershipId: membership.id,
      roleId: role.id,
      now: DateTime.now(),
    });
    harness.assignments.seed(assignment);

    return { membership, assignment };
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

  describe('a tenant-scoped read', () => {
    it('refuses a resource id that belongs to another tenant', async () => {
      const reader = seedUser();
      const owner = seedUser();
      seedMembership(reader, { tenantId: TENANT_A, permissions: ['user.read'] });
      const foreign = seedMembership(owner, { tenantId: TENANT_B, permissions: ['user.read'] });
      const token = seedSession(reader);

      const response = await request(server())
        .get(`/api/v1/tenants/${TENANT_A}/memberships/${foreign.membership.id.value}`)
        .set('authorization', `Bearer ${token}`)
        .expect(404);

      expect(response.body.error.code).toBe('NOT_FOUND');
      // The refusal discloses nothing about the other tenant.
      expect(JSON.stringify(response.body)).not.toContain(TENANT_B);
      expect(JSON.stringify(response.body)).not.toContain(foreign.membership.id.value);
    });

    it('does not list another tenant’s members', async () => {
      const reader = seedUser();
      const owner = seedUser();
      seedMembership(reader, { tenantId: TENANT_A, permissions: ['user.read'] });
      seedMembership(owner, { tenantId: TENANT_B, permissions: ['user.read'] });
      const token = seedSession(reader);

      const response = await request(server())
        .get(`/api/v1/tenants/${TENANT_A}/memberships`)
        .set('authorization', `Bearer ${token}`)
        .expect(200);

      // Every member the answer names belongs to the caller's own tenant.
      expect(response.body.data.length).toBeGreaterThan(0);
      const members = response.body.data as { userId: string }[];
      expect(members.some((member) => member.userId === owner.id.value)).toBe(false);
      expect(JSON.stringify(response.body)).not.toContain(TENANT_B);
      expect(JSON.stringify(response.body)).not.toContain(owner.id.value);
    });

    it('runs under the tenant the membership proved, not the one in the URL', async () => {
      const reader = seedUser();
      seedMembership(reader, { tenantId: TENANT_A, permissions: ['user.read'] });
      const token = seedSession(reader);

      // The same tenant, spelled the other way round.
      const response = await request(server())
        .get(`/api/v1/isolation/${TENANT_A.toUpperCase()}/scope`)
        .set('authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.tenantId).toBe(TENANT_A);
    });

    it('keeps concurrent authenticated requests isolated across both tenants', async () => {
      const memberA = seedUser();
      const memberB = seedUser();
      seedMembership(memberA, { tenantId: TENANT_A, permissions: ['user.read'] });
      seedMembership(memberB, { tenantId: TENANT_B, permissions: ['user.read'] });
      const tokenA = seedSession(memberA);
      const tokenB = seedSession(memberB);

      const [responseA, responseB] = await Promise.all([
        request(server())
          .get(`/api/v1/tenants/${TENANT_A}/memberships`)
          .set('authorization', `Bearer ${tokenA}`)
          .expect(200),
        request(server())
          .get(`/api/v1/tenants/${TENANT_B}/memberships`)
          .set('authorization', `Bearer ${tokenB}`)
          .expect(200),
      ]);

      const membersA = responseA.body.data as { readonly userId: string }[];
      const membersB = responseB.body.data as { readonly userId: string }[];
      expect(membersA.some((member) => member.userId === memberB.id.value)).toBe(false);
      expect(membersB.some((member) => member.userId === memberA.id.value)).toBe(false);
      expect(membersA.some((member) => member.userId === memberA.id.value)).toBe(true);
      expect(membersB.some((member) => member.userId === memberB.id.value)).toBe(true);
    });
  });

  describe('a tenant-scoped write', () => {
    it('refuses to create a record in another tenant', async () => {
      const reader = seedUser();
      const other = seedUser();
      seedMembership(reader, { tenantId: TENANT_A, permissions: ['user.manage'] });
      const token = seedSession(reader);

      const response = await request(server())
        .post(`/api/v1/tenants/${TENANT_B}/memberships`)
        .set('authorization', `Bearer ${token}`)
        .send({ userId: other.id.value })
        .expect(403);

      expect(response.body.error.code).toBe('TENANT_ACCESS_DENIED');
      expect(JSON.stringify(response.body)).not.toContain(TENANT_B);
    });


    it('does not let a body-supplied tenant id choose the owner of a new record', async () => {
      const creator = seedUser();
      const newcomer = seedUser();
      seedMembership(creator, { tenantId: TENANT_A, permissions: ['user.manage'] });
      const token = seedSession(creator);
      const writesBefore = harness.memberships.addCalls;

      await request(server())
        .post(`/api/v1/tenants/${TENANT_A}/memberships`)
        .set('authorization', `Bearer ${token}`)
        .send({ userId: newcomer.id.value, tenantId: TENANT_B })
        .expect(400);

      // The body is rejected by the DTO boundary; it cannot redirect a write to B.
      expect(harness.memberships.addCalls).toBe(writesBefore);
    });

    it('refuses to update a record that belongs to another tenant, and changes nothing', async () => {
      const reader = seedUser();
      const owner = seedUser();
      seedMembership(reader, { tenantId: TENANT_A, permissions: ['user.manage'] });
      const foreign = seedMembership(owner, { tenantId: TENANT_B, permissions: ['user.manage'] });
      const token = seedSession(reader);

      const response = await request(server())
        .post(`/api/v1/tenants/${TENANT_A}/memberships/${foreign.membership.id.value}/status`)
        .set('authorization', `Bearer ${token}`)
        .send({ status: 'inactive', expectedRevision: 1 })
        .expect(404);

      expect(response.body.error.code).toBe('NOT_FOUND');
      // The other tenant's record is exactly as it was.
      expect(harness.memberships.stored(foreign.membership.id)?.isActive()).toBe(true);
    });

    it('refuses to remove a role assignment of another tenant, and changes nothing', async () => {
      const reader = seedUser();
      const owner = seedUser();
      seedMembership(reader, { tenantId: TENANT_A, permissions: ['role.manage'] });
      const foreign = seedMembership(owner, { tenantId: TENANT_B, permissions: ['role.manage'] });
      const token = seedSession(reader);

      const response = await request(server())
        .post(
          `/api/v1/tenants/${TENANT_A}/memberships/${foreign.membership.id.value}/roles/${foreign.assignment.id.value}/remove`,
        )
        .set('authorization', `Bearer ${token}`)
        .send({ expectedRevision: 1 })
        .expect(404);

      expect(response.body.error.code).toBe('NOT_FOUND');
      // The assignment of the other tenant is still active.
      expect(harness.assignments.stored(foreign.assignment.id)?.isActive()).toBe(true);
    });

    it('keeps the write inside the tenant the membership proved', async () => {
      const reader = seedUser();
      const newcomer = seedUser();
      seedMembership(reader, { tenantId: TENANT_A, permissions: ['user.manage'] });
      const token = seedSession(reader);

      const response = await request(server())
        .post(`/api/v1/tenants/${TENANT_A}/memberships`)
        .set('authorization', `Bearer ${token}`)
        .send({ userId: newcomer.id.value })
        .expect(201);

      expect(response.body).toMatchObject({ tenantId: TENANT_A, userId: newcomer.id.value });

      // And the fact that happened is stamped with the tenant it belongs to.
      const raised = harness.membershipEvents.recorded.find(
        (event) => event.name === 'MembershipCreated',
      );
      expect(raised?.metadata.tenantId).toBe(TENANT_A);
    });
  });

  describe('a client-supplied tenant identifier', () => {
    it('cannot select another tenant through the route', async () => {
      const reader = seedUser();
      seedMembership(reader, { tenantId: TENANT_A, permissions: ['user.read'] });
      const token = seedSession(reader);

      const response = await request(server())
        .get(`/api/v1/tenants/${TENANT_B}/memberships`)
        .set('authorization', `Bearer ${token}`)
        .expect(403);

      expect(response.body.error.code).toBe('TENANT_ACCESS_DENIED');
      expect(JSON.stringify(response.body)).not.toContain(TENANT_B);
    });

    it('cannot select another tenant through the header', async () => {
      const reader = seedUser();
      seedMembership(reader, { tenantId: TENANT_A, permissions: ['user.read'] });
      const token = seedSession(reader);

      const response = await request(server())
        .get(`/api/v1/tenants/${TENANT_A}/memberships`)
        .set('authorization', `Bearer ${token}`)
        .set('x-tenant-id', TENANT_B)
        .expect(403);

      expect(response.body.error.code).toBe('TENANT_ACCESS_DENIED');
      expect(JSON.stringify(response.body)).not.toContain(TENANT_B);
    });

    it('refuses a tenant-scoped route whose tenant parameter is missing', async () => {
      const reader = seedUser();
      seedMembership(reader, { tenantId: TENANT_A, permissions: ['user.read'] });
      const token = seedSession(reader);

      const response = await request(server())
        .get('/api/v1/isolation/missing-tenant')
        .set('authorization', `Bearer ${token}`)
        .expect(403);

      expect(response.body.error.code).toBe('TENANT_CONTEXT_REQUIRED');
    });

    it('is refused outright when the caller holds no membership at all', async () => {
      const outsider = seedUser();
      const token = seedSession(outsider);

      const response = await request(server())
        .get(`/api/v1/tenants/${TENANT_A}/memberships`)
        .set('authorization', `Bearer ${token}`)
        .expect(403);

      expect(response.body.error.code).toBe('TENANT_ACCESS_DENIED');
    });
  });

  describe('a system-level operation', () => {
    it('cannot be reached from a tenant-scoped endpoint', async () => {
      const reader = seedUser();
      seedMembership(reader, { tenantId: TENANT_A, permissions: ['user.read'] });
      const token = seedSession(reader);

      const response = await request(server())
        .get(`/api/v1/isolation/${TENANT_A}/system`)
        .set('authorization', `Bearer ${token}`)
        .expect(403);

      expect(response.body.error).toMatchObject({ code: 'FORBIDDEN', category: 'client' });
      expect(JSON.stringify(response.body)).not.toContain(TENANT_A);
    });

    it('cannot be reached by widening the scope inside a tenant execution', async () => {
      await expect(
        TenantScope.run({ state: 'available', tenantId: TENANT_A }, async () =>
          TenantScope.runAsSystem(async () => undefined),
        ),
      ).rejects.toThrow();
    });
  });

  describe('a background job', () => {
    /** The dispatcher and queue a worker runs, for one registered job type. */
    function worker(definition: RegisteredJob): {
      readonly dispatcher: JobDispatcher;
      readonly queue: InMemoryJobQueue;
    } {
      const queue = new InMemoryJobQueue();
      const registry = new JobRegistry([definition]);
      const dispatcher = new JobDispatcher(
        registry,
        new NestJobLogger(SILENT_LOGGER),
        queue,
        new InMemoryIdempotencyGuard(),
        new AppConfigService(
          loadConfiguration({
            NODE_ENV: 'test',
            WORKER_MAX_ATTEMPTS: '3',
            WORKER_RETRY_BASE_DELAY_MS: '20',
            WORKER_RETRY_MAX_DELAY_MS: '60',
          }),
        ),
        NO_REDACTION,
      );

      return { dispatcher, queue };
    }

    /** Enqueues an envelope and hands it to the dispatcher, as a worker does. */
    async function runJob(
      { dispatcher, queue }: { dispatcher: JobDispatcher; queue: InMemoryJobQueue },
      envelope: JobEnvelope,
    ): Promise<JobStatus> {
      await queue.push(envelope);
      const [claimed] = await queue.claim(1);

      return await dispatcher.dispatch(claimed!);
    }

    it('runs under the tenant its envelope carries', async () => {
      let observed: string | undefined;
      const worker_ = worker({
        type: 'isolation.tenant-job',
        tenantScoped: true,
        async execute() {
          observed = TenantScope.requireTenantId();

          return { outcome: 'completed' };
        },
      });

      const status = await runJob(worker_, {
        jobId: randomUUID(),
        type: 'isolation.tenant-job',
        version: 1,
        payload: {},
        attempt: 1,
        maxAttempts: 3,
        correlationId: 'correlation-1',
        companyId: TENANT_A,
        createdAt: new Date().toISOString(),
        enqueuedBy: 'test',
      });

      expect(status).toBe('completed');
      expect(observed).toBe(TENANT_A);
    });

    it('never runs a job whose payload names another tenant', async () => {
      let executions = 0;
      const worker_ = worker({
        type: 'isolation.foreign-job',
        tenantScoped: true,
        async execute() {
          executions += 1;

          return { outcome: 'completed' };
        },
      });

      const jobId = randomUUID();
      const status = await runJob(worker_, {
        jobId,
        type: 'isolation.foreign-job',
        version: 1,
        // The payload points at the other tenant; the envelope says this one.
        payload: { tenantId: TENANT_B },
        attempt: 1,
        maxAttempts: 3,
        correlationId: 'correlation-1',
        companyId: TENANT_A,
        createdAt: new Date().toISOString(),
        enqueuedBy: 'test',
      });

      expect(status).toBe('failed');
      expect(executions).toBe(0);
      expect(worker_.queue.stateOf(jobId)?.lastError?.name).toBe('TenantIsolationViolationError');
    });

    it('never runs a tenant-scoped job that carries no owner context', async () => {
      let executions = 0;
      const worker_ = worker({
        type: 'isolation.ownerless-job',
        tenantScoped: true,
        async execute() {
          executions += 1;

          return { outcome: 'completed' };
        },
      });

      const jobId = randomUUID();
      const status = await runJob(worker_, {
        jobId,
        type: 'isolation.ownerless-job',
        version: 1,
        payload: {},
        attempt: 1,
        maxAttempts: 3,
        correlationId: 'correlation-1',
        createdAt: new Date().toISOString(),
        enqueuedBy: 'test',
      });

      expect(status).toBe('failed');
      expect(executions).toBe(0);
      expect(worker_.queue.stateOf(jobId)?.lastError?.name).toBe('TenantContextMissingError');
    });
  });

  describe('an application path that is not HTTP', () => {
    it('refuses a use case that names another tenant', async () => {
      const reader = seedUser();
      const owner = seedUser();
      seedMembership(reader, { tenantId: TENANT_A, permissions: ['user.read'] });
      const foreign = seedMembership(owner, { tenantId: TENANT_B, permissions: ['user.read'] });

      const outcome = await TenantScope.run({ state: 'available', tenantId: TENANT_A }, async () =>
        new GetMembershipUseCase(harness.memberships).execute(
          new GetMembership({
            membershipId: foreign.membership.id.value,
            tenantId: TENANT_A,
          }),
        ),
      );

      expect(outcome.isFail()).toBe(true);
      expect(outcome.errorOrThrow().code).toBe('NOT_FOUND');
    });

    it('refuses a tenant-scoped use case that runs without any tenant context', async () => {
      const reader = seedUser();
      const seeded = seedMembership(reader, { tenantId: TENANT_A, permissions: ['user.read'] });

      await expect(
        new GetMembershipUseCase(harness.memberships).execute(
          new GetMembership({
            membershipId: seeded.membership.id.value,
            tenantId: TENANT_A,
          }),
        ),
      ).rejects.toBeInstanceOf(TenantContextMissingError);
    });

    it('refuses to read a person’s memberships from inside a tenant scope', async () => {
      const reader = seedUser();
      seedMembership(reader, { tenantId: TENANT_A, permissions: ['user.read'] });

      // A person's memberships span companies: that is a declared platform
      // question, and a tenant-scoped execution may not ask it.
      await expect(
        TenantScope.run({ state: 'available', tenantId: TENANT_A }, async () =>
          new ListUserMembershipsUseCase(harness.memberships, harness.users).execute(
            new ListUserMemberships({ userId: reader.id.value }),
          ),
        ),
      ).rejects.toThrow();
    });
  });
});
