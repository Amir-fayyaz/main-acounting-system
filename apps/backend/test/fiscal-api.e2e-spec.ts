import { randomUUID } from 'node:crypto';

import type { INestApplication } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { configureApplication } from '../src/bootstrap.js';
import { AppConfigModule } from '../src/infrastructure/config/app-config.module.js';
import { AUDIT_RECORDER } from '../src/modules/audit/application/audit.tokens.js';
import { TRANSACTION_BOUNDARY } from '../src/infrastructure/database/database.tokens.js';
import {
  AUTHENTICATION_AUDIT_RECORDER,
  AUTH_SESSION_REPOSITORY,
  SESSION_TOKEN_SERVICE,
} from '../src/modules/identity/application/authentication.tokens.js';
import { AUTHORIZATION } from '../src/modules/identity/application/authorization/authorization.tokens.js';
import { MEMBERSHIP_REPOSITORY } from '../src/modules/identity/application/membership.tokens.js';
import {
  MEMBERSHIP_ROLE_REPOSITORY,
  ROLE_REPOSITORY,
} from '../src/modules/identity/application/role.tokens.js';
import { USER_REPOSITORY } from '../src/modules/identity/application/user.tokens.js';
import { AuthSession } from '../src/modules/identity/domain/aggregates/auth-session.js';
import { Membership } from '../src/modules/identity/domain/aggregates/membership.js';
import { MembershipRole } from '../src/modules/identity/domain/aggregates/membership-role.js';
import { Role } from '../src/modules/identity/domain/aggregates/role.js';
import { User } from '../src/modules/identity/domain/aggregates/user.js';
import { PermissionKey } from '../src/modules/identity/domain/value-objects/permission-key.js';
import { RoleName } from '../src/modules/identity/domain/value-objects/role-name.js';
import { tenantReferenceFrom as identityTenantReference } from '../src/modules/identity/domain/value-objects/tenant-reference.js';
import { GetAuthenticatedSessionUseCase } from '../src/modules/identity/application/use-cases/get-authenticated-session.use-case.js';
import { AuthorizeActionUseCase } from '../src/modules/identity/application/use-cases/authorize-action.use-case.js';
import { MembershipTenantMembershipAdapter } from '../src/modules/identity/infrastructure/authorization/membership-tenant-membership.adapter.js';
import { AuthorizationGuard } from '../src/modules/identity/presentation/guards/authorization.guard.js';
import { CryptoSessionTokenService } from '../src/modules/identity/infrastructure/security/crypto-session-token-service.js';
import { FiscalYearsController } from '../src/modules/accounting/presentation/controllers/fiscal-years.controller.js';
import { FiscalPeriodsController } from '../src/modules/accounting/presentation/controllers/fiscal-periods.controller.js';
import {
  ACTIVE_PERIOD_REPOSITORY,
  FISCAL_PERIOD_EVENT_RECORDER,
  FISCAL_PERIOD_REPOSITORY,
  FISCAL_YEAR_EVENT_RECORDER,
  FISCAL_YEAR_REPOSITORY,
} from '../src/modules/accounting/application/accounting.tokens.js';
import { CreateFiscalYearUseCase } from '../src/modules/accounting/application/use-cases/create-fiscal-year.use-case.js';
import { GenerateFiscalPeriodsUseCase } from '../src/modules/accounting/application/use-cases/generate-fiscal-periods.use-case.js';
import { SelectActivePeriodUseCase } from '../src/modules/accounting/application/use-cases/select-active-period.use-case.js';
import { CloseFiscalPeriodUseCase } from '../src/modules/accounting/application/use-cases/close-fiscal-period.use-case.js';
import { ReopenFiscalPeriodUseCase } from '../src/modules/accounting/application/use-cases/reopen-fiscal-period.use-case.js';
import { GetFiscalYearUseCase } from '../src/modules/accounting/application/use-cases/get-fiscal-year.use-case.js';
import { ListFiscalYearsUseCase } from '../src/modules/accounting/application/use-cases/list-fiscal-years.use-case.js';
import { ListFiscalPeriodsUseCase } from '../src/modules/accounting/application/use-cases/list-fiscal-periods.use-case.js';
import { fiscalPeriodIdFrom } from '../src/modules/accounting/domain/value-objects/fiscal-period-id.js';
import { DateTime } from '../src/shared/time/date-time.js';
import { RecordingAuditTrail } from './support/audit-doubles.js';
import {
  InMemoryAuthSessionRepository,
  RecordingAuthenticationAudit,
} from './support/authentication-doubles.js';
import {
  InMemoryFiscalYearRepository,
  RecordingFiscalYearEvents,
} from './support/accounting-doubles.js';
import {
  InMemoryActivePeriodRepository,
  InMemoryFiscalPeriodRepository,
} from './support/fiscal-period-doubles.js';
import {
  InMemoryMembershipRepository,
  PassthroughTransactionBoundary,
} from './support/membership-doubles.js';
import {
  InMemoryMembershipRoleRepository,
  InMemoryRoleRepository,
} from './support/role-doubles.js';
import { InMemoryUserRepository } from './support/user-doubles.js';

