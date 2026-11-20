import { describe, expect, it, beforeEach } from 'vitest';
import { createTenantContext } from '../../../../shared/tenant/tenant-context.js';
import { TenantScope } from '../../../../shared/tenant/tenant-scope.js';
import { ActorScope } from '../../../../shared/actor/actor-scope.js';
import { RecordingAuditTrail } from '../../../../../test/support/audit-doubles.js';
import { PassthroughTransactionBoundary } from '../../../../../test/support/membership-doubles.js';
import { TEST_PRINCIPAL } from '../../../../../test/support/test-principal.js';
import { InMemorySupplierRepository } from '../../../../../test/support/supplier-doubles.js';
import { AllowAllSupplierAuthorization } from '../ports/supplier-authorization.port.js';
import { DefaultSupplierLookup } from '../services/supplier-lookup.service.js';
import {
  CreateSupplierCommand,
  UpdateSupplierCommand,
  DeactivateSupplierCommand,
  ActivateSupplierCommand,
} from '../commands/supplier.commands.js';
import {
  GetSupplierByIdQuery,
  ListSuppliersQuery,
  SearchSuppliersQuery,
} from '../queries/supplier.queries.js';
import type { CreateSupplierResult, SupplierView } from '../views/supplier.view.js';
import { CreateSupplierUseCase } from './create-supplier.use-case.js';
import { UpdateSupplierUseCase } from './update-supplier.use-case.js';
import { DeactivateSupplierUseCase } from './deactivate-supplier.use-case.js';
import { ActivateSupplierUseCase } from './activate-supplier.use-case.js';
import { GetSupplierByIdUseCase } from './get-supplier-by-id.use-case.js';
import { ListSuppliersUseCase } from './list-suppliers.use-case.js';
import { SearchSuppliersUseCase } from './search-suppliers.use-case.js';

const TENANT_A = '018f0d3c-6d0f-7a4b-9d4e-2b3c4d5e6f70';

function inTenant<T>(tenantId: string, work: () => Promise<T>): Promise<T> {
  return TenantScope.run(createTenantContext(tenantId), () =>
    ActorScope.run(TEST_PRINCIPAL.userId, work),
  );
}

function requireCreatedSupplier(result: CreateSupplierResult): SupplierView {
  if (result.status !== 'created') {
    throw new Error(`Expected supplier to be created but got status: ${result.status}`);
  }
  return result.supplier;
}

