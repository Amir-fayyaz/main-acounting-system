import { randomUUID } from 'node:crypto';

import type { INestApplication } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { configureApplication } from '../src/bootstrap.js';
import { AppConfigModule } from '../src/infrastructure/config/app-config.module.js';
import { TRANSACTION_BOUNDARY } from '../src/infrastructure/database/database.tokens.js';
import {
  AUDIT_RECORDER,
  AUDIT_RECORD_QUERY,
} from '../src/modules/audit/application/audit.tokens.js';
import { ListTenantAuditRecordsUseCase } from '../src/modules/audit/application/use-cases/list-tenant-audit-records.use-case.js';
import { AUDIT_REDACTION_MARKER } from '../src/modules/audit/domain/value-objects/audit-metadata.js';
import { AuditRecordsController } from '../src/modules/audit/presentation/controllers/audit-record.controller.js';
import {
  AUTHENTICATION_AUDIT_RECORDER,
  AUTH_SESSION_REPOSITORY,
  SESSION_TOKEN_SERVICE,
} from '../src/modules/identity/application/authentication.tokens.js';
import { AUTHORIZATION } from '../src/modules/identity/application/authorization/authorization.tokens.js';
import { MEMBERSHIP_REPOSITORY } from '../src/modules/identity/application/membership.tokens.js';
import type { Authorization } from '../src/modules/identity/application/ports/authorization.port.js';
import {
  MEMBERSHIP_ROLE_REPOSITORY,
  ROLE_REPOSITORY,
} from '../src/modules/identity/application/role.tokens.js';
import { USER_REPOSITORY } from '../src/modules/identity/application/user.tokens.js';
import { AuthorizeActionUseCase } from '../src/modules/identity/application/use-cases/authorize-action.use-case.js';
import { MembershipTenantMembershipAdapter } from '../src/modules/identity/infrastructure/authorization/membership-tenant-membership.adapter.js';
import { GetAuthenticatedSessionUseCase } from '../src/modules/identity/application/use-cases/get-authenticated-session.use-case.js';
import { AuthSession } from '../src/modules/identity/domain/aggregates/auth-session.js';
import { Membership } from '../src/modules/identity/domain/aggregates/membership.js';
import { MembershipRole } from '../src/modules/identity/domain/aggregates/membership-role.js';
import { Role } from '../src/modules/identity/domain/aggregates/role.js';
import { User } from '../src/modules/identity/domain/aggregates/user.js';
import { PermissionKey } from '../src/modules/identity/domain/value-objects/permission-key.js';
import { RoleName } from '../src/modules/identity/domain/value-objects/role-name.js';
import { tenantReferenceFrom } from '../src/modules/identity/domain/value-objects/tenant-reference.js';
import { CryptoSessionTokenService } from '../src/modules/identity/infrastructure/security/crypto-session-token-service.js';
import { AuthorizationGuard } from '../src/modules/identity/presentation/guards/authorization.guard.js';
import { TENANT_DIRECTORY } from '../src/modules/tenant/application/tenant.tokens.js';
import { DateTime } from '../src/shared/time/date-time.js';
import {
  anAuditRecord,
  InMemoryAuditRecordQuery,
  RecordingAuditTrail,
} from './support/audit-doubles.js';
import {
  InMemoryAuthSessionRepository,
  RecordingAuthenticationAudit,
} from './support/authentication-doubles.js';
import {
  InMemoryMembershipRepository,
  PassthroughTransactionBoundary,
  StubTenantDirectory,
} from './support/membership-doubles.js';
import {
  InMemoryMembershipRoleRepository,
  InMemoryRoleRepository,
} from './support/role-doubles.js';
import { InMemoryUserRepository } from './support/user-doubles.js';