/**
 * The fiscal year and period resources over the real HTTP boundary
 * (FIS-002, FIS-004, FIS-005; FND-006).
 *
 * The suite composes the real controllers, the real use cases, the real
 * **global** authorization guard and the real shared error filter over
 * in-memory repositories — the enforcement under test is the one the process
 * installs, not a stand-in. It pins the issue's own verification list:
 *
 * - the golden flow: create year → list periods → select active → close →
 *   reopen with reason, every step over HTTP, every write in the audit trail;
 * - close/reopen refused for a caller without `accounting.period.manage`,
 *   with the refusal recorded in the audit trail;
 * - missing reopen reason → 400 `REOPEN_REASON_REQUIRED`;
 * - overlapping year → 409 `FISCAL_YEAR_OVERLAP` (the module's own code);
 * - a closed period selected as active → 422 `FISCAL_PERIOD_NOT_OPEN`;
 * - tenant isolation through the API: company A cannot read, close or reopen
 *   company B's year or period;
 * - a `tenantId` in the body or the query is rejected by the boundary;
 * - every operation documented in the generated OpenAPI document with
 *   request, response and error examples.
 *
 * Each test seeds its own company (tenant + membership + role + session), so
 * the per-tenant fiscal-year rules never collide across tests. Persistence
 * against MySQL is covered by `fiscal-year-persistence` and
 * `fiscal-period-persistence` (opt-in, `MYSQL_INTEGRATION=1`).
 */

const MANAGE = 'accounting.period.manage';

/** One Jalali year (1405), the shape the generation policy accepts. */
const YEAR_START = '2026-03-21';
const YEAR_END = '2027-03-20';

/** The next Jalali year (1406) — adjacent, so it never overlaps 1405. */
const NEXT_YEAR_START = '2027-03-21';
const NEXT_YEAR_END = '2028-03-19';

interface Company {
  readonly tenantId: string;
  readonly userId: string;
  readonly token: string;
}

interface Harness {
  readonly app: INestApplication;
  readonly audit: RecordingAuditTrail;
  readonly periods: InMemoryFiscalPeriodRepository;
  readonly users: InMemoryUserRepository;
  readonly memberships: InMemoryMembershipRepository;
  readonly assignments: InMemoryMembershipRoleRepository;
  readonly roles: InMemoryRoleRepository;
  readonly sessions: InMemoryAuthSessionRepository;
  readonly tokens: CryptoSessionTokenService;
}

