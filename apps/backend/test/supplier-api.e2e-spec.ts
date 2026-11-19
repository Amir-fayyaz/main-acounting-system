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
import { tenantReferenceFrom as identityTenantReference } from '../src/modules/identity/domain/value-objects/tenant-reference.js';
import { CryptoSessionTokenService } from '../src/modules/identity/infrastructure/security/crypto-session-token-service.js';
import { AuthorizationGuard } from '../src/modules/identity/presentation/guards/authorization.guard.js';
import {
  SUPPLIER_AUTHORIZATION,
  SUPPLIER_REPOSITORY,
} from '../src/modules/supplier/application/supplier.tokens.js';
import { IdentitySupplierAuthorization } from '../src/modules/supplier/application/ports/supplier-authorization.port.js';
import { CreateSupplierUseCase } from '../src/modules/supplier/application/use-cases/create-supplier.use-case.js';
import { GetSupplierByIdUseCase } from '../src/modules/supplier/application/use-cases/get-supplier-by-id.use-case.js';
import { UpdateSupplierUseCase } from '../src/modules/supplier/application/use-cases/update-supplier.use-case.js';
import { DeactivateSupplierUseCase } from '../src/modules/supplier/application/use-cases/deactivate-supplier.use-case.js';
import { ActivateSupplierUseCase } from '../src/modules/supplier/application/use-cases/activate-supplier.use-case.js';
import { ListSuppliersUseCase } from '../src/modules/supplier/application/use-cases/list-suppliers.use-case.js';
import { SearchSuppliersUseCase } from '../src/modules/supplier/application/use-cases/search-suppliers.use-case.js';
import { SuppliersController } from '../src/modules/supplier/presentation/controllers/suppliers.controller.js';
import { DateTime } from '../src/shared/time/date-time.js';
import { RecordingAuditTrail } from './support/audit-doubles.js';
import {
  InMemoryAuthSessionRepository,
  RecordingAuthenticationAudit,
} from './support/authentication-doubles.js';
import {
  InMemoryMembershipRepository,
  PassthroughTransactionBoundary,
} from './support/membership-doubles.js';
import {
  InMemoryMembershipRoleRepository,
  InMemoryRoleRepository,
} from './support/role-doubles.js';
import { InMemoryUserRepository } from './support/user-doubles.js';
import { InMemorySupplierRepository } from './support/supplier-doubles.js';

/**
 * End-to-end integration test suite for the Supplier REST API (S5; Issue #247).
 *
 * Verifies all criteria over HTTP using the real Nest application, real global guards,
 * real ApiExceptionFilter, and in-memory repositories:
 * - Golden flow: create → search with variant spellings → read → update → deactivate → activate.
 * - Duplicate code conflict (409) vs possible duplicates review response (200).
 * - Confirmation flow with confirmDuplicate: true.
 * - Concurrency conflict on stale revision (409).
 * - Role guard: writes refused for users without supplier.manage (403).
 * - Boundary DTO validation: tenantId in body or query rejected (400).
 * - Tenant isolation: cross-tenant access refused (404/403).
 * - Complete Swagger / OpenAPI documentation contract.
 */

const MANAGE = 'supplier.manage';
const READ = 'supplier.read';

interface Company {
  readonly tenantId: string;
  readonly userId: string;
  readonly token: string;
}

interface Harness {
  readonly app: INestApplication;
  readonly audit: RecordingAuditTrail;
  readonly suppliers: InMemorySupplierRepository;
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
  const suppliers = new InMemorySupplierRepository();