/**
 * The audit trail over the real HTTP boundary (AUD-001; FND-006; ADR-010).
 *
 * The file composes the real controller, the real retrieval use case, the real
 * authorization contract and the real **global** authorization guard over
 * in-memory ports, so the enforcement under test is the one the process
 * installs rather than a stand-in.
 *
 * It pins the security claims the issue makes about *retrieval*:
 *
 * - an unauthenticated caller is refused as unauthenticated (401);
 * - an authenticated caller without `audit.read` in the tenant is refused (403),
 *   and that refusal is itself recorded through the audit contract;
 * - a permitted caller receives one page of *that tenant's* trail only, with the
 *   standard pagination envelope;
 * - a client-supplied tenant cannot become the scope — an unknown query
 *   parameter is refused outright and a conflicting header is rejected;
 * - filters narrow the read, are validated as business input, and the time
 *   window is checked;
 * - the trail is read-only over HTTP: nothing can create, edit or delete a
 *   record;
 * - credential material a recorder passed by mistake never reaches a reader.
 */
const TENANT_A = '018f0d3c-6d0f-7a4b-9d4e-2b3c4d5e6f70';
const TENANT_B = '018f0d3c-6d0f-7a4b-9d4e-2b3c4d5e6f71';

const READER = '018f0d3c-6d0f-7a4b-9d4e-2b3c4d5e6f72';
const OTHER_USER = '018f0d3c-6d0f-7a4b-9d4e-2b3c4d5e6f73';

const NEVER_STORED = 's3cret-value-that-must-not-be-stored';

interface Harness {
  readonly app: INestApplication;
  readonly users: InMemoryUserRepository;
  readonly memberships: InMemoryMembershipRepository;
  readonly assignments: InMemoryMembershipRoleRepository;
  readonly roles: InMemoryRoleRepository;
  readonly tokens: CryptoSessionTokenService;
  readonly sessions: InMemoryAuthSessionRepository;
  readonly auditTrail: RecordingAuditTrail;
  readonly auditRecords: InMemoryAuditRecordQuery;
}

