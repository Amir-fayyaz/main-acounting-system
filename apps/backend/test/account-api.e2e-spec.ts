import { randomUUID } from 'node:crypto';

import type { INestApplication } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { configureApplication } from '../src/bootstrap.js';
import { AppConfigModule } from '../src/infrastructure/config/app-config.module.js';
import { TRANSACTION_BOUNDARY } from '../src/infrastructure/database/database.tokens.js';
import { AUDIT_RECORDER } from '../src/modules/audit/application/audit.tokens.js';
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
import { AuthorizeActionUseCase } from '../src/modules/identity/application/use-cases/authorize-action.use-case.js';
import { GetAuthenticatedSessionUseCase } from '../src/modules/identity/application/use-cases/get-authenticated-session.use-case.js';
import { MembershipTenantMembershipAdapter } from '../src/modules/identity/infrastructure/authorization/membership-tenant-membership.adapter.js';
import { CryptoSessionTokenService } from '../src/modules/identity/infrastructure/security/crypto-session-token-service.js';
import { AuthorizationGuard } from '../src/modules/identity/presentation/guards/authorization.guard.js';
import {
  ACCOUNT_AUDIT_PORT,
  ACCOUNT_AUTHORIZATION_PORT,
  ACCOUNT_REPOSITORY,
  ACCOUNT_ROLE_REPOSITORY,
  ACCOUNT_TEMPLATE_REPOSITORY,
  ACCOUNT_USAGE_PORT,
} from '../src/modules/accounting/application/accounting.tokens.js';
import {
  AllowAllAccountantAuthorizationPort,
  AlwaysUnusedAccountUsagePort,
  NoopAccountAuditPort,
} from '../src/modules/accounting/application/ports/account.ports.js';
import {
  CreateAccountUseCase,
  DeactivateAccountUseCase,
  DeleteAccountUseCase,
  ReactivateAccountUseCase,
  UpdateAccountUseCase,
} from '../src/modules/accounting/application/use-cases/account-management.use-case.js';
import {
  GetAccountTreeUseCase,
  ListAccountRoleMappingsUseCase,
  ListAccountsUseCase,
} from '../src/modules/accounting/application/use-cases/account-query.use-case.js';
import {
  GetRoleCompletenessUseCase,
  MapAccountRoleUseCase,
  ResolveAccountRoleUseCase,
} from '../src/modules/accounting/application/use-cases/account-role.use-case.js';
import { ActivateStandardChartUseCase } from '../src/modules/accounting/application/use-cases/activate-standard-chart.use-case.js';
import { AccountsController } from '../src/modules/accounting/presentation/controllers/accounts.controller.js';
import { AccountRolesController } from '../src/modules/accounting/presentation/controllers/account-roles.controller.js';
import { DateTime } from '../src/shared/time/date-time.js';
import { RecordingAuditTrail } from './support/audit-doubles.js';
import {
  InMemoryAuthSessionRepository,
  RecordingAuthenticationAudit,
} from './support/authentication-doubles.js';
import {
  InMemoryAccountRepository,
  InMemoryAccountRoleRepository,
  InMemoryAccountTemplateApplicationRepository,
} from './support/account-doubles.js';
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
 * The chart-of-accounts resources over the real HTTP boundary (ACC-001.7).
 *
 * The suite composes the real controllers, the real use cases, the real global
 * authorization guard, the real validation pipe, the real error filter and the
 * real OpenAPI setup over in-memory repositories, so it pins the issue's own
 * verification list:
 *
 * - the golden flow: activate the template → read the tree → search in Persian
 *   → create a company account → map the roles → deactivate → reactivate →
 *   delete;
 * - duplicate codes inside one company and the same code in two companies;
 * - the Persian search folding yeh/kaf and digit variants;
 * - optimistic concurrency: a stale `version` answers 409, never overwrites;
 * - role mapping read, update and completeness;
 * - tenant isolation through the API: A cannot read, change or delete B's
 *   accounts, including by id manipulation;
 * - a caller without the capability is refused (403) and nothing is changed;
 * - request validation: unknown properties (including `tenantId`), malformed
 *   ids and missing bodies;
 * - every operation documented in the generated OpenAPI document with
 *   request, response and error examples.
 *
 * Each test seeds its own company, so the per-tenant rules never collide across
 * tests. Persistence against MySQL remains covered by `account-persistence`.
 */

const READ = 'accounting.account.read';
const MANAGE = 'accounting.account.manage';
const TEMPLATE_VERSION = 'ir-standard-v1';