  const moduleRef = await Test.createTestingModule({
    imports: [AppConfigModule],
    controllers: [SuppliersController],
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
      { provide: SUPPLIER_REPOSITORY, useValue: suppliers },
      {
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
        provide: SUPPLIER_AUTHORIZATION,
        useFactory: (authorization: Authorization) =>
          new IdentitySupplierAuthorization(authorization),
        inject: [AUTHORIZATION],
      },
      {
        provide: GetAuthenticatedSessionUseCase,
        useFactory: () =>
          new GetAuthenticatedSessionUseCase(users, sessions, tokens, authenticationAudit),
      },
      {
        provide: CreateSupplierUseCase,
        useFactory: (authorization: IdentitySupplierAuthorization) =>
          new CreateSupplierUseCase(suppliers, authorization, audit, boundary),
        inject: [SUPPLIER_AUTHORIZATION],
      },
      {
        provide: GetSupplierByIdUseCase,
        useFactory: () => new GetSupplierByIdUseCase(suppliers),
      },
      {
        provide: UpdateSupplierUseCase,
        useFactory: (authorization: IdentitySupplierAuthorization) =>
          new UpdateSupplierUseCase(suppliers, authorization, audit, boundary),
        inject: [SUPPLIER_AUTHORIZATION],
      },
      {
        provide: DeactivateSupplierUseCase,
        useFactory: (authorization: IdentitySupplierAuthorization) =>
          new DeactivateSupplierUseCase(suppliers, authorization, audit, boundary),
        inject: [SUPPLIER_AUTHORIZATION],
      },
      {
        provide: ActivateSupplierUseCase,
        useFactory: (authorization: IdentitySupplierAuthorization) =>
          new ActivateSupplierUseCase(suppliers, authorization, audit, boundary),
        inject: [SUPPLIER_AUTHORIZATION],
      },
      {
        provide: ListSuppliersUseCase,
        useFactory: () => new ListSuppliersUseCase(suppliers),
      },
      {
        provide: SearchSuppliersUseCase,
        useFactory: () => new SearchSuppliersUseCase(suppliers),
      },
      AuthorizationGuard,
      { provide: APP_GUARD, useExisting: AuthorizationGuard },
    ],
  }).compile();

  const app = moduleRef.createNestApplication();
  configureApplication(app);
  await app.init();

  return { app, audit, suppliers, users, memberships, assignments, roles, sessions, tokens };
}