async function createHarness(): Promise<Harness> {
  const users = new InMemoryUserRepository();
  const memberships = new InMemoryMembershipRepository();
  const assignments = new InMemoryMembershipRoleRepository();
  const roles = new InMemoryRoleRepository();
  const sessions = new InMemoryAuthSessionRepository();
  const tokens = new CryptoSessionTokenService();
  const authenticationAudit = new RecordingAuthenticationAudit();
  const audit = new RecordingAuditTrail();
  const boundary = new PassthroughTransactionBoundary();

  const fiscalYears = new InMemoryFiscalYearRepository();
  const periods = new InMemoryFiscalPeriodRepository();
  const activePeriods = new InMemoryActivePeriodRepository();
  const yearEvents = new RecordingFiscalYearEvents();
  const periodEvents = new RecordingFiscalYearEvents();

  const moduleRef = await Test.createTestingModule({
    imports: [AppConfigModule],
    controllers: [FiscalYearsController, FiscalPeriodsController],
    providers: [
      { provide: USER_REPOSITORY, useValue: users },
      { provide: MEMBERSHIP_REPOSITORY, useValue: memberships },
      { provide: MEMBERSHIP_ROLE_REPOSITORY, useValue: assignments },
      { provide: ROLE_REPOSITORY, useValue: roles },
      { provide: AUTH_SESSION_REPOSITORY, useValue: sessions },
      { provide: SESSION_TOKEN_SERVICE, useValue: tokens },
      { provide: AUTHENTICATION_AUDIT_RECORDER, useValue: authenticationAudit },
      { provide: AUDIT_RECORDER, useValue: audit },
      { provide: TRANSACTION_BOUNDARY, useValue: boundary },
      { provide: FISCAL_YEAR_REPOSITORY, useValue: fiscalYears },
      { provide: FISCAL_PERIOD_REPOSITORY, useValue: periods },
      { provide: ACTIVE_PERIOD_REPOSITORY, useValue: activePeriods },
      { provide: FISCAL_YEAR_EVENT_RECORDER, useValue: yearEvents },
      { provide: FISCAL_PERIOD_EVENT_RECORDER, useValue: periodEvents },
      {
        // The published authorization contract, decided by the same use case
        // the running process binds — including inside the close/reopen use
        // cases, so one decision serves the guard and the application layer.
        provide: AUTHORIZATION,
        useFactory: () =>
          new AuthorizeActionUseCase(
            users,
            memberships,
            new MembershipTenantMembershipAdapter(memberships),
            assignments,
            roles,
            audit,
          ),
      },
      {
        provide: GetAuthenticatedSessionUseCase,
        useFactory: () =>
          new GetAuthenticatedSessionUseCase(users, sessions, tokens, authenticationAudit),
      },
      {
        provide: GenerateFiscalPeriodsUseCase,
        useFactory: () =>
          new GenerateFiscalPeriodsUseCase(
            fiscalYears,
            periods,
            activePeriods,
            periodEvents,
            boundary,
          ),
      },
      {
        provide: CreateFiscalYearUseCase,
        useFactory: (generate: GenerateFiscalPeriodsUseCase) =>
          new CreateFiscalYearUseCase(fiscalYears, yearEvents, boundary, generate, audit),
        inject: [GenerateFiscalPeriodsUseCase],
      },
      {
        provide: SelectActivePeriodUseCase,
        useFactory: () =>
          new SelectActivePeriodUseCase(periods, activePeriods, periodEvents, boundary, audit),
      },
      {
        provide: CloseFiscalPeriodUseCase,
        useFactory: (authorization: AuthorizeActionUseCase) =>
          new CloseFiscalPeriodUseCase(
            periods,
            activePeriods,
            periodEvents,
            audit,
            authorization,
            boundary,
          ),
        inject: [AUTHORIZATION],
      },
      {
        provide: ReopenFiscalPeriodUseCase,
        useFactory: (authorization: AuthorizeActionUseCase) =>
          new ReopenFiscalPeriodUseCase(periods, periodEvents, audit, authorization, boundary),
        inject: [AUTHORIZATION],
      },
      { provide: GetFiscalYearUseCase, useFactory: () => new GetFiscalYearUseCase(fiscalYears) },
      {
        provide: ListFiscalYearsUseCase,
        useFactory: () => new ListFiscalYearsUseCase(fiscalYears),
      },
      {
        provide: ListFiscalPeriodsUseCase,
        useFactory: () => new ListFiscalPeriodsUseCase(fiscalYears, periods),
      },
      AuthorizationGuard,
      { provide: APP_GUARD, useExisting: AuthorizationGuard },
    ],
  }).compile();

  const app = moduleRef.createNestApplication();
  configureApplication(app);
  await app.init();

  return { app, audit, periods, users, memberships, assignments, roles, sessions, tokens };
}