interface Company {
  readonly tenantId: string;
  readonly userId: string;
  readonly token: string;
}

interface Harness {
  readonly app: INestApplication;
  readonly accounts: InMemoryAccountRepository;
  readonly roles: InMemoryAccountRoleRepository;
  readonly templates: InMemoryAccountTemplateApplicationRepository;
  readonly audit: RecordingAuditTrail;
  readonly users: InMemoryUserRepository;
  readonly memberships: InMemoryMembershipRepository;
  readonly assignments: InMemoryMembershipRoleRepository;
  readonly roleCatalog: InMemoryRoleRepository;
  readonly sessions: InMemoryAuthSessionRepository;
  readonly tokens: CryptoSessionTokenService;
}

async function createHarness(): Promise<Harness> {
  const users = new InMemoryUserRepository();
  const memberships = new InMemoryMembershipRepository();
  const assignments = new InMemoryMembershipRoleRepository();
  const roleCatalog = new InMemoryRoleRepository();
  const sessions = new InMemoryAuthSessionRepository();
  const tokens = new CryptoSessionTokenService();
  const authenticationAudit = new RecordingAuthenticationAudit();
  const audit = new RecordingAuditTrail();
  const boundary = new PassthroughTransactionBoundary();

  const accounts = new InMemoryAccountRepository();
  const roles = new InMemoryAccountRoleRepository();
  const templates = new InMemoryAccountTemplateApplicationRepository();
  const usage = new AlwaysUnusedAccountUsagePort();
  const accountAuthorization = new AllowAllAccountantAuthorizationPort();
  const accountAudit = new NoopAccountAuditPort();

  const moduleRef = await Test.createTestingModule({
    imports: [AppConfigModule],
    controllers: [AccountsController, AccountRolesController],
    providers: [
      { provide: USER_REPOSITORY, useValue: users },
      { provide: MEMBERSHIP_REPOSITORY, useValue: memberships },
      { provide: MEMBERSHIP_ROLE_REPOSITORY, useValue: assignments },
      { provide: ROLE_REPOSITORY, useValue: roleCatalog },
      { provide: AUTH_SESSION_REPOSITORY, useValue: sessions },
      { provide: SESSION_TOKEN_SERVICE, useValue: tokens },
      { provide: AUTHENTICATION_AUDIT_RECORDER, useValue: authenticationAudit },
      { provide: AUDIT_RECORDER, useValue: audit },
      { provide: TRANSACTION_BOUNDARY, useValue: boundary },
      { provide: ACCOUNT_REPOSITORY, useValue: accounts },
      { provide: ACCOUNT_ROLE_REPOSITORY, useValue: roles },
      { provide: ACCOUNT_TEMPLATE_REPOSITORY, useValue: templates },
      { provide: ACCOUNT_USAGE_PORT, useValue: usage },
      { provide: ACCOUNT_AUTHORIZATION_PORT, useValue: accountAuthorization },
      { provide: ACCOUNT_AUDIT_PORT, useValue: accountAudit },
      {
        provide: AUTHORIZATION,
        useFactory: () =>
          new AuthorizeActionUseCase(
            users,
            memberships,
            new MembershipTenantMembershipAdapter(memberships),
            assignments,
            roleCatalog,
            audit,
          ),
      },
      {
        provide: GetAuthenticatedSessionUseCase,
        useFactory: () =>
          new GetAuthenticatedSessionUseCase(users, sessions, tokens, authenticationAudit),
      },
      {
        provide: CreateAccountUseCase,
        useFactory: () =>
          new CreateAccountUseCase(accounts, accountAuthorization, accountAudit, boundary),
      },
      {
        provide: UpdateAccountUseCase,
        useFactory: () =>
          new UpdateAccountUseCase(
            accounts,
            usage,
            accountAuthorization,
            accountAudit,
            boundary,
            roles,
          ),
      },
      {
        provide: DeactivateAccountUseCase,
        useFactory: () =>
          new DeactivateAccountUseCase(
            accounts,
            usage,
            accountAuthorization,
            accountAudit,
            boundary,
            roles,
          ),
      },
      {
        provide: ReactivateAccountUseCase,
        useFactory: () =>
          new ReactivateAccountUseCase(accounts, usage, accountAuthorization, accountAudit, boundary),
      },
      {
        provide: DeleteAccountUseCase,
        useFactory: () =>
          new DeleteAccountUseCase(accounts, usage, accountAuthorization, accountAudit, boundary),
      },
      {
        provide: ActivateStandardChartUseCase,
        useFactory: () =>
          new ActivateStandardChartUseCase(
            accounts,
            templates,
            accountAuthorization,
            accountAudit,
            boundary,
          ),
      },
      {
        provide: MapAccountRoleUseCase,
        useFactory: () =>
          new MapAccountRoleUseCase(accounts, roles, accountAuthorization, accountAudit, boundary),
      },
      {
        provide: ResolveAccountRoleUseCase,
        useFactory: () => new ResolveAccountRoleUseCase(roles, accounts),
      },
      {
        provide: GetRoleCompletenessUseCase,
        useFactory: () => new GetRoleCompletenessUseCase(roles, accounts),
      },
      {
        provide: ListAccountsUseCase,
        useFactory: () => new ListAccountsUseCase(accounts),
      },
      {
        provide: GetAccountTreeUseCase,
        useFactory: () => new GetAccountTreeUseCase(accounts),
      },
      {
        provide: ListAccountRoleMappingsUseCase,
        useFactory: () => new ListAccountRoleMappingsUseCase(roles),
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
    accounts,
    roles,
    templates,
    audit,
    users,
    memberships,
    assignments,
    roleCatalog,
    sessions,
    tokens,
  };
}

describe('chart of accounts API (e2e)', () => {
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

  function seedCompany(permissions: readonly string[] = [READ, MANAGE]): Company {
    const tenantId = randomUUID();
    const member = seedMember(tenantId, permissions);

    return { tenantId, userId: member.userId, token: member.token };
  }

  function seedMember(
    tenantId: string,
    permissions: readonly string[],
  ): { readonly userId: string; readonly token: string } {
    const user = User.create({
      displayName: 'Account Tester',
      email: `accounts.${randomUUID()}@example.com`,
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
      name: RoleName.from('Accountant'),
      now: DateTime.now(),
      permissions: permissions.map((key) => PermissionKey.from(key)),
    });
    harness.roleCatalog.seed(role);
    harness.assignments.seed(
      MembershipRole.assign({
        tenantId: identityTenantReference(tenantId),
        membershipId: membership.id,
        roleId: role.id,
        now: DateTime.now(),
      }),
    );

    const rawToken = `accounts-token-${randomUUID()}`;
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

  function api(company: Company): string {
    return `/api/v1/tenants/${company.tenantId}/accounts`;
  }

  async function activateTemplate(company: Company): Promise<Record<string, unknown>> {
    const response = await request(server())
      .post(`${api(company)}/standard-template/activate`)
      .set('authorization', `Bearer ${company.token}`)
      .send({ templateVersion: TEMPLATE_VERSION })
      .expect(201);

    return response.body as Record<string, unknown>;
  }

  async function createAccount(
    company: Company,
    body: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    const response = await request(server())
      .post(api(company))
      .set('authorization', `Bearer ${company.token}`)
      .send(body)
      .expect(201);

    return response.body as Record<string, unknown>;
  }

  async function listAccounts(
    company: Company,
    query = '',
  ): Promise<{ readonly data: Record<string, unknown>[]; readonly meta: Record<string, unknown> }> {
    const response = await request(server())
      .get(`${api(company)}${query}`)
      .set('authorization', `Bearer ${company.token}`)
      .expect(200);

    return response.body as {
      readonly data: Record<string, unknown>[];
      readonly meta: Record<string, unknown>;
    };
  }

  describe('standard template', () => {
    it('creates the chart once for one company, visible only to that company', async () => {
      const companyA = seedCompany();
      const companyB = seedCompany();

      const activation = await activateTemplate(companyA);
      expect(activation.templateVersion).toBe(TEMPLATE_VERSION);
      expect(activation.createdCount).toBeGreaterThan(0);

      const tree = await request(server())
        .get(`${api(companyA)}/tree`)
        .set('authorization', `Bearer ${companyA.token}`)
        .expect(200);

      expect(tree.body.roots).toHaveLength(5);
      expect(tree.body.roots[0]).toMatchObject({ code: '1', name: 'دارایی‌ها', level: 1 });
      expect(tree.body.roots[0].children.length).toBeGreaterThan(0);

      // Company B's chart is still empty: A's rows are not visible to B.
      const companyBList = await listAccounts(companyB);
      expect(companyBList.data).toHaveLength(0);
      expect(companyBList.meta.total).toBe(0);
    });

    it('refuses a second activation of the same version and creates nothing', async () => {
      const company = seedCompany();
      await activateTemplate(company);
      const before = await listAccounts(company, '?limit=100');

      const response = await request(server())
        .post(`${api(company)}/standard-template/activate`)
        .set('authorization', `Bearer ${company.token}`)
        .send({ templateVersion: TEMPLATE_VERSION })
        .expect(409);

      expect(response.body.error.code).toBe('ACCOUNT_TEMPLATE_ALREADY_APPLIED');

      const after = await listAccounts(company, '?limit=100');
      expect(after.meta.total).toBe(before.meta.total);
    });
  });

  describe('create', () => {
    it('creates a root account and records the tenant from the path', async () => {
      const company = seedCompany();

      const created = await createAccount(company, {
        code: '1100',
        name: 'صندوق',
        type: 'asset',
        postable: true,
      });

      expect(created).toMatchObject({
        tenantId: company.tenantId,
        code: '1100',
        name: 'صندوق',
        level: 1,
        parentId: null,
        type: 'asset',
        normalBalance: 'debit',
        postable: true,
        active: true,
        system: false,
        revision: 1,
      });
    });

    it('derives a child level, type and normal balance from its parent', async () => {
      const company = seedCompany();
      const parent = await createAccount(company, {
        code: '2000',
        name: 'بدهی‌ها',
        type: 'liability',
      });

      const child = await createAccount(company, {
        code: '2001',
        name: 'حساب‌های پرداختنی',
        parentId: parent.id,
        type: 'liability',
        postable: true,
      });

      expect(child).toMatchObject({
        parentId: parent.id,
        level: 2,
        type: 'liability',
        normalBalance: 'credit',
      });
    });

    it('rejects a duplicate code in one company and allows it in another', async () => {
      const companyA = seedCompany();
      const companyB = seedCompany();

      await createAccount(companyA, { code: '3000', name: 'سرمایه', type: 'equity' });

      const duplicate = await request(server())
        .post(api(companyA))
        .set('authorization', `Bearer ${companyA.token}`)
        .send({ code: '3000', name: 'سرمایه دوم', type: 'equity' })
        .expect(409);
      expect(duplicate.body.error.code).toBe('ACCOUNT_CODE_DUPLICATE');

      const otherCompany = await createAccount(companyB, {
        code: '3000',
        name: 'سرمایه',
        type: 'equity',
      });
      expect(otherCompany.code).toBe('3000');
      expect(otherCompany.tenantId).toBe(companyB.tenantId);
    });

    it('rejects unknown properties, including a client-supplied tenant id', async () => {
      const company = seedCompany();

      const response = await request(server())
        .post(api(company))
        .set('authorization', `Bearer ${company.token}`)
        .send({
          code: '4000',
          name: 'درآمد',
          type: 'revenue',
          tenantId: randomUUID(),
        })
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_FAILED');
      expect(response.body.error.details).toContainEqual(
        expect.objectContaining({ field: 'tenantId' }),
      );
    });

    it('rejects a malformed or unknown type before the use case runs', async () => {
      const company = seedCompany();

      const response = await request(server())
        .post(api(company))
        .set('authorization', `Bearer ${company.token}`)
        .send({ code: '4000', name: 'درآمد', type: 'not-a-type' })
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_FAILED');
      expect(response.body.error.details).toContainEqual(
        expect.objectContaining({ field: 'type' }),
      );
    });
  });

  describe('list and Persian search', () => {
    it('finds accounts regardless of Arabic/Persian yeh, kaf and digit variants', async () => {
      const company = seedCompany();
      await activateTemplate(company);

      // The template writes the Persian keheh and Persian yeh.
      const kaf = await listAccounts(company, '?search=%D8%A8%D8%A7%D9%86%D9%83'); // بانك
      expect(kaf.data.map((account) => account.code)).toContain('110102');

      const yeh = await listAccounts(company, '?search=%D8%AF%D8%B1%D9%8A%D8%A7%D9%81%D8%AA%D9%86%D9%8A'); // دريافتني
      expect(yeh.data.map((account) => account.name)).toContain('حساب‌های دریافتنی تجاری');

      // Persian digits for a numeric code.
      const digits = await listAccounts(company, '?search=%DB%B1%DB%B1%DB%B0%DB%B1%DB%B0%DB%B1'); // ۱۱۰۱۰۱
      expect(digits.data.map((account) => account.code)).toContain('110101');
    });

    it('combines filters and paginates in the standard envelope', async () => {
      const company = seedCompany();
      await activateTemplate(company);

      const postableAssets = await listAccounts(company, '?type=asset&postable=true&limit=2');
      expect(postableAssets.data).toHaveLength(2);
      expect(postableAssets.meta).toMatchObject({ page: 1, limit: 2 });
      expect(Number(postableAssets.meta.total)).toBeGreaterThan(2);
      expect(postableAssets.data.every((account) => account.type === 'asset')).toBe(true);
      expect(postableAssets.data.every((account) => account.postable === true)).toBe(true);

      const inactive = await listAccounts(company, '?active=false');
      expect(inactive.data).toHaveLength(0);
    });

    it('rejects a non-boolean filter with field detail', async () => {
      const company = seedCompany();

      const response = await request(server())
        .get(`${api(company)}?active=maybe`)
        .set('authorization', `Bearer ${company.token}`)
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_FAILED');
      expect(response.body.error.details).toContainEqual(
        expect.objectContaining({ field: 'active' }),
      );
    });
  });

  describe('tree', () => {
    it('returns one subtree when a root id is given', async () => {
      const company = seedCompany();
      await activateTemplate(company);

      const listed = await listAccounts(company, '?search=1101');
      const group = listed.data.find((account) => account.code === '1101');
      expect(group).toBeDefined();

      const response = await request(server())
        .get(`${api(company)}/tree?rootId=${String(group?.id)}`)
        .set('authorization', `Bearer ${company.token}`)
        .expect(200);

      expect(response.body.roots).toHaveLength(1);
      expect(response.body.roots[0]).toMatchObject({ code: '1101', level: 3 });
      expect(response.body.roots[0].children.length).toBeGreaterThan(0);
    });

    it("answers a foreign or unknown root id exactly like a missing account", async () => {
      const companyA = seedCompany();
      const companyB = seedCompany();
      await activateTemplate(companyB);

      const bList = await listAccounts(companyB);
      const foreignRoot = bList.data[0]?.id;

      const foreign = await request(server())
        .get(`${api(companyA)}/tree?rootId=${String(foreignRoot)}`)
        .set('authorization', `Bearer ${companyA.token}`)
        .expect(404);
      expect(foreign.body.error.code).toBe('ACCOUNT_NOT_FOUND');

      const missing = await request(server())
        .get(`${api(companyA)}/tree?rootId=${randomUUID()}`)
        .set('authorization', `Bearer ${companyA.token}`)
        .expect(404);
      // Same code, category and message; only the per-request correlation id
      // may differ.
      expect(missing.body.error).toMatchObject({
        code: 'ACCOUNT_NOT_FOUND',
        category: foreign.body.error.category,
        message: foreign.body.error.message,
      });
    });
  });

  describe('update and optimistic concurrency', () => {
    it('applies the change and advances the revision', async () => {
      const company = seedCompany();
      const account = await createAccount(company, {
        code: '1100',
        name: 'صندوق',
        type: 'asset',
        postable: true,
      });

      const updated = await request(server())
        .patch(`${api(company)}/${String(account.id)}`)
        .set('authorization', `Bearer ${company.token}`)
        .send({ name: 'صندوق مرکزی', version: 1 })
        .expect(200);

      expect(updated.body).toMatchObject({
        name: 'صندوق مرکزی',
        revision: 2,
        code: '1100',
      });
    });

    it('refuses a stale version with a conflict instead of overwriting', async () => {
      const company = seedCompany();
      const account = await createAccount(company, {
        code: '1100',
        name: 'صندوق',
        type: 'asset',
        postable: true,
      });

      await request(server())
        .patch(`${api(company)}/${String(account.id)}`)
        .set('authorization', `Bearer ${company.token}`)
        .send({ name: 'صندوق مرکزی', version: 1 })
        .expect(200);

      const stale = await request(server())
        .patch(`${api(company)}/${String(account.id)}`)
        .set('authorization', `Bearer ${company.token}`)
        .send({ name: 'نام دیرتر', version: 1 })
        .expect(409);

      expect(stale.body.error.code).toBe('CONFLICT');

      const list = await listAccounts(company, '?search=1100');
      expect(list.data[0]?.name).toBe('صندوق مرکزی');
      expect(list.data[0]?.revision).toBe(2);
    });

    it('requires the version in the body', async () => {
      const company = seedCompany();
      const account = await createAccount(company, {
        code: '1100',
        name: 'صندوق',
        type: 'asset',
      });

      const response = await request(server())
        .patch(`${api(company)}/${String(account.id)}`)
        .set('authorization', `Bearer ${company.token}`)
        .send({ name: 'بدون نسخه' })
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_FAILED');
      expect(response.body.error.details).toContainEqual(
        expect.objectContaining({ field: 'version' }),
      );
    });

    it('refuses to make an account with children postable', async () => {
      const company = seedCompany();
      const parent = await createAccount(company, {
        code: '5000',
        name: 'هزینه‌ها',
        type: 'expense',
      });
      await createAccount(company, {
        code: '5001',
        name: 'هزینه اجاره',
        parentId: parent.id,
        type: 'expense',
        postable: true,
      });

      const response = await request(server())
        .patch(`${api(company)}/${String(parent.id)}`)
        .set('authorization', `Bearer ${company.token}`)
        .send({ postable: true, version: 1 })
        .expect(422);

      expect(response.body.error.code).toBe('ACCOUNT_POSTABLE_NOT_LEAF');
    });

    it('refuses unknown and malformed account ids', async () => {
      const company = seedCompany();

      const unknown = await request(server())
        .patch(`${api(company)}/${randomUUID()}`)
        .set('authorization', `Bearer ${company.token}`)
        .send({ name: 'گمشده', version: 1 })
        .expect(404);
      expect(unknown.body.error.code).toBe('ACCOUNT_NOT_FOUND');

      const malformed = await request(server())
        .patch(`${api(company)}/not-a-uuid`)
        .set('authorization', `Bearer ${company.token}`)
        .send({ name: 'بد', version: 1 })
        .expect(400);
      expect(malformed.body.error.code).toBe('VALIDATION_FAILED');
    });
  });

  describe('deactivate, reactivate and delete', () => {
    it('deactivates and reactivates an account', async () => {
      const company = seedCompany();
      const account = await createAccount(company, {
        code: '1100',
        name: 'صندوق',
        type: 'asset',
        postable: true,
      });

      const deactivated = await request(server())
        .post(`${api(company)}/${String(account.id)}/deactivate`)
        .set('authorization', `Bearer ${company.token}`)
        .send({ version: 1 })
        .expect(200);
      expect(deactivated.body).toMatchObject({ active: false, revision: 2 });

      const reactivated = await request(server())
        .post(`${api(company)}/${String(account.id)}/reactivate`)
        .set('authorization', `Bearer ${company.token}`)
        .send({ version: 2 })
        .expect(200);
      expect(reactivated.body).toMatchObject({ active: true, revision: 3 });
    });

    it('refuses to deactivate a role-mapped account', async () => {
      const company = seedCompany();
      const account = await createAccount(company, {
        code: '1100',
        name: 'موجودی کالا',
        type: 'asset',
        postable: true,
      });

      await request(server())
        .put(`/api/v1/tenants/${company.tenantId}/account-roles/inventory`)
        .set('authorization', `Bearer ${company.token}`)
        .send({ accountId: account.id })
        .expect(200);

      const response = await request(server())
        .post(`${api(company)}/${String(account.id)}/deactivate`)
        .set('authorization', `Bearer ${company.token}`)
        .send({ version: 1 })
        .expect(422);

      expect(response.body.error.code).toBe('ACCOUNT_ROLE_ACCOUNT_PROTECTED');
    });

    it('deletes an unused account and refuses a system account', async () => {
      const company = seedCompany();
      const account = await createAccount(company, {
        code: '1100',
        name: 'صندوق',
        type: 'asset',
      });

      await request(server())
        .delete(`${api(company)}/${String(account.id)}`)
        .set('authorization', `Bearer ${company.token}`)
        .expect(204);

      const list = await listAccounts(company, '?search=1100');
      expect(list.data).toHaveLength(0);

      await activateTemplate(company);
      const systemAccount = (await listAccounts(company, '?search=110101')).data[0];

      const response = await request(server())
        .delete(`${api(company)}/${String(systemAccount?.id)}`)
        .set('authorization', `Bearer ${company.token}`)
        .expect(422);
      expect(response.body.error.code).toBe('ACCOUNT_SYSTEM_PROTECTED');
    });
  });

  describe('account roles', () => {
    it('maps a role, reads the mapping and reports completeness', async () => {
      const company = seedCompany();
      const inventory = await createAccount(company, {
        code: '1100',
        name: 'موجودی کالا',
        type: 'asset',
        postable: true,
      });
      const payable = await createAccount(company, {
        code: '2100',
        name: 'حساب‌های پرداختنی',
        type: 'liability',
        postable: true,
      });

      await request(server())
        .put(`/api/v1/tenants/${company.tenantId}/account-roles/inventory`)
        .set('authorization', `Bearer ${company.token}`)
        .send({ accountId: inventory.id })
        .expect(200);
      await request(server())
        .put(`/api/v1/tenants/${company.tenantId}/account-roles/payable`)
        .set('authorization', `Bearer ${company.token}`)
        .send({ accountId: payable.id })
        .expect(200);

      const mapping = await request(server())
        .get(`/api/v1/tenants/${company.tenantId}/account-roles`)
        .set('authorization', `Bearer ${company.token}`)
        .expect(200);

      expect(mapping.body.data).toContainEqual(
        expect.objectContaining({ role: 'inventory', accountId: inventory.id }),
      );
      expect(mapping.body.data).toContainEqual(
        expect.objectContaining({ role: 'purchase_discount', accountId: null }),
      );

      const completeness = await request(server())
        .get(`/api/v1/tenants/${company.tenantId}/account-roles/completeness`)
        .set('authorization', `Bearer ${company.token}`)
        .expect(200);

      expect(completeness.body).toMatchObject({
        mapped: expect.arrayContaining(['inventory', 'payable']),
        complete: false,
      });
      expect(completeness.body.missing).toContain('purchase_discount');
    });

    it('rejects an account that is not a valid target for the role', async () => {
      const company = seedCompany();
      const revenue = await createAccount(company, {
        code: '4100',
        name: 'فروش',
        type: 'revenue',
        postable: true,
      });

      const response = await request(server())
        .put(`/api/v1/tenants/${company.tenantId}/account-roles/inventory`)
        .set('authorization', `Bearer ${company.token}`)
        .send({ accountId: revenue.id })
        .expect(422);

      expect(response.body.error.code).toBe('ACCOUNT_ROLE_INVALID_TARGET');
    });
  });

  describe('authorization', () => {
    it('refuses every write to a caller with only the read capability', async () => {
      const company = seedCompany([READ]);

      const create = await request(server())
        .post(api(company))
        .set('authorization', `Bearer ${company.token}`)
        .send({ code: '1100', name: 'صندوق', type: 'asset' })
        .expect(403);
      expect(create.body.error.code).toBe('AUTHORIZATION_DENIED');

      const activate = await request(server())
        .post(`${api(company)}/standard-template/activate`)
        .set('authorization', `Bearer ${company.token}`)
        .send({ templateVersion: TEMPLATE_VERSION })
        .expect(403);
      expect(activate.body.error.code).toBe('AUTHORIZATION_DENIED');

      // Reads are still allowed, and no write was applied.
      const list = await listAccounts(company);
      expect(list.data).toHaveLength(0);
    });

    it('refuses a caller without membership in the company', async () => {
      const companyA = seedCompany();
      const outsider = seedCompany();

      const response = await request(server())
        .get(api(companyA))
        .set('authorization', `Bearer ${outsider.token}`)
        .expect(403);

      expect(response.body.error.code).toBe('TENANT_ACCESS_DENIED');
    });
  });

  describe('tenant isolation', () => {
    it("cannot read, change or delete another company's account", async () => {
      const companyA = seedCompany();
      const companyB = seedCompany();
      await activateTemplate(companyB);

      const bList = await listAccounts(companyB);
      const bAccount = bList.data[0];

      // A's own path, B's record id: not found, never confirmed.
      const read = await request(server())
        .get(`${api(companyA)}/tree?rootId=${String(bAccount?.id)}`)
        .set('authorization', `Bearer ${companyA.token}`)
        .expect(404);
      expect(read.body.error.code).toBe('ACCOUNT_NOT_FOUND');

      const update = await request(server())
        .patch(`${api(companyA)}/${String(bAccount?.id)}`)
        .set('authorization', `Bearer ${companyA.token}`)
        .send({ name: 'ربوده شد', version: 1 })
        .expect(404);
      expect(update.body.error.code).toBe('ACCOUNT_NOT_FOUND');

      const deactivate = await request(server())
        .post(`${api(companyA)}/${String(bAccount?.id)}/deactivate`)
        .set('authorization', `Bearer ${companyA.token}`)
        .send({ version: 1 })
        .expect(404);
      expect(deactivate.body.error.code).toBe('ACCOUNT_NOT_FOUND');

      const remove = await request(server())
        .delete(`${api(companyA)}/${String(bAccount?.id)}`)
        .set('authorization', `Bearer ${companyA.token}`)
        .expect(404);
      expect(remove.body.error.code).toBe('ACCOUNT_NOT_FOUND');

      // Through B's path, A is simply not a member.
      const swapped = await request(server())
        .delete(`/api/v1/tenants/${companyB.tenantId}/accounts/${String(bAccount?.id)}`)
        .set('authorization', `Bearer ${companyA.token}`)
        .expect(403);
      expect(swapped.body.error.code).toBe('TENANT_ACCESS_DENIED');

      // B's account is untouched.
      const stillThere = await request(server())
        .get(api(companyB))
        .set('authorization', `Bearer ${companyB.token}`)
        .expect(200);
      expect(stillThere.body.data).toContainEqual(
        expect.objectContaining({ id: bAccount?.id, name: bAccount?.name }),
      );
    });
  });

  describe('OpenAPI document', () => {
    const operations: readonly {
      readonly method: 'get' | 'post' | 'put' | 'patch' | 'delete';
      readonly path: string;
      readonly success: string;
      readonly body?: string;
      readonly errors: readonly string[];
    }[] = [
      {
        method: 'post',
        path: '/api/v1/tenants/{tenantId}/accounts',
        success: '201',
        body: 'CreateAccountDto',
        errors: ['400', '401', '403', '409', '422'],
      },
      {
        method: 'get',
        path: '/api/v1/tenants/{tenantId}/accounts',
        success: '200',
        errors: ['400', '401', '403'],
      },
      {
        method: 'get',
        path: '/api/v1/tenants/{tenantId}/accounts/tree',
        success: '200',
        errors: ['400', '401', '403', '404'],
      },
      {
        method: 'post',
        path: '/api/v1/tenants/{tenantId}/accounts/standard-template/activate',
        success: '201',
        body: 'ActivateStandardChartDto',
        errors: ['400', '401', '403', '409', '422'],
      },
      {
        method: 'patch',
        path: '/api/v1/tenants/{tenantId}/accounts/{accountId}',
        success: '200',
        body: 'UpdateAccountDto',
        errors: ['400', '401', '403', '404', '409', '422'],
      },
      {
        method: 'post',
        path: '/api/v1/tenants/{tenantId}/accounts/{accountId}/deactivate',
        success: '200',
        body: 'DeactivateAccountDto',
        errors: ['400', '401', '403', '404', '409', '422'],
      },
      {
        method: 'post',
        path: '/api/v1/tenants/{tenantId}/accounts/{accountId}/reactivate',
        success: '200',
        body: 'ReactivateAccountDto',
        errors: ['400', '401', '403', '404', '409', '422'],
      },
      {
        method: 'delete',
        path: '/api/v1/tenants/{tenantId}/accounts/{accountId}',
        success: '204',
        errors: ['400', '401', '403', '404', '409', '422'],
      },
      {
        method: 'get',
        path: '/api/v1/tenants/{tenantId}/account-roles',
        success: '200',
        errors: ['400', '401', '403'],
      },
      {
        method: 'get',
        path: '/api/v1/tenants/{tenantId}/account-roles/completeness',
        success: '200',
        errors: ['401', '403'],
      },
      {
        method: 'put',
        path: '/api/v1/tenants/{tenantId}/account-roles/{role}',
        success: '200',
        body: 'MapAccountRoleDto',
        errors: ['400', '401', '403', '422'],
      },
    ];

    it('documents every operation with bearer security, request, response and error examples', async () => {
      const document = await request(server()).get('/api/docs-json').expect(200);

      for (const operation of operations) {
        const entry = document.body.paths[operation.path]?.[operation.method];
        expect(entry, `${operation.method.toUpperCase()} ${operation.path}`).toBeDefined();
        expect(entry.security).toEqual([{ bearer: [] }]);

        const success = entry.responses[operation.success];
        expect(success, `${operation.path} ${operation.success}`).toBeDefined();
        if (operation.success !== '204') {
          const successContent = success.content['application/json'];
          expect(successContent.examples ?? successContent.example).toBeDefined();
        }

        if (operation.body !== undefined) {
          expect(JSON.stringify(entry.requestBody.content['application/json'].schema)).toContain(
            operation.body,
          );
        }

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