describe('Supplier Application Use Cases and Lookup (S4)', () => {
  let repository: InMemorySupplierRepository;
  let audit: RecordingAuditTrail;
  let authorization: AllowAllSupplierAuthorization;
  let boundary: PassthroughTransactionBoundary;

  let createUseCase: CreateSupplierUseCase;
  let updateUseCase: UpdateSupplierUseCase;
  let deactivateUseCase: DeactivateSupplierUseCase;
  let activateUseCase: ActivateSupplierUseCase;
  let getByIdUseCase: GetSupplierByIdUseCase;
  let listUseCase: ListSuppliersUseCase;
  let searchUseCase: SearchSuppliersUseCase;
  let lookup: DefaultSupplierLookup;

  beforeEach(() => {
    repository = new InMemorySupplierRepository();
    audit = new RecordingAuditTrail();
    authorization = new AllowAllSupplierAuthorization();
    boundary = new PassthroughTransactionBoundary();

    createUseCase = new CreateSupplierUseCase(repository, authorization, audit, boundary);
    updateUseCase = new UpdateSupplierUseCase(repository, authorization, audit, boundary);
    deactivateUseCase = new DeactivateSupplierUseCase(repository, authorization, audit, boundary);
    activateUseCase = new ActivateSupplierUseCase(repository, authorization, audit, boundary);
    getByIdUseCase = new GetSupplierByIdUseCase(repository);
    listUseCase = new ListSuppliersUseCase(repository);
    searchUseCase = new SearchSuppliersUseCase(repository);
    lookup = new DefaultSupplierLookup(repository);
  });

  describe('CreateSupplierUseCase', () => {
    it('creates a supplier in active status with initial revision 1 and records audit', async () => {
      const result = await inTenant(TENANT_A, () =>
        createUseCase.execute(
          new CreateSupplierCommand({
            code: 'SUP-001',
            name: 'شرکت فولاد مبارکه',
            identificationNumber: '10100123456',
            contactInfo: {
              phone: '021-88888888',
              email: 'info@foolad.ir',
              address: 'اصفهان',
              postalCode: '1234567890',
            },
            principal: TEST_PRINCIPAL,
          }),
        ),
      );

      expect(result.isOk()).toBe(true);
      const outcome = result.valueOrThrow();
      expect(outcome.status).toBe('created');
      if (outcome.status === 'created') {
        expect(outcome.supplier.code).toBe('SUP-001');
        expect(outcome.supplier.name).toBe('شرکت فولاد مبارکه');
        expect(outcome.supplier.status).toBe('active');
        expect(outcome.supplier.revision).toBe(1);
        expect(outcome.supplier.identificationNumber).toBe('10100123456');
        expect(outcome.supplier.contactInfo?.phone).toBe('021-88888888');
      }

      const auditEntry = audit.find('supplier.create');
      expect(auditEntry).toBeDefined();
      expect(auditEntry?.outcome).toBe('success');
      expect(auditEntry?.actorUserId).toBe(TEST_PRINCIPAL.userId);
    });

    it('rejects duplicate supplier code in the same tenant with SUPPLIER_CODE_DUPLICATE', async () => {
      await inTenant(TENANT_A, () =>
        createUseCase.execute(
          new CreateSupplierCommand({
            code: 'SUP-001',
            name: 'تأمین‌کننده اول',
            principal: TEST_PRINCIPAL,
          }),
        ),
      );

      const dupResult = await inTenant(TENANT_A, () =>
        createUseCase.execute(
          new CreateSupplierCommand({
            code: 'SUP-001',
            name: 'تأمین‌کننده دوم',
            principal: TEST_PRINCIPAL,
          }),
        ),
      );

      expect(dupResult.isFail()).toBe(true);
      expect(dupResult.errorOrThrow().code).toBe('SUPPLIER_CODE_DUPLICATE');
    });

    it('rejects duplicate identification number in the same tenant with SUPPLIER_IDENTIFICATION_DUPLICATE', async () => {
      await inTenant(TENANT_A, () =>
        createUseCase.execute(
          new CreateSupplierCommand({
            code: 'SUP-001',
            name: 'تأمین‌کننده اول',
            identificationNumber: '10100999999',
            principal: TEST_PRINCIPAL,
          }),
        ),
      );

      const dupResult = await inTenant(TENANT_A, () =>
        createUseCase.execute(
          new CreateSupplierCommand({
            code: 'SUP-002',
            name: 'تأمین‌کننده دوم',
            identificationNumber: '10100999999',
            principal: TEST_PRINCIPAL,
          }),
        ),
      );

      expect(dupResult.isFail()).toBe(true);
      expect(dupResult.errorOrThrow().code).toBe('SUPPLIER_IDENTIFICATION_DUPLICATE');
    });

    it('reports possible duplicates on matching normalized name and requires confirmation', async () => {
      // 1. Create original supplier: "شرکت فولاد مبارکه اصفهان"
      const res1 = await inTenant(TENANT_A, () =>
        createUseCase.execute(
          new CreateSupplierCommand({
            code: 'SUP-001',
            name: 'شرکت فولاد مبارکه اصفهان',
            principal: TEST_PRINCIPAL,
          }),
        ),
      );
      expect(res1.isOk()).toBe(true);

      // 2. Attempt to create with phonetic/spelling variation without confirmation:
      // "شَرکَتِ فـــولادِ مُبارَكه اصفهان" (Arabic Kaf, Harakat, Tatweel)
      const res2 = await inTenant(TENANT_A, () =>
        createUseCase.execute(
          new CreateSupplierCommand({
            code: 'SUP-002',
            name: 'شَرکَتِ فـــولادِ مُبارَكه اصفهان',
            confirmDuplicate: false,
            principal: TEST_PRINCIPAL,
          }),
        ),
      );

      expect(res2.isOk()).toBe(true);
      const outcome = res2.valueOrThrow();
      expect(outcome.status).toBe('possible_duplicates');
      if (outcome.status === 'possible_duplicates') {
        expect(outcome.duplicates.length).toBe(1);
        expect(outcome.duplicates[0].code).toBe('SUP-001');
        expect(outcome.duplicates[0].name).toBe('شرکت فولاد مبارکه اصفهان');
      }

      // 3. Second call with confirmDuplicate = true creates the supplier successfully
      const res3 = await inTenant(TENANT_A, () =>
        createUseCase.execute(
          new CreateSupplierCommand({
            code: 'SUP-002',
            name: 'شَرکَتِ فـــولادِ مُبارَكه اصفهان',
            confirmDuplicate: true,
            principal: TEST_PRINCIPAL,
          }),
        ),
      );

      expect(res3.isOk()).toBe(true);
      const outcome3 = res3.valueOrThrow();
      expect(outcome3.status).toBe('created');
      if (outcome3.status === 'created') {
        expect(outcome3.supplier.code).toBe('SUP-002');
      }
    });
  });

  describe('UpdateSupplierUseCase', () => {
    it('updates supplier fields, increments revision and records audit', async () => {
      const created = await inTenant(TENANT_A, async () => {
        const res = await createUseCase.execute(
          new CreateSupplierCommand({
            code: 'SUP-100',
            name: 'پتروشیمی جم',
            principal: TEST_PRINCIPAL,
          }),
        );
        return requireCreatedSupplier(res.valueOrThrow());
      });

      const updated = await inTenant(TENANT_A, () =>
        updateUseCase.execute(
          new UpdateSupplierCommand({
            id: created.id,
            expectedRevision: 1,
            name: 'شرکت پتروشیمی جم (سهامی عام)',
            identificationNumber: '10100555555',
            contactInfo: { phone: '021-12345678' },
            principal: TEST_PRINCIPAL,
          }),
        ),
      );

      expect(updated.isOk()).toBe(true);
      const view = updated.valueOrThrow();
      expect(view.name).toBe('شرکت پتروشیمی جم (سهامی عام)');
      expect(view.identificationNumber).toBe('10100555555');
      expect(view.contactInfo?.phone).toBe('021-12345678');
      expect(view.revision).toBe(2);

      const auditEntry = audit.find('supplier.update');
      expect(auditEntry).toBeDefined();
      expect(auditEntry?.outcome).toBe('success');
    });

    it('rejects update on stale revision with conflict error', async () => {
      const created = await inTenant(TENANT_A, async () => {
        const res = await createUseCase.execute(
          new CreateSupplierCommand({
            code: 'SUP-101',
            name: 'تجهیزات نفت',
            principal: TEST_PRINCIPAL,
          }),
        );
        return requireCreatedSupplier(res.valueOrThrow());
      });

      // Update once -> advances revision to 2
      await inTenant(TENANT_A, () =>
        updateUseCase.execute(
          new UpdateSupplierCommand({
            id: created.id,
            expectedRevision: 1,
            name: 'تجهیزات نفت ایران',
            principal: TEST_PRINCIPAL,
          }),
        ),
      );

      // Attempt second update with stale revision 1
      const staleResult = await inTenant(TENANT_A, () =>
        updateUseCase.execute(
          new UpdateSupplierCommand({
            id: created.id,
            expectedRevision: 1,
            name: 'تجهیزات نفت قشم',
            principal: TEST_PRINCIPAL,
          }),
        ),
      );

      expect(staleResult.isFail()).toBe(true);
      expect(staleResult.errorOrThrow().category).toBe('CONFLICT');
    });

    it('returns SUPPLIER_NOT_FOUND when supplier does not exist', async () => {
      const result = await inTenant(TENANT_A, () =>
        updateUseCase.execute(
          new UpdateSupplierCommand({
            id: '018f0d3c-6d0f-7a4b-9d4e-2b3c4d5e6f99',
            expectedRevision: 1,
            name: 'ناشناس',
            principal: TEST_PRINCIPAL,
          }),
        ),
      );

      expect(result.isFail()).toBe(true);
      expect(result.errorOrThrow().code).toBe('SUPPLIER_NOT_FOUND');
    });
  });

  describe('Deactivate and Activate Supplier Use Cases', () => {
    it('deactivates an active supplier and activates an inactive supplier', async () => {
      const created = await inTenant(TENANT_A, async () => {
        const res = await createUseCase.execute(
          new CreateSupplierCommand({
            code: 'SUP-200',
            name: 'تأمین کالا',
            principal: TEST_PRINCIPAL,
          }),
        );
        return requireCreatedSupplier(res.valueOrThrow());
      });

      // 1. Deactivate
      const deact = await inTenant(TENANT_A, () =>
        deactivateUseCase.execute(
          new DeactivateSupplierCommand({
            id: created.id,
            expectedRevision: 1,
            principal: TEST_PRINCIPAL,
          }),
        ),
      );

      expect(deact.isOk()).toBe(true);
      expect(deact.valueOrThrow().status).toBe('inactive');
      expect(deact.valueOrThrow().revision).toBe(2);

      // 2. Re-deactivating already inactive fails with SUPPLIER_ALREADY_INACTIVE
      const doubleDeact = await inTenant(TENANT_A, () =>
        deactivateUseCase.execute(
          new DeactivateSupplierCommand({
            id: created.id,
            expectedRevision: 2,
            principal: TEST_PRINCIPAL,
          }),
        ),
      );
      expect(doubleDeact.isFail()).toBe(true);
      expect(doubleDeact.errorOrThrow().code).toBe('SUPPLIER_ALREADY_INACTIVE');

      // 3. Activate
      const act = await inTenant(TENANT_A, () =>
        activateUseCase.execute(
          new ActivateSupplierCommand({
            id: created.id,
            expectedRevision: 2,
            principal: TEST_PRINCIPAL,
          }),
        ),
      );

      expect(act.isOk()).toBe(true);
      expect(act.valueOrThrow().status).toBe('active');
      expect(act.valueOrThrow().revision).toBe(3);

      // 4. Re-activating already active fails with SUPPLIER_ALREADY_ACTIVE
      const doubleAct = await inTenant(TENANT_A, () =>
        activateUseCase.execute(
          new ActivateSupplierCommand({
            id: created.id,
            expectedRevision: 3,
            principal: TEST_PRINCIPAL,
          }),
        ),
      );
      expect(doubleAct.isFail()).toBe(true);
      expect(doubleAct.errorOrThrow().code).toBe('SUPPLIER_ALREADY_ACTIVE');
    });
  });

  describe('GetById, List and Search Use Cases', () => {
    it('retrieves supplier by id with current revision', async () => {
      const created = await inTenant(TENANT_A, async () => {
        const res = await createUseCase.execute(
          new CreateSupplierCommand({
            code: 'SUP-300',
            name: 'آرمان سازه',
            principal: TEST_PRINCIPAL,
          }),
        );
        return requireCreatedSupplier(res.valueOrThrow());
      });

      const found = await inTenant(TENANT_A, () =>
        getByIdUseCase.execute(new GetSupplierByIdQuery({ id: created.id })),
      );

      expect(found.isOk()).toBe(true);
      expect(found.valueOrThrow().id).toBe(created.id);
      expect(found.valueOrThrow().code).toBe('SUP-300');
    });

    it('lists suppliers with pagination and status filters', async () => {
      await inTenant(TENANT_A, async () => {
        const createRes = await createUseCase.execute(
          new CreateSupplierCommand({
            code: 'A-01',
            name: 'Supplier 1',
            principal: TEST_PRINCIPAL,
          }),
        );
        const s1 = requireCreatedSupplier(createRes.valueOrThrow());
        await createUseCase.execute(
          new CreateSupplierCommand({
            code: 'A-02',
            name: 'Supplier 2',
            principal: TEST_PRINCIPAL,
          }),
        );
        await createUseCase.execute(
          new CreateSupplierCommand({
            code: 'A-03',
            name: 'Supplier 3',
            principal: TEST_PRINCIPAL,
          }),
        );
        // Deactivate s1
        await deactivateUseCase.execute(
          new DeactivateSupplierCommand({
            id: s1.id,
            expectedRevision: 1,
            principal: TEST_PRINCIPAL,
          }),
        );
      });

      // Filter: active only
      const activeOnly = await inTenant(TENANT_A, () =>
        listUseCase.execute(new ListSuppliersQuery({ status: 'active' })),
      );
      expect(activeOnly.isOk()).toBe(true);
      expect(activeOnly.valueOrThrow().items.length).toBe(2);

      // Filter: inactive only
      const inactiveOnly = await inTenant(TENANT_A, () =>
        listUseCase.execute(new ListSuppliersQuery({ status: 'inactive' })),
      );
      expect(inactiveOnly.isOk()).toBe(true);
      expect(inactiveOnly.valueOrThrow().items.length).toBe(1);

      // Filter: all with pagination
      const paged = await inTenant(TENANT_A, () =>
        listUseCase.execute(new ListSuppliersQuery({ status: 'all', page: 1, pageSize: 2 })),
      );
      expect(paged.isOk()).toBe(true);
      expect(paged.valueOrThrow().items.length).toBe(2);
      expect(paged.valueOrThrow().total).toBe(3);
      expect(paged.valueOrThrow().totalPages).toBe(2);
    });

    it('searches suppliers by text across name, code, and identification', async () => {
      await inTenant(TENANT_A, async () => {
        await createUseCase.execute(
          new CreateSupplierCommand({
            code: 'IRN-OIL',
            name: 'شرکت ملی نفت ایران',
            identificationNumber: '10100111111',
            principal: TEST_PRINCIPAL,
          }),
        );
        await createUseCase.execute(
          new CreateSupplierCommand({
            code: 'IRN-GAS',
            name: 'شرکت ملی گاز ایران',
            identificationNumber: '10100222222',
            principal: TEST_PRINCIPAL,
          }),
        );
      });

      // Search by Persian name variation (with Arabic Yeh)
      const resName = await inTenant(TENANT_A, () =>
        searchUseCase.execute(new SearchSuppliersQuery({ query: 'ملي نفت' })),
      );
      expect(resName.isOk()).toBe(true);
      expect(resName.valueOrThrow().length).toBe(1);
      expect(resName.valueOrThrow()[0].code).toBe('IRN-OIL');

      // Search by code
      const resCode = await inTenant(TENANT_A, () =>
        searchUseCase.execute(new SearchSuppliersQuery({ query: 'irn-gas' })),
      );
      expect(resCode.isOk()).toBe(true);
      expect(resCode.valueOrThrow().length).toBe(1);
      expect(resCode.valueOrThrow()[0].code).toBe('IRN-GAS');

      // Search by identification number
      const resId = await inTenant(TENANT_A, () =>
        searchUseCase.execute(new SearchSuppliersQuery({ query: '10100111111' })),
      );
      expect(resId.isOk()).toBe(true);
      expect(resId.valueOrThrow().length).toBe(1);
      expect(resId.valueOrThrow()[0].code).toBe('IRN-OIL');
    });
  });

  describe('SupplierLookup (Cross-Module contract)', () => {
    it('resolves an active supplier successfully', async () => {
      const created = await inTenant(TENANT_A, async () => {
        const res = await createUseCase.execute(
          new CreateSupplierCommand({
            code: 'SUP-400',
            name: 'فروشگاه ابزار دقیق',
            principal: TEST_PRINCIPAL,
          }),
        );
        return requireCreatedSupplier(res.valueOrThrow());
      });

      const outcome = await lookup.resolveActiveSupplier(TENANT_A, created.id);
      expect(outcome.isOk()).toBe(true);
      const view = outcome.valueOrThrow();
      expect(view.id).toBe(created.id);
      expect(view.code).toBe('SUP-400');
      expect(view.name).toBe('فروشگاه ابزار دقیق');
      expect(view.status).toBe('active');
    });

    it('returns SUPPLIER_NOT_FOUND when supplier ID is missing', async () => {
      const outcome = await lookup.resolveActiveSupplier(
        TENANT_A,
        '018f0d3c-6d0f-7a4b-9d4e-2b3c4d5e6f99',
      );
      expect(outcome.isFail()).toBe(true);
      expect(outcome.errorOrThrow().code).toBe('SUPPLIER_NOT_FOUND');
    });

    it('returns SUPPLIER_INACTIVE when supplier is inactive', async () => {
      const created = await inTenant(TENANT_A, async () => {
        const res = await createUseCase.execute(
          new CreateSupplierCommand({
            code: 'SUP-401',
            name: 'تأمین غیرفعال',
            principal: TEST_PRINCIPAL,
          }),
        );
        const s = requireCreatedSupplier(res.valueOrThrow());
        await deactivateUseCase.execute(
          new DeactivateSupplierCommand({
            id: s.id,
            expectedRevision: 1,
            principal: TEST_PRINCIPAL,
          }),
        );
        return s;
      });

      const outcome = await lookup.resolveActiveSupplier(TENANT_A, created.id);
      expect(outcome.isFail()).toBe(true);
      expect(outcome.errorOrThrow().code).toBe('SUPPLIER_INACTIVE');
    });
  });
});