describe('fiscal year and period API (e2e)', () => {
  let harness: Harness;
  let app: INestApplication;

  beforeAll(async () => {
    harness = await createHarness();
    app = harness.app;
  });

  afterAll(async () => {
    await app.close();
  });

  function server(): ReturnType<INestApplication['getHttpServer']> {
    return app.getHttpServer();
  }

  /**
   * Seeds a fresh company: a tenant identity plus an active user holding a
   * role with `permissions` in it, and an established session. A fresh tenant
   * per test keeps the per-tenant fiscal rules independent.
   */
  function seedCompany(permissions: readonly string[] = [MANAGE]): Company {
    const tenantId = randomUUID();
    const member = seedMember(tenantId, permissions);

    return { tenantId, userId: member.userId, token: member.token };
  }

  /** Seeds an active user holding a role with `permissions` in an existing tenant. */
  function seedMember(
    tenantId: string,
    permissions: readonly string[],
  ): { readonly userId: string; readonly token: string } {
    const user = User.create({
      displayName: 'Fiscal Tester',
      email: `fiscal.${randomUUID()}@example.com`,
      now: DateTime.now(),
    });
    harness.users.seed(user);

    const membership = Membership.create({
      userId: user.id,
      tenantId: identityTenantReference(tenantId),
      now: DateTime.now(),
    });
    harness.memberships.seed(membership);

    const role = Role.create({
      tenantId: identityTenantReference(tenantId),
      name: RoleName.from('Fiscal Manager'),
      now: DateTime.now(),
      permissions: permissions.map((key) => PermissionKey.from(key)),
    });
    harness.roles.seed(role);
    harness.assignments.seed(
      MembershipRole.assign({
        tenantId: identityTenantReference(tenantId),
        membershipId: membership.id,
        roleId: role.id,
        now: DateTime.now(),
      }),
    );

    const rawToken = `fiscal-token-${randomUUID()}`;
    const now = DateTime.now();
    harness.sessions.seed(
      AuthSession.create({
        userId: user.id,
        tokenHash: harness.tokens.hash(rawToken),
        expiresAt: DateTime.fromEpochMillis(now.epochMillis + 3_600_000),
        now,
      }),
    );

    return { userId: user.id.value, token: rawToken };
  }

  async function createYear(
    token: string,
    tenantId: string,
    body: Record<string, unknown> = { label: 'FY1405', startDate: YEAR_START, endDate: YEAR_END },
  ): Promise<Record<string, unknown>> {
    const response = await request(server())
      .post(`/api/v1/tenants/${tenantId}/fiscal-years`)
      .set('authorization', `Bearer ${token}`)
      .send(body)
      .expect(201);

    return response.body as Record<string, unknown>;
  }

  async function listPeriods(
    token: string,
    tenantId: string,
    fiscalYearId: string,
  ): Promise<Record<string, unknown>[]> {
    const response = await request(server())
      .get(`/api/v1/tenants/${tenantId}/fiscal-years/${fiscalYearId}/periods`)
      .set('authorization', `Bearer ${token}`)
      .expect(200);

    return response.body.data as Record<string, unknown>[];
  }

  /** Reads a period's stored state straight from the double, outside any scope. */
  async function periodStateOf(periodId: string): Promise<string | undefined> {
    const loaded = await harness.periods.get(fiscalPeriodIdFrom(periodId));
    return loaded?.aggregate.state.value;
  }

  describe('golden flow: create → list periods → select active → close → reopen', () => {
    it('runs the whole flow over HTTP and audits every write', async () => {
      const company = seedCompany();

      // 1. Create a fiscal year (201 + the resource shape).
      const year = await createYear(company.token, company.tenantId);
      expect(year).toMatchObject({
        tenantId: company.tenantId,
        label: 'FY1405',
        startDate: YEAR_START,
        endDate: YEAR_END,
        status: 'open',
        revision: 1,
      });
      const yearId = String(year.id);
      expect(yearId).toMatch(/^[0-9a-f-]{36}$/);

      // 2. List the generated periods: twelve months, in sequence order.
      const periods = await listPeriods(company.token, company.tenantId, yearId);
      expect(periods).toHaveLength(12);
      expect(periods.map((period) => period.sequence)).toEqual([
        1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12,
      ]);
      expect(periods[0]).toMatchObject({
        state: 'open',
        jalaliYear: 1405,
        startDate: YEAR_START,
        tenantId: company.tenantId,
      });
      const firstPeriod = String(periods[0].id);
      const secondPeriod = String(periods[1].id);

      // 3. Select the first period as active (200, still open).
      const selected = await request(server())
        .post(`/api/v1/tenants/${company.tenantId}/fiscal-periods/${firstPeriod}/select-active`)
        .set('authorization', `Bearer ${company.token}`)
        .expect(200);
      expect(selected.body).toMatchObject({ id: firstPeriod, state: 'open' });

      // 4. Close another period (200, now closed).
      const closed = await request(server())
        .post(`/api/v1/tenants/${company.tenantId}/fiscal-periods/${secondPeriod}/close`)
        .set('authorization', `Bearer ${company.token}`)
        .expect(200);
      expect(closed.body).toMatchObject({ id: secondPeriod, state: 'closed' });

      // 5. Reopen it with a reason (200, open again).
      const reopened = await request(server())
        .post(`/api/v1/tenants/${company.tenantId}/fiscal-periods/${secondPeriod}/reopen`)
        .set('authorization', `Bearer ${company.token}`)
        .send({ reason: 'Correction of a misallocated expense entry.' })
        .expect(200);
      expect(reopened.body).toMatchObject({ id: secondPeriod, state: 'open' });

      // Every write of the flow appears in the central audit trail.
      const actions = harness.audit.recorded.map((entry) => entry.action);
      expect(actions).toEqual(
        expect.arrayContaining([
          'accounting.fiscal_year.create',
          'accounting.period.select',
          'accounting.period.close',
          'accounting.period.reopen',
        ]),
      );

      const closeEntry = harness.audit.recorded.find(
        (entry) => entry.action === 'accounting.period.close' && entry.target?.id === secondPeriod,
      );
      expect(closeEntry?.outcome).toBe('success');
      expect(closeEntry?.actorUserId).toBe(company.userId);

      const reopenEntry = harness.audit.recorded.find(
        (entry) => entry.action === 'accounting.period.reopen' && entry.target?.id === secondPeriod,
      );
      expect(reopenEntry?.outcome).toBe('success');
      expect((reopenEntry?.metadata as { reason?: string }).reason).toBe(
        'Correction of a misallocated expense entry.',
      );

      const createEntry = harness.audit.recorded.find(
        (entry) => entry.action === 'accounting.fiscal_year.create' && entry.target?.id === yearId,
      );
      expect(createEntry?.outcome).toBe('success');

      const selectEntry = harness.audit.recorded.find(
        (entry) =>
          entry.action === 'accounting.period.select' && entry.target?.id === firstPeriod,
      );
      expect(selectEntry?.outcome).toBe('success');
    });

    it('reads the year back and lists it with the pagination envelope', async () => {
      const company = seedCompany();
      const year = await createYear(company.token, company.tenantId, {
        label: 'FY1406',
        startDate: NEXT_YEAR_START,
        endDate: NEXT_YEAR_END,
      });
      const yearId = String(year.id);

      const single = await request(server())
        .get(`/api/v1/tenants/${company.tenantId}/fiscal-years/${yearId}`)
        .set('authorization', `Bearer ${company.token}`)
        .expect(200);
      expect(single.body).toMatchObject({ id: yearId, label: 'FY1406' });

      const list = await request(server())
        .get(`/api/v1/tenants/${company.tenantId}/fiscal-years`)
        .set('authorization', `Bearer ${company.token}`)
        .expect(200);
      expect(list.body.meta).toMatchObject({ page: 1, limit: 20, total: 1, totalPages: 1 });
      expect(list.body.data.map((entry: { id: string }) => entry.id)).toEqual([yearId]);
      expect(
        list.body.data.every((entry: { tenantId: string }) => entry.tenantId === company.tenantId),
      ).toBe(true);
    });
  });

  describe('authorization: the role FIS-005 checks', () => {
    it('refuses close and reopen for a caller without the capability, and audits the refusal', async () => {
      const manager = seedCompany();
      // A member of the same company whose role lacks the capability.
      const viewer = seedMember(manager.tenantId, ['company.read']);

      const year = await createYear(manager.token, manager.tenantId);
      const periods = await listPeriods(manager.token, manager.tenantId, String(year.id));
      const target = String(periods[0].id);

      const deniedClose = await request(server())
        .post(`/api/v1/tenants/${manager.tenantId}/fiscal-periods/${target}/close`)
        .set('authorization', `Bearer ${viewer.token}`)
        .set('x-correlation-id', 'denied-close-1')
        .expect(403);
      expect(deniedClose.body.error).toMatchObject({
        code: 'AUTHORIZATION_DENIED',
        category: 'client',
        correlationId: 'denied-close-1',
      });
      expect(JSON.stringify(deniedClose.body)).not.toContain(MANAGE);

      const deniedReopen = await request(server())
        .post(`/api/v1/tenants/${manager.tenantId}/fiscal-periods/${target}/reopen`)
        .set('authorization', `Bearer ${viewer.token}`)
        .send({ reason: 'Should never run.' })
        .expect(403);
      expect(deniedReopen.body.error.code).toBe('AUTHORIZATION_DENIED');

      // The protected writes never ran: the period is untouched.
      expect(await periodStateOf(target)).toBe('open');

      // The refusal itself is in the audit trail (AUD-001), tied to the request.
      const denial = harness.audit.recorded.find(
        (entry) =>
          entry.action === 'authorization.denied' && entry.correlationId === 'denied-close-1',
      );
      expect(denial).toBeDefined();
      expect(denial?.outcome).toBe('denied');
      expect(denial?.metadata).toMatchObject({ permission: MANAGE });
      expect(denial?.actorUserId).toBe(viewer.userId);
    });

    it('refuses an unauthenticated request with 401', async () => {
      const company = seedCompany();

      const response = await request(server())
        .get(`/api/v1/tenants/${company.tenantId}/fiscal-years`)
        .expect(401);

      expect(response.body.error.code).toBe('AUTHENTICATION_REQUIRED');
    });

    it('refuses a caller with no membership in the target company', async () => {
      const company = seedCompany();
      const outsider = seedCompany();

      const response = await request(server())
        .get(`/api/v1/tenants/${company.tenantId}/fiscal-years`)
        .set('authorization', `Bearer ${outsider.token}`)
        .expect(403);

      expect(response.body.error.code).toBe('TENANT_ACCESS_DENIED');
    });
  });

  describe('error contract with the fiscal codes', () => {
    it('answers 409 with FISCAL_YEAR_OVERLAP for an overlapping year', async () => {
      const company = seedCompany();
      await createYear(company.token, company.tenantId);

      const response = await request(server())
        .post(`/api/v1/tenants/${company.tenantId}/fiscal-years`)
        .set('authorization', `Bearer ${company.token}`)
        .send({ label: 'FY-Overlap', startDate: '2026-06-01', endDate: '2027-05-31' })
        .expect(409);

      expect(response.body.error).toMatchObject({
        code: 'FISCAL_YEAR_OVERLAP',
        category: 'domain',
        message: expect.any(String),
        correlationId: expect.any(String),
      });
    });

    it('answers 409 with FISCAL_YEAR_LABEL_DUPLICATE for a reused label', async () => {
      const company = seedCompany();
      await createYear(company.token, company.tenantId);

      const response = await request(server())
        .post(`/api/v1/tenants/${company.tenantId}/fiscal-years`)
        .set('authorization', `Bearer ${company.token}`)
        .send({ label: 'FY1405', startDate: NEXT_YEAR_START, endDate: NEXT_YEAR_END })
        .expect(409);

      expect(response.body.error.code).toBe('FISCAL_YEAR_LABEL_DUPLICATE');
    });

    it('answers 400 with REOPEN_REASON_REQUIRED when the reason is missing', async () => {
      const company = seedCompany();
      const year = await createYear(company.token, company.tenantId);
      const periods = await listPeriods(company.token, company.tenantId, String(year.id));
      // The generation seeds period 1 as the active pointer, and the active
      // period cannot be closed — so the second month is the one under test.
      const target = String(periods[1].id);

      await request(server())
        .post(`/api/v1/tenants/${company.tenantId}/fiscal-periods/${target}/close`)
        .set('authorization', `Bearer ${company.token}`)
        .expect(200);

      const missing = await request(server())
        .post(`/api/v1/tenants/${company.tenantId}/fiscal-periods/${target}/reopen`)
        .set('authorization', `Bearer ${company.token}`)
        .send({})
        .expect(400);
      expect(missing.body.error).toMatchObject({
        code: 'REOPEN_REASON_REQUIRED',
        category: 'domain',
      });

      const blank = await request(server())
        .post(`/api/v1/tenants/${company.tenantId}/fiscal-periods/${target}/reopen`)
        .set('authorization', `Bearer ${company.token}`)
        .send({ reason: '   ' })
        .expect(400);
      expect(blank.body.error.code).toBe('REOPEN_REASON_REQUIRED');

      // The period stayed closed: the refusal changed nothing.
      expect(await periodStateOf(target)).toBe('closed');
    });

    it('answers 422 with FISCAL_PERIOD_NOT_OPEN when a closed period is selected as active', async () => {
      const company = seedCompany();
      const year = await createYear(company.token, company.tenantId);
      const periods = await listPeriods(company.token, company.tenantId, String(year.id));
      const first = String(periods[0].id);
      const second = String(periods[1].id);

      await request(server())
        .post(`/api/v1/tenants/${company.tenantId}/fiscal-periods/${first}/select-active`)
        .set('authorization', `Bearer ${company.token}`)
        .expect(200);
      await request(server())
        .post(`/api/v1/tenants/${company.tenantId}/fiscal-periods/${second}/close`)
        .set('authorization', `Bearer ${company.token}`)
        .expect(200);

      const response = await request(server())
        .post(`/api/v1/tenants/${company.tenantId}/fiscal-periods/${second}/select-active`)
        .set('authorization', `Bearer ${company.token}`)
        .expect(422);

      expect(response.body.error).toMatchObject({
        code: 'FISCAL_PERIOD_NOT_OPEN',
        category: 'domain',
      });
      // The active pointer did not move to the closed period.
      expect(await periodStateOf(first)).toBe('open');
    });

    it('answers 409 with PERIOD_STATE_INVALID when the active period is closed', async () => {
      const company = seedCompany();
      const year = await createYear(company.token, company.tenantId);
      const periods = await listPeriods(company.token, company.tenantId, String(year.id));
      const first = String(periods[0].id);

      await request(server())
        .post(`/api/v1/tenants/${company.tenantId}/fiscal-periods/${first}/select-active`)
        .set('authorization', `Bearer ${company.token}`)
        .expect(200);

      const response = await request(server())
        .post(`/api/v1/tenants/${company.tenantId}/fiscal-periods/${first}/close`)
        .set('authorization', `Bearer ${company.token}`)
        .expect(409);

      expect(response.body.error.code).toBe('PERIOD_STATE_INVALID');
      expect(await periodStateOf(first)).toBe('open');
    });

    it('answers 404 with FISCAL_PERIOD_NOT_FOUND for a period of another company', async () => {
      const managerA = seedCompany();
      const managerB = seedCompany();

      const yearB = await createYear(managerB.token, managerB.tenantId);
      const periodsB = await listPeriods(managerB.token, managerB.tenantId, String(yearB.id));
      const foreignPeriod = String(periodsB[0].id);

      const response = await request(server())
        .post(`/api/v1/tenants/${managerA.tenantId}/fiscal-periods/${foreignPeriod}/close`)
        .set('authorization', `Bearer ${managerA.token}`)
        .expect(404);

      expect(response.body.error.code).toBe('FISCAL_PERIOD_NOT_FOUND');
      // B's period is untouched.
      expect(await periodStateOf(foreignPeriod)).toBe('open');
    });

    it('rejects invalid input at the boundary with per-field detail', async () => {
      const company = seedCompany();

      const badDate = await request(server())
        .post(`/api/v1/tenants/${company.tenantId}/fiscal-years`)
        .set('authorization', `Bearer ${company.token}`)
        .send({ label: 'FY-Bad', startDate: '21-03-2026', endDate: YEAR_END })
        .expect(400);
      expect(badDate.body.error.code).toBe('VALIDATION_FAILED');
      expect(badDate.body.error.details.map((detail: { field: string }) => detail.field)).toContain(
        'startDate',
      );

      const badRange = await request(server())
        .post(`/api/v1/tenants/${company.tenantId}/fiscal-years`)
        .set('authorization', `Bearer ${company.token}`)
        .send({ label: 'FY-Bad', startDate: YEAR_END, endDate: YEAR_START })
        .expect(400);
      expect(badRange.body.error.code).toBe('FISCAL_YEAR_INVALID_RANGE');
    });
  });

  describe('tenant context: never from the body or the query', () => {
    it('rejects a tenantId in the request body as an unknown property', async () => {
      const company = seedCompany();
      const otherTenant = seedCompany();

      const response = await request(server())
        .post(`/api/v1/tenants/${company.tenantId}/fiscal-years`)
        .set('authorization', `Bearer ${company.token}`)
        .send({
          label: 'Sneaky',
          startDate: YEAR_START,
          endDate: YEAR_END,
          tenantId: otherTenant.tenantId,
        })
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_FAILED');
      const fields = response.body.error.details.map((detail: { field: string }) => detail.field);
      expect(fields).toContain('tenantId');

      // The year was not created anywhere.
      const list = await request(server())
        .get(`/api/v1/tenants/${company.tenantId}/fiscal-years`)
        .set('authorization', `Bearer ${company.token}`)
        .expect(200);
      expect(list.body.data).toHaveLength(0);
    });

    it('rejects a tenantId in the query as an unknown property', async () => {
      const company = seedCompany();
      const otherTenant = seedCompany();

      const response = await request(server())
        .get(`/api/v1/tenants/${company.tenantId}/fiscal-years?tenantId=${otherTenant.tenantId}`)
        .set('authorization', `Bearer ${company.token}`)
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_FAILED');
      const fields = response.body.error.details.map((detail: { field: string }) => detail.field);
      expect(fields).toContain('tenantId');
    });

    it('treats a conflicting x-tenant-id header as a failed claim, not a selector', async () => {
      const company = seedCompany();
      const otherTenant = seedCompany();

      const response = await request(server())
        .get(`/api/v1/tenants/${company.tenantId}/fiscal-years`)
        .set('authorization', `Bearer ${company.token}`)
        .set('x-tenant-id', otherTenant.tenantId)
        .expect(403);

      expect(response.body.error.code).toBe('TENANT_ACCESS_DENIED');
    });
  });

  describe('tenant isolation through the API', () => {
    it('cannot read, close or reopen another company’s year or period', async () => {
      const companyA = seedCompany();
      const companyB = seedCompany();

      const yearB = await createYear(companyB.token, companyB.tenantId, {
        label: 'FY-B',
        startDate: YEAR_START,
        endDate: YEAR_END,
      });
      const yearIdB = String(yearB.id);
      const periodsB = await listPeriods(companyB.token, companyB.tenantId, yearIdB);
      const periodIdB = String(periodsB[0].id);

      // Listing B's years from B's path with A's identity: not a member.
      const listDenied = await request(server())
        .get(`/api/v1/tenants/${companyB.tenantId}/fiscal-years`)
        .set('authorization', `Bearer ${companyA.token}`)
        .expect(403);
      expect(listDenied.body.error.code).toBe('TENANT_ACCESS_DENIED');

      // Reading B's year through A's own path: answered as not found,
      // never confirming the record exists.
      const readDenied = await request(server())
        .get(`/api/v1/tenants/${companyA.tenantId}/fiscal-years/${yearIdB}`)
        .set('authorization', `Bearer ${companyA.token}`)
        .expect(404);
      expect(readDenied.body.error.code).toBe('FISCAL_YEAR_NOT_FOUND');

      const periodsDenied = await request(server())
        .get(`/api/v1/tenants/${companyA.tenantId}/fiscal-years/${yearIdB}/periods`)
        .set('authorization', `Bearer ${companyA.token}`)
        .expect(404);
      expect(periodsDenied.body.error.code).toBe('FISCAL_YEAR_NOT_FOUND');

      // Closing or reopening B's period through A's path: not found.
      const closeDenied = await request(server())
        .post(`/api/v1/tenants/${companyA.tenantId}/fiscal-periods/${periodIdB}/close`)
        .set('authorization', `Bearer ${companyA.token}`)
        .expect(404);
      expect(closeDenied.body.error.code).toBe('FISCAL_PERIOD_NOT_FOUND');

      const reopenDenied = await request(server())
        .post(`/api/v1/tenants/${companyA.tenantId}/fiscal-periods/${periodIdB}/reopen`)
        .set('authorization', `Bearer ${companyA.token}`)
        .send({ reason: 'Cross-tenant attempt.' })
        .expect(404);
      expect(reopenDenied.body.error.code).toBe('FISCAL_PERIOD_NOT_FOUND');

      // Through B's path, A is simply not a member.
      const pathDenied = await request(server())
        .post(`/api/v1/tenants/${companyB.tenantId}/fiscal-periods/${periodIdB}/close`)
        .set('authorization', `Bearer ${companyA.token}`)
        .expect(403);
      expect(pathDenied.body.error.code).toBe('TENANT_ACCESS_DENIED');

      // B's data is untouched by every attempt above.
      expect(await periodStateOf(periodIdB)).toBe('open');
      const stillThere = await request(server())
        .get(`/api/v1/tenants/${companyB.tenantId}/fiscal-years/${yearIdB}`)
        .set('authorization', `Bearer ${companyB.token}`)
        .expect(200);
      expect(stillThere.body.id).toBe(yearIdB);
    });
  });

  describe('OpenAPI document', () => {
    const operations: readonly {
      readonly method: 'get' | 'post';
      readonly path: string;
      readonly success: string;
      readonly body?: string;
      readonly errors: readonly string[];
    }[] = [
      {
        method: 'post',
        path: '/api/v1/tenants/{tenantId}/fiscal-years',
        success: '201',
        body: 'CreateFiscalYearDto',
        errors: ['400', '401', '403', '409', '422'],
      },
      {
        method: 'get',
        path: '/api/v1/tenants/{tenantId}/fiscal-years',
        success: '200',
        errors: ['400', '401', '403'],
      },
      {
        method: 'get',
        path: '/api/v1/tenants/{tenantId}/fiscal-years/{fiscalYearId}',
        success: '200',
        errors: ['400', '401', '403', '404'],
      },
      {
        method: 'get',
        path: '/api/v1/tenants/{tenantId}/fiscal-years/{fiscalYearId}/periods',
        success: '200',
        errors: ['400', '401', '403', '404'],
      },
      {
        method: 'post',
        path: '/api/v1/tenants/{tenantId}/fiscal-periods/{periodId}/select-active',
        success: '200',
        errors: ['400', '401', '403', '404', '422'],
      },
      {
        method: 'post',
        path: '/api/v1/tenants/{tenantId}/fiscal-periods/{periodId}/close',
        success: '200',
        errors: ['400', '401', '403', '404', '409'],
      },
      {
        method: 'post',
        path: '/api/v1/tenants/{tenantId}/fiscal-periods/{periodId}/reopen',
        success: '200',
        body: 'ReopenFiscalPeriodDto',
        errors: ['400', '401', '403', '404', '409'],
      },
    ];

    it('documents every operation with bearer security, request, response and error examples', async () => {
      const document = await request(server()).get('/api/docs-json').expect(200);

      for (const operation of operations) {
        const entry = document.body.paths[operation.path]?.[operation.method];
        expect(entry, `${operation.method.toUpperCase()} ${operation.path}`).toBeDefined();
        expect(entry.security).toEqual([{ bearer: [] }]);

        // The success response carries an example value.
        const success = entry.responses[operation.success];
        expect(success, `${operation.path} ${operation.success}`).toBeDefined();
        const successContent = success.content['application/json'];
        expect(successContent.examples ?? successContent.example).toBeDefined();

        // Request body (where the route has one) is a described schema.
        if (operation.body !== undefined) {
          expect(JSON.stringify(entry.requestBody.content['application/json'].schema)).toContain(
            operation.body,
          );
        }

        // Every documented error status carries an example value.
        for (const status of operation.errors) {
          const errorResponse = entry.responses[status];
          expect(errorResponse, `${operation.path} ${status}`).toBeDefined();
          const content = errorResponse.content['application/json'];
          expect(
            content.examples ?? content.example,
            `${operation.path} ${status} example`,
          ).toBeDefined();
        }
      }
    });
  });
});