async function createHarness(): Promise<Harness> {
  const users = new InMemoryUserRepository();
  const memberships = new InMemoryMembershipRepository();
  const assignments = new InMemoryMembershipRoleRepository();
  const roles = new InMemoryRoleRepository();
  const tenants = new StubTenantDirectory([TENANT_A, TENANT_B]);
  const boundary = new PassthroughTransactionBoundary();
  const tokens = new CryptoSessionTokenService();
  const sessions = new InMemoryAuthSessionRepository();
  const authenticationAudit = new RecordingAuthenticationAudit();
  const auditTrail = new RecordingAuditTrail();
  const auditRecords = new InMemoryAuditRecordQuery();

  const moduleRef = await Test.createTestingModule({
    imports: [AppConfigModule],
    controllers: [AuditRecordsController],
    providers: [
      { provide: USER_REPOSITORY, useValue: users },
      { provide: MEMBERSHIP_REPOSITORY, useValue: memberships },
      { provide: MEMBERSHIP_ROLE_REPOSITORY, useValue: assignments },
      { provide: ROLE_REPOSITORY, useValue: roles },
      { provide: TENANT_DIRECTORY, useValue: tenants },
      { provide: TRANSACTION_BOUNDARY, useValue: boundary },
      { provide: AUTH_SESSION_REPOSITORY, useValue: sessions },
      { provide: SESSION_TOKEN_SERVICE, useValue: tokens },
      { provide: AUTHENTICATION_AUDIT_RECORDER, useValue: authenticationAudit },
      { provide: AUDIT_RECORDER, useValue: auditTrail },
      { provide: AUDIT_RECORD_QUERY, useValue: auditRecords },
      {
        provide: AUTHORIZATION,
        useFactory: (
          u: InMemoryUserRepository,
          m: InMemoryMembershipRepository,
          a: InMemoryMembershipRoleRepository,
          r: InMemoryRoleRepository,
          audit: RecordingAuditTrail,
        ): Authorization => new AuthorizeActionUseCase(u, m, new MembershipTenantMembershipAdapter(m), a, r, audit),
        inject: [
          USER_REPOSITORY,
          MEMBERSHIP_REPOSITORY,
          MEMBERSHIP_ROLE_REPOSITORY,
          ROLE_REPOSITORY,
          AUDIT_RECORDER,
        ],
      },
      {
        provide: GetAuthenticatedSessionUseCase,
        useFactory: () =>
          new GetAuthenticatedSessionUseCase(users, sessions, tokens, authenticationAudit),
      },
      {
        provide: ListTenantAuditRecordsUseCase,
        useFactory: (records: InMemoryAuditRecordQuery) =>
          new ListTenantAuditRecordsUseCase(records),
        inject: [AUDIT_RECORD_QUERY],
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
    auditTrail,
    auditRecords,
  };
}

describe('audit trail (e2e)', () => {
  let app: INestApplication;
  let harness: Harness;

  beforeAll(async () => {
    harness = await createHarness();
    app = harness.app;

    // Two tenants, two actors, two outcomes and three instants: enough to prove
    // isolation, filtering and ordering without a database.
    harness.auditRecords.seedRecord(
      anAuditRecord({
        tenantId: TENANT_A,
        actorUserId: READER,
        action: 'user.signed_in',
        targetType: 'user',
        targetId: READER,
        occurredAt: DateTime.parse('2026-10-16T09:00:00.000Z'),
        correlationId: 'request-1',
      }),
    );
    harness.auditRecords.seedRecord(
      anAuditRecord({
        tenantId: TENANT_A,
        actorUserId: OTHER_USER,
        action: 'authorization.denied',
        outcome: 'denied',
        targetType: 'tenant',
        targetId: TENANT_A,
        occurredAt: DateTime.parse('2026-10-16T10:00:00.000Z'),
        // A recorder that passed credential material by mistake: the value must
        // never be readable, while the key records that the context existed.
        metadata: { reason: 'MEMBERSHIP_REQUIRED', password: NEVER_STORED },
      }),
    );
    // Another tenant's fact, and a platform-level one: neither may appear.
    harness.auditRecords.seedRecord(
      anAuditRecord({
        tenantId: TENANT_B,
        actorUserId: OTHER_USER,
        action: 'user.signed_in',
        occurredAt: DateTime.parse('2026-10-16T11:00:00.000Z'),
      }),
    );
    harness.auditRecords.seedRecord(
      anAuditRecord({
        systemActor: true,
        action: 'maintenance.reindexed',
        occurredAt: DateTime.parse('2026-10-16T12:00:00.000Z'),
      }),
    );
  });

  afterAll(async () => {
    await app.close();
  });

  /** Seeds an active user with a session, and answers it with its token. */
  function seedSession(): { token: string; user: User } {
    const user = User.create({
      displayName: 'Ali Rezaei',
      email: `ali.${randomUUID()}@example.com`,
      now: DateTime.now(),
    });
    harness.users.seed(user);

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

    return { token, user };
  }

  /** Gives `user` a membership in `tenantId` holding `permissions`. */
  function seedMembership(user: User, tenantId: string, permissions: readonly string[]): void {
    const membership = Membership.create({
      userId: user.id,
      tenantId: tenantReferenceFrom(tenantId),
      now: DateTime.now(),
    });
    harness.memberships.seed(membership);

    const role = Role.create({
      tenantId: tenantReferenceFrom(tenantId),
      name: RoleName.from('Auditor'),
      now: DateTime.now(),
      permissions: permissions.map((key) => PermissionKey.from(key)),
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
  }

  /** A caller holding `audit.read` in `tenantId`, ready to read the trail. */
  function seedAuditor(tenantId = TENANT_A): { token: string; tenantId: string } {
    const { token, user } = seedSession();
    seedMembership(user, tenantId, ['audit.read']);

    return { token, tenantId };
  }

  const path = (tenantId: string): string => `/api/v1/tenants/${tenantId}/audit-records`;

  const authorized = (url: string, token: string) =>
    request(app.getHttpServer()).get(url).set('authorization', `Bearer ${token}`);

  describe('authorization', () => {
    it('refuses an unauthenticated read as unauthenticated', async () => {
      const response = await request(app.getHttpServer()).get(path(TENANT_A)).expect(401);

      expect(response.body.error.code).toBe('AUTHENTICATION_REQUIRED');
    });

    it('refuses a caller without audit.read and records the denial', async () => {
      const { token, user } = seedSession();
      seedMembership(user, TENANT_A, ['company.read']);

      const response = await authorized(path(TENANT_A), token).expect(403);

      expect(response.body.error).toMatchObject({
        code: 'AUTHORIZATION_DENIED',
        category: 'client',
      });
      // Reading the trail is itself a security-relevant operation, so the
      // refusal is audited through the same contract every module records with.
      expect(harness.auditTrail.actions()).toContain('authorization.denied');
    });

    it('refuses a caller who is not a member of the tenant it asks about', async () => {
      const { token, user } = seedSession();
      seedMembership(user, TENANT_A, ['audit.read']);

      const response = await authorized(path(TENANT_B), token).expect(403);

      expect(response.body.error.code).toBe('TENANT_ACCESS_DENIED');
    });

    it('serves the trail to a caller holding audit.read in that tenant', async () => {
      const auditor = seedAuditor();

      const response = await authorized(path(auditor.tenantId), auditor.token).expect(200);

      expect(response.body.meta).toEqual({ page: 1, limit: 20, total: 2, totalPages: 1 });
      expect(response.body.data).toHaveLength(2);
    });
  });

  describe('tenant isolation', () => {
    it('never returns another tenant’s records, nor a platform-level one', async () => {
      const auditor = seedAuditor(TENANT_A);

      const response = await authorized(path(TENANT_A), auditor.token).expect(200);

      expect(response.body.meta.total).toBe(2);
      expect(response.body.data.map((record: { tenantId: string }) => record.tenantId)).toEqual([
        TENANT_A,
        TENANT_A,
      ]);
      // Tenant B's fact and the platform-level fact both exist and are simply
      // not visible here.
      expect(JSON.stringify(response.body)).not.toContain(TENANT_B);
      expect(JSON.stringify(response.body)).not.toContain('maintenance.reindexed');
    });

    it('rejects a conflicting tenant header instead of selecting or ignoring it', async () => {
      const auditor = seedAuditor(TENANT_A);

      const response = await request(app.getHttpServer())
        .get(path(TENANT_A))
        .set('authorization', `Bearer ${auditor.token}`)
        .set('x-tenant-id', TENANT_B)
        .expect(403);

      expect(response.body.error.code).toBe('TENANT_ACCESS_DENIED');
      expect(JSON.stringify(response.body)).not.toContain(TENANT_B);
    });

    it('refuses an unknown tenant query parameter instead of silently ignoring it', async () => {
      const auditor = seedAuditor(TENANT_A);

      const response = await authorized(
        `${path(TENANT_A)}?tenantId=${TENANT_B}`,
        auditor.token,
      ).expect(400);

      expect(response.body.error.code).toBe('VALIDATION_FAILED');
      expect(fieldsOf(response.body)).toContain('tenantId');
    });
  });

  describe('filters', () => {
    it('narrows by action, actor, target type, target id and outcome at once', async () => {
      const auditor = seedAuditor();

      const response = await authorized(
        `${path(TENANT_A)}?action=authorization.denied&actorUserId=${OTHER_USER}` +
          `&targetType=tenant&targetId=${TENANT_A}&outcome=denied`,
        auditor.token,
      ).expect(200);

      expect(response.body.meta.total).toBe(1);
      expect(response.body.data[0].action).toBe('authorization.denied');
    });

    it('narrows by an inclusive time window', async () => {
      const auditor = seedAuditor();

      const response = await authorized(
        `${path(TENANT_A)}?from=2026-10-16T09:30:00.000Z&to=2026-10-16T10:30:00.000Z`,
        auditor.token,
      ).expect(200);

      expect(response.body.meta.total).toBe(1);
      expect(response.body.data[0].action).toBe('authorization.denied');
    });

    it('refuses a reversed time window rather than answering an empty page', async () => {
      const auditor = seedAuditor();

      const response = await authorized(
        `${path(TENANT_A)}?from=2026-10-16T10:00:00.000Z&to=2026-10-16T09:00:00.000Z`,
        auditor.token,
      ).expect(400);

      expect(response.body.error.code).toBe('VALIDATION_FAILED');
      expect(response.body.error.message).toContain('time range');
    });

    it('refuses an outcome outside the vocabulary', async () => {
      const auditor = seedAuditor();

      const response = await authorized(`${path(TENANT_A)}?outcome=maybe`, auditor.token).expect(
        400,
      );

      expect(response.body.error.code).toBe('VALIDATION_FAILED');
      expect(fieldsOf(response.body)).toContain('outcome');
    });

    it('refuses a malformed action name', async () => {
      const auditor = seedAuditor();

      const response = await authorized(
        `${path(TENANT_A)}?action=NOT A NAME`,
        auditor.token,
      ).expect(400);

      expect(fieldsOf(response.body)).toContain('action');
    });
  });

  describe('pagination', () => {
    it('pages the trail newest first with a stable total', async () => {
      const auditor = seedAuditor();

      const first = await authorized(`${path(TENANT_A)}?page=1&limit=1`, auditor.token).expect(200);
      const second = await authorized(`${path(TENANT_A)}?page=2&limit=1`, auditor.token).expect(
        200,
      );

      expect(first.body.meta).toEqual({ page: 1, limit: 1, total: 2, totalPages: 2 });
      expect(second.body.meta).toEqual({ page: 2, limit: 1, total: 2, totalPages: 2 });
      expect(first.body.data[0].action).toBe('authorization.denied');
      expect(second.body.data[0].action).toBe('user.signed_in');
    });

    it('answers an empty page past the end without inventing a total', async () => {
      const auditor = seedAuditor();

      const response = await authorized(`${path(TENANT_A)}?page=9&limit=20`, auditor.token).expect(
        200,
      );

      expect(response.body.meta).toEqual({ page: 9, limit: 20, total: 2, totalPages: 1 });
      expect(response.body.data).toEqual([]);
    });

    it('rejects a page size outside the shared bound', async () => {
      const auditor = seedAuditor();

      const response = await authorized(`${path(TENANT_A)}?limit=1000`, auditor.token).expect(400);

      expect(fieldsOf(response.body)).toContain('limit');
    });
  });

  describe('the record as a client sees it', () => {
    it('serializes every field, with null for what a fact does not have', async () => {
      const auditor = seedAuditor();

      const response = await authorized(
        `${path(TENANT_A)}?action=user.signed_in`,
        auditor.token,
      ).expect(200);

      expect(response.body.data[0]).toEqual({
        id: expect.any(String),
        tenantId: TENANT_A,
        actorType: 'user',
        actorUserId: READER,
        action: 'user.signed_in',
        targetType: 'user',
        targetId: READER,
        outcome: 'success',
        occurredAt: '2026-10-16T09:00:00.000Z',
        correlationId: 'request-1',
        causationId: null,
        metadata: {},
      });
    });

    it('never exposes credential material a recorder passed by mistake', async () => {
      const auditor = seedAuditor();

      const response = await authorized(
        `${path(TENANT_A)}?action=authorization.denied`,
        auditor.token,
      ).expect(200);

      const [record] = response.body.data;
      expect(record.outcome).toBe('denied');
      expect(record.metadata).toEqual({
        reason: 'MEMBERSHIP_REQUIRED',
        password: AUDIT_REDACTION_MARKER,
      });
      expect(JSON.stringify(response.body)).not.toContain(NEVER_STORED);
    });
  });

  describe('the trail is read-only over HTTP', () => {
    function send(method: 'post' | 'put' | 'patch' | 'delete', url: string, token: string) {
      const agent = request(app.getHttpServer());
      const authorization = `Bearer ${token}`;

      switch (method) {
        case 'post':
          return agent.post(url).set('authorization', authorization);
        case 'put':
          return agent.put(url).set('authorization', authorization);
        case 'patch':
          return agent.patch(url).set('authorization', authorization);
        case 'delete':
          return agent.delete(url).set('authorization', authorization);
      }
    }

    it.each(['post', 'put', 'patch', 'delete'] as const)('has no %s route', async (method) => {
      const auditor = seedAuditor();

      await send(method, path(TENANT_A), auditor.token).expect(404);
    });
  });
});

/** The fields named by a validation failure's detail list. */
function fieldsOf(body: { error: { details?: { field: string }[] } }): readonly string[] {
  return (body.error.details ?? []).map((detail) => detail.field);
}