describe('Supplier API (e2e)', () => {
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

  function seedCompany(permissions: readonly string[] = [MANAGE, READ]): Company {
    const tenantId = randomUUID();
    const member = seedMember(tenantId, permissions);
    return { tenantId, userId: member.userId, token: member.token };
  }

  function seedMember(
    tenantId: string,
    permissions: readonly string[],
  ): { readonly userId: string; readonly token: string } {
    const user = User.create({
      displayName: 'Supplier Tester',
      email: `supplier.${randomUUID()}@example.com`,
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
      name: RoleName.from(`Supplier Role ${randomUUID().slice(0, 8)}`),
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

    const rawToken = `supplier-token-${randomUUID()}`;
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

  describe('golden flow: create → search with variant spellings → read → update → deactivate → activate', () => {
    it('executes the full lifecycle over HTTP and records audit trail', async () => {
      const company = seedCompany();

      // 1. Create a supplier
      const createRes = await request(server())
        .post(`/api/v1/tenants/${company.tenantId}/suppliers`)
        .set('authorization', `Bearer ${company.token}`)
        .send({
          code: 'SUP-PARS-01',
          name: 'شرکت تامین آزمای پارس',
          identificationNumber: '10109988776',
          contactInfo: {
            phone: '+982188776655',
            email: 'contact@pars.example.com',
            address: 'تهران، خیابان آزادی، پلاک ۱۲',
            postalCode: '1458889911',
          },
        })
        .expect(201);

      expect(createRes.body.status).toBe('created');
      const supplier = createRes.body.supplier;
      expect(supplier.id).toMatch(/^[0-9a-f-]{36}$/);
      expect(supplier.code).toBe('SUP-PARS-01');
      expect(supplier.name).toBe('شرکت تامین آزمای پارس');
      expect(supplier.normalizedName).toBe('شرکت تامین ازمای پارس');
      expect(supplier.identificationNumber).toBe('10109988776');
      expect(supplier.contactInfo).toEqual({
        phone: '+982188776655',
        email: 'contact@pars.example.com',
        address: 'تهران، خیابان آزادی، پلاک ۱۲',
        postalCode: '1458889911',
      });
      expect(supplier.status).toBe('active');
      expect(supplier.revision).toBe(1);

      const supplierId = supplier.id;

      // Check audit recorded creation
      expect(harness.audit.actions()).toContain('supplier.create');

      // 2. Search with variant Persian/Arabic spellings (ي vs ی, آ vs ا)
      const searchRes = await request(server())
        .get(
          `/api/v1/tenants/${company.tenantId}/suppliers?search=${encodeURIComponent('تامين ازماي')}`,
        )
        .set('authorization', `Bearer ${company.token}`)
        .expect(200);

      expect(searchRes.body.data).toHaveLength(1);
      expect(searchRes.body.data[0].id).toBe(supplierId);
      expect(searchRes.body.meta.total).toBe(1);

      // 3. Read single supplier by ID
      const readRes = await request(server())
        .get(`/api/v1/tenants/${company.tenantId}/suppliers/${supplierId}`)
        .set('authorization', `Bearer ${company.token}`)
        .expect(200);

      expect(readRes.body.id).toBe(supplierId);
      expect(readRes.body.code).toBe('SUP-PARS-01');

      // 4. Update supplier
      const updateRes = await request(server())
        .patch(`/api/v1/tenants/${company.tenantId}/suppliers/${supplierId}`)
        .set('authorization', `Bearer ${company.token}`)
        .send({
          expectedRevision: 1,
          name: 'شرکت تامین آزمای پارس نوین',
          contactInfo: {
            phone: '+982188779900',
            email: 'new@pars.example.com',
            address: null,
            postalCode: null,
          },
        })
        .expect(200);

      expect(updateRes.body.name).toBe('شرکت تامین آزمای پارس نوین');
      expect(updateRes.body.normalizedName).toBe('شرکت تامین ازمای پارس نوین');
      expect(updateRes.body.revision).toBe(2);
      expect(updateRes.body.contactInfo).toEqual({
        phone: '+982188779900',
        email: 'new@pars.example.com',
        address: null,
        postalCode: null,
      });

      // Check audit recorded update
      expect(harness.audit.actions()).toContain('supplier.update');

      // 5. Deactivate supplier
      const deactivateRes = await request(server())
        .post(`/api/v1/tenants/${company.tenantId}/suppliers/${supplierId}/deactivate`)
        .set('authorization', `Bearer ${company.token}`)
        .send({ expectedRevision: 2 })
        .expect(200);

      expect(deactivateRes.body.status).toBe('inactive');
      expect(deactivateRes.body.revision).toBe(3);

      // Check audit recorded deactivation
      expect(harness.audit.actions()).toContain('supplier.deactivate');

      // 6. Reactivate supplier
      const activateRes = await request(server())
        .post(`/api/v1/tenants/${company.tenantId}/suppliers/${supplierId}/activate`)
        .set('authorization', `Bearer ${company.token}`)
        .send({ expectedRevision: 3 })
        .expect(200);

      expect(activateRes.body.status).toBe('active');
      expect(activateRes.body.revision).toBe(4);

      // Check audit recorded activation
      expect(harness.audit.actions()).toContain('supplier.activate');
    });
  });

  describe('duplicate detection and protection', () => {
    it('refuses duplicate code with 409 SUPPLIER_CODE_DUPLICATE', async () => {
      const company = seedCompany();

      await request(server())
        .post(`/api/v1/tenants/${company.tenantId}/suppliers`)
        .set('authorization', `Bearer ${company.token}`)
        .send({
          code: 'SUP-DUP-01',
          name: 'شرکت نخست',
        })
        .expect(201);

      const conflictRes = await request(server())
        .post(`/api/v1/tenants/${company.tenantId}/suppliers`)
        .set('authorization', `Bearer ${company.token}`)
        .send({
          code: 'SUP-DUP-01',
          name: 'شرکت دوم با همان کد',
        })
        .expect(409);

      expect(conflictRes.body.error.code).toBe('SUPPLIER_CODE_DUPLICATE');
      expect(conflictRes.body.error.category).toBe('domain');
    });

    it('refuses duplicate identification number with 409 SUPPLIER_IDENTIFICATION_DUPLICATE', async () => {
      const company = seedCompany();

      await request(server())
        .post(`/api/v1/tenants/${company.tenantId}/suppliers`)
        .set('authorization', `Bearer ${company.token}`)
        .send({
          code: 'SUP-ID-01',
          name: 'تامین کننده اول',
          identificationNumber: '10105555444',
        })
        .expect(201);

      const conflictRes = await request(server())
        .post(`/api/v1/tenants/${company.tenantId}/suppliers`)
        .set('authorization', `Bearer ${company.token}`)
        .send({
          code: 'SUP-ID-02',
          name: 'تامین کننده دوم با همان شناسه',
          identificationNumber: '10105555444',
        })
        .expect(409);

      expect(conflictRes.body.error.code).toBe('SUPPLIER_IDENTIFICATION_DUPLICATE');
      expect(conflictRes.body.error.category).toBe('domain');
    });

    it('distinguishes possible duplicates (200 with candidates) from duplicate code errors (409)', async () => {
      const company = seedCompany();

      // Seed first supplier
      await request(server())
        .post(`/api/v1/tenants/${company.tenantId}/suppliers`)
        .set('authorization', `Bearer ${company.token}`)
        .send({
          code: 'SUP-ORIGINAL',
          name: 'بازرگانی البرز شرق',
        })
        .expect(201);

      // Attempt creating a supplier with matching normalized name (different arabic kaf/yeh)
      const reviewRes = await request(server())
        .post(`/api/v1/tenants/${company.tenantId}/suppliers`)
        .set('authorization', `Bearer ${company.token}`)
        .send({
          code: 'SUP-CANDIDATE',
          name: 'بازرگاني البرز شرق', // Arabic yeh 'ي'
        })
        .expect(200);

      expect(reviewRes.body.status).toBe('possible_duplicates');
      expect(reviewRes.body.duplicates).toHaveLength(1);
      expect(reviewRes.body.duplicates[0].code).toBe('SUP-ORIGINAL');
      expect(reviewRes.body.duplicates[0].normalizedName).toBe('بازرگانی البرز شرق');

      // Verify supplier was NOT created
      const listRes = await request(server())
        .get(`/api/v1/tenants/${company.tenantId}/suppliers`)
        .set('authorization', `Bearer ${company.token}`)
        .expect(200);
      expect(listRes.body.data).toHaveLength(1);

      // Now create with explicit confirmation
      const confirmRes = await request(server())
        .post(`/api/v1/tenants/${company.tenantId}/suppliers`)
        .set('authorization', `Bearer ${company.token}`)
        .send({
          code: 'SUP-CANDIDATE',
          name: 'بازرگاني البرز شرق',
          confirmDuplicate: true,
        })
        .expect(201);

      expect(confirmRes.body.status).toBe('created');
      expect(confirmRes.body.supplier.code).toBe('SUP-CANDIDATE');

      // Verify both suppliers now exist
      const listAfterRes = await request(server())
        .get(`/api/v1/tenants/${company.tenantId}/suppliers`)
        .set('authorization', `Bearer ${company.token}`)
        .expect(200);
      expect(listAfterRes.body.data).toHaveLength(2);
    });
  });

  describe('optimistic concurrency control', () => {
    it('refuses update when expectedRevision does not match current state with 409 STALE_REVISION', async () => {
      const company = seedCompany();

      const created = await request(server())
        .post(`/api/v1/tenants/${company.tenantId}/suppliers`)
        .set('authorization', `Bearer ${company.token}`)
        .send({ code: 'SUP-REV-01', name: 'تست بازنگری' })
        .expect(201);

      const supplierId = created.body.supplier.id;

      // Stale revision attempt
      const staleRes = await request(server())
        .patch(`/api/v1/tenants/${company.tenantId}/suppliers/${supplierId}`)
        .set('authorization', `Bearer ${company.token}`)
        .send({
          expectedRevision: 99,
          name: 'نام جدید',
        })
        .expect(409);

      expect(staleRes.body.error.code).toBe('CONFLICT');
      expect(staleRes.body.error.category).toBe('domain');
    });

    it('refuses deactivation with stale revision (409 CONFLICT)', async () => {
      const company = seedCompany();

      const created = await request(server())
        .post(`/api/v1/tenants/${company.tenantId}/suppliers`)
        .set('authorization', `Bearer ${company.token}`)
        .send({ code: 'SUP-REV-02', name: 'تست بازنگری غیرفعال' })
        .expect(201);

      const supplierId = created.body.supplier.id;

      const staleRes = await request(server())
        .post(`/api/v1/tenants/${company.tenantId}/suppliers/${supplierId}/deactivate`)
        .set('authorization', `Bearer ${company.token}`)
        .send({ expectedRevision: 99 })
        .expect(409);

      expect(staleRes.body.error.code).toBe('CONFLICT');
      expect(staleRes.body.error.category).toBe('domain');
    });

    it('refuses activation with stale revision (409 CONFLICT)', async () => {
      const company = seedCompany();

      const created = await request(server())
        .post(`/api/v1/tenants/${company.tenantId}/suppliers`)
        .set('authorization', `Bearer ${company.token}`)
        .send({ code: 'SUP-REV-03', name: 'تست بازنگری فعال' })
        .expect(201);

      const supplierId = created.body.supplier.id;

      // Deactivate first with correct revision
      await request(server())
        .post(`/api/v1/tenants/${company.tenantId}/suppliers/${supplierId}/deactivate`)
        .set('authorization', `Bearer ${company.token}`)
        .send({ expectedRevision: 1 })
        .expect(200);

      // Now try activating with stale revision 1 (revision is now 2)
      const staleRes = await request(server())
        .post(`/api/v1/tenants/${company.tenantId}/suppliers/${supplierId}/activate`)
        .set('authorization', `Bearer ${company.token}`)
        .send({ expectedRevision: 1 })
        .expect(409);

      expect(staleRes.body.error.code).toBe('CONFLICT');
      expect(staleRes.body.error.category).toBe('domain');
    });
  });

  describe('business rule / lifecycle enforcement', () => {
    it('refuses activating an already active supplier with 422 SUPPLIER_ALREADY_ACTIVE', async () => {
      const company = seedCompany();

      const created = await request(server())
        .post(`/api/v1/tenants/${company.tenantId}/suppliers`)
        .set('authorization', `Bearer ${company.token}`)
        .send({ code: 'SUP-STATE-01', name: 'تست فعال بودن' })
        .expect(201);

      const supplierId = created.body.supplier.id;

      const res = await request(server())
        .post(`/api/v1/tenants/${company.tenantId}/suppliers/${supplierId}/activate`)
        .set('authorization', `Bearer ${company.token}`)
        .send({ expectedRevision: 1 })
        .expect(422);

      expect(res.body.error.code).toBe('SUPPLIER_ALREADY_ACTIVE');
      expect(res.body.error.category).toBe('domain');
    });

    it('refuses deactivating an already inactive supplier with 422 SUPPLIER_ALREADY_INACTIVE', async () => {
      const company = seedCompany();

      const created = await request(server())
        .post(`/api/v1/tenants/${company.tenantId}/suppliers`)
        .set('authorization', `Bearer ${company.token}`)
        .send({ code: 'SUP-STATE-02', name: 'تست غیرفعال بودن' })
        .expect(201);

      const supplierId = created.body.supplier.id;

      // Deactivate once
      await request(server())
        .post(`/api/v1/tenants/${company.tenantId}/suppliers/${supplierId}/deactivate`)
        .set('authorization', `Bearer ${company.token}`)
        .send({ expectedRevision: 1 })
        .expect(200);

      // Deactivate again
      const res = await request(server())
        .post(`/api/v1/tenants/${company.tenantId}/suppliers/${supplierId}/deactivate`)
        .set('authorization', `Bearer ${company.token}`)
        .send({ expectedRevision: 2 })
        .expect(422);

      expect(res.body.error.code).toBe('SUPPLIER_ALREADY_INACTIVE');
      expect(res.body.error.category).toBe('domain');
    });

    it('returns 404 SUPPLIER_NOT_FOUND when accessing non-existent supplier', async () => {
      const company = seedCompany();
      const nonExistentId = randomUUID();

      const res = await request(server())
        .get(`/api/v1/tenants/${company.tenantId}/suppliers/${nonExistentId}`)
        .set('authorization', `Bearer ${company.token}`)
        .expect(404);

      expect(res.body.error.code).toBe('SUPPLIER_NOT_FOUND');
    });
  });

  describe('role guard & authorization enforcement', () => {
    it('refuses write operations for user without supplier.manage (403 AUTHORIZATION_DENIED)', async () => {
      const company = seedCompany();
      // Member with only read permissions
      const readOnlyUser = seedMember(company.tenantId, [READ]);

      const createRes = await request(server())
        .post(`/api/v1/tenants/${company.tenantId}/suppliers`)
        .set('authorization', `Bearer ${readOnlyUser.token}`)
        .send({ code: 'SUP-FORBIDDEN', name: 'غیرمجاز' })
        .expect(403);

      expect(createRes.body.error.code).toBe('AUTHORIZATION_DENIED');
    });

    it('allows read operations for user with supplier.read', async () => {
      const company = seedCompany();
      const readOnlyUser = seedMember(company.tenantId, [READ]);

      // Seed a supplier as manager
      const created = await request(server())
        .post(`/api/v1/tenants/${company.tenantId}/suppliers`)
        .set('authorization', `Bearer ${company.token}`)
        .send({ code: 'SUP-READABLE', name: 'تامین کننده قابل خواندن' })
        .expect(201);

      // Read-only user can list
      const listRes = await request(server())
        .get(`/api/v1/tenants/${company.tenantId}/suppliers`)
        .set('authorization', `Bearer ${readOnlyUser.token}`)
        .expect(200);
      expect(listRes.body.data).toHaveLength(1);

      // Read-only user can get by ID
      const getRes = await request(server())
        .get(`/api/v1/tenants/${company.tenantId}/suppliers/${created.body.supplier.id}`)
        .set('authorization', `Bearer ${readOnlyUser.token}`)
        .expect(200);
      expect(getRes.body.id).toBe(created.body.supplier.id);
    });

    it('refuses unauthenticated requests with 401 AUTHENTICATION_REQUIRED', async () => {
      const company = seedCompany();

      const res = await request(server())
        .get(`/api/v1/tenants/${company.tenantId}/suppliers`)
        .expect(401);

      expect(res.body.error.code).toBe('AUTHENTICATION_REQUIRED');
    });
  });

  describe('multi-tenant isolation', () => {
    it('prevents cross-tenant access to suppliers (404 SUPPLIER_NOT_FOUND)', async () => {
      const companyA = seedCompany();
      const companyB = seedCompany();

      // Create supplier in Tenant A
      const supA = await request(server())
        .post(`/api/v1/tenants/${companyA.tenantId}/suppliers`)
        .set('authorization', `Bearer ${companyA.token}`)
        .send({ code: 'SUP-A-01', name: 'تامین کننده شرکت الف' })
        .expect(201);

      const supplierIdA = supA.body.supplier.id;

      // Tenant B tries to read Tenant A's supplier -> 404 (isolated)
      const readRes = await request(server())
        .get(`/api/v1/tenants/${companyB.tenantId}/suppliers/${supplierIdA}`)
        .set('authorization', `Bearer ${companyB.token}`)
        .expect(404);
      expect(readRes.body.error.code).toBe('SUPPLIER_NOT_FOUND');

      // Tenant B tries to update Tenant A's supplier -> 404
      const updateRes = await request(server())
        .patch(`/api/v1/tenants/${companyB.tenantId}/suppliers/${supplierIdA}`)
        .set('authorization', `Bearer ${companyB.token}`)
        .send({ expectedRevision: 1, name: 'تغییر نام غیرمجاز' })
        .expect(404);
      expect(updateRes.body.error.code).toBe('SUPPLIER_NOT_FOUND');

      // Tenant B lists suppliers -> sees 0 suppliers
      const listRes = await request(server())
        .get(`/api/v1/tenants/${companyB.tenantId}/suppliers`)
        .set('authorization', `Bearer ${companyB.token}`)
        .expect(200);
      expect(listRes.body.data).toHaveLength(0);
    });

    it('refuses a request with conflicting x-tenant-id header with 403 TENANT_ACCESS_DENIED', async () => {
      const companyA = seedCompany();
      const companyB = seedCompany();

      const res = await request(server())
        .get(`/api/v1/tenants/${companyA.tenantId}/suppliers`)
        .set('authorization', `Bearer ${companyA.token}`)
        .set('x-tenant-id', companyB.tenantId)
        .expect(403);

      expect(res.body.error.code).toBe('TENANT_ACCESS_DENIED');
    });

    it('refuses access to another tenant route path with 403 TENANT_ACCESS_DENIED', async () => {
      const companyA = seedCompany();
      const companyB = seedCompany();

      const res = await request(server())
        .get(`/api/v1/tenants/${companyB.tenantId}/suppliers`)
        .set('authorization', `Bearer ${companyA.token}`)
        .expect(403);

      expect(res.body.error.code).toBe('TENANT_ACCESS_DENIED');
    });
  });

  describe('boundary DTO validation & tenant isolation guardrails', () => {
    it('rejects tenantId in request body as unknown property (400 VALIDATION_FAILED)', async () => {
      const company = seedCompany();
      const otherTenant = seedCompany();

      const res = await request(server())
        .post(`/api/v1/tenants/${company.tenantId}/suppliers`)
        .set('authorization', `Bearer ${company.token}`)
        .send({
          code: 'SUP-SNEAKY',
          name: 'شرکت متقلب',
          tenantId: otherTenant.tenantId,
        })
        .expect(400);

      expect(res.body.error.code).toBe('VALIDATION_FAILED');
      const fields = res.body.error.details.map((d: { field: string }) => d.field);
      expect(fields).toContain('tenantId');
    });

    it('rejects tenantId in query parameters as unknown property (400 VALIDATION_FAILED)', async () => {
      const company = seedCompany();
      const otherTenant = seedCompany();

      const res = await request(server())
        .get(`/api/v1/tenants/${company.tenantId}/suppliers?tenantId=${otherTenant.tenantId}`)
        .set('authorization', `Bearer ${company.token}`)
        .expect(400);

      expect(res.body.error.code).toBe('VALIDATION_FAILED');
      const fields = res.body.error.details.map((d: { field: string }) => d.field);
      expect(fields).toContain('tenantId');
    });

    it('rejects missing or empty required fields with 400 VALIDATION_FAILED', async () => {
      const company = seedCompany();

      const res = await request(server())
        .post(`/api/v1/tenants/${company.tenantId}/suppliers`)
        .set('authorization', `Bearer ${company.token}`)
        .send({
          code: '',
          name: '',
        })
        .expect(400);

      expect(res.body.error.code).toBe('VALIDATION_FAILED');
    });
  });

  describe('OpenAPI / Swagger documentation contract', () => {
    const operations: {
      readonly method: 'get' | 'post' | 'patch';
      readonly path: string;
      readonly success: string;
      readonly body?: string;
      readonly errors: readonly string[];
    }[] = [
      {
        method: 'post',
        path: '/api/v1/tenants/{tenantId}/suppliers',
        success: '201',
        body: 'CreateSupplierDto',
        errors: ['400', '401', '403', '409'],
      },
      {
        method: 'get',
        path: '/api/v1/tenants/{tenantId}/suppliers',
        success: '200',
        errors: ['400', '401', '403'],
      },
      {
        method: 'get',
        path: '/api/v1/tenants/{tenantId}/suppliers/{supplierId}',
        success: '200',
        errors: ['401', '403', '404'],
      },
      {
        method: 'patch',
        path: '/api/v1/tenants/{tenantId}/suppliers/{supplierId}',
        success: '200',
        body: 'UpdateSupplierDto',
        errors: ['400', '401', '403', '404', '409'],
      },
      {
        method: 'post',
        path: '/api/v1/tenants/{tenantId}/suppliers/{supplierId}/deactivate',
        success: '200',
        body: 'DeactivateSupplierDto',
        errors: ['400', '401', '403', '404', '409', '422'],
      },
      {
        method: 'post',
        path: '/api/v1/tenants/{tenantId}/suppliers/{supplierId}/activate',
        success: '200',
        body: 'ActivateSupplierDto',
        errors: ['400', '401', '403', '404', '409', '422'],
      },
    ];

    it('documents all supplier operations in Swagger with bearer security, request, response, and error examples', async () => {
      const document = await request(server()).get('/api/docs-json').expect(200);

      for (const operation of operations) {
        const entry = document.body.paths[operation.path]?.[operation.method];
        expect(entry, `${operation.method.toUpperCase()} ${operation.path}`).toBeDefined();
        expect(entry.security).toEqual([{ bearer: [] }]);

        // Success response carries an example
        const success = entry.responses[operation.success];
        expect(success, `${operation.path} ${operation.success}`).toBeDefined();
        const successContent = success.content['application/json'];
        expect(
          successContent.examples ?? successContent.example,
          `${operation.path} success example`,
        ).toBeDefined();

        // Request body carries a described schema
        if (operation.body !== undefined) {
          expect(JSON.stringify(entry.requestBody.content['application/json'].schema)).toContain(
            operation.body,
          );
        }

        // Error responses carry examples
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
