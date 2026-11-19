import { describe, expect, it, beforeEach } from 'vitest';
import { createTenantContext } from '../../../../shared/tenant/tenant-context.js';
import { TenantScope } from '../../../../shared/tenant/tenant-scope.js';
import { ActorScope } from '../../../../shared/actor/actor-scope.js';
import { RecordingAuditTrail } from '../../../../../test/support/audit-doubles.js';
import { PassthroughTransactionBoundary } from '../../../../../test/support/membership-doubles.js';
import { InMemorySupplierRepository } from '../../../../../test/support/supplier-doubles.js';
import type { AuthenticatedPrincipalView } from '../../../identity/application/views/principal.view.js';
import { SupplierCode } from '../../domain/value-objects/supplier-code.js';
import {
  AllowAllSupplierAuthorization,
  DenyAllSupplierAuthorization,
} from '../ports/supplier-authorization.port.js';
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

const TENANT_A = '018f0d3c-6d0f-7a4b-9d4e-2b3c4d5e6f71';
const TENANT_B = '018f0d3c-6d0f-7a4b-9d4e-2b3c4d5e6f72';

const UNAUTHORIZED_PRINCIPAL: AuthenticatedPrincipalView = {
  userId: 'usr-unauthorized-001',
  displayName: 'Unauthorized User',
  email: 'unauthorized@example.com',
};

const ACCOUNTANT_PRINCIPAL: AuthenticatedPrincipalView = {
  userId: 'usr-accountant-001',
  displayName: 'Accountant User',
  email: 'accountant@example.com',
};

function inTenant<T>(
  tenantId: string,
  principal: AuthenticatedPrincipalView,
  work: () => Promise<T>,
): Promise<T> {
  return TenantScope.run(createTenantContext(tenantId), () =>
    ActorScope.run(principal.userId, work),
  );
}

function requireCreatedSupplier(result: CreateSupplierResult): SupplierView {
  if (result.status !== 'created') {
    throw new Error(`Expected supplier to be created but got status: ${result.status}`);
  }
  return result.supplier;
}

describe('Supplier Integration Tests (S4)', () => {
  describe('Role-refused writes produce audit entry and roll back', () => {
    let repository: InMemorySupplierRepository;
    let audit: RecordingAuditTrail;
    let boundary: PassthroughTransactionBoundary;
    let deniedAuth: DenyAllSupplierAuthorization;
    let allowAuth: AllowAllSupplierAuthorization;

    beforeEach(() => {
      repository = new InMemorySupplierRepository();
      audit = new RecordingAuditTrail();
      boundary = new PassthroughTransactionBoundary();
      deniedAuth = new DenyAllSupplierAuthorization();
      allowAuth = new AllowAllSupplierAuthorization();
    });

    it('refuses create write without role, records denied audit, and leaves state untouched', async () => {
      const createUseCase = new CreateSupplierUseCase(repository, deniedAuth, audit, boundary);

      const result = await inTenant(TENANT_A, UNAUTHORIZED_PRINCIPAL, () =>
        createUseCase.execute(
          new CreateSupplierCommand({
            code: 'SUP-REFUSED-01',
            name: 'شرکت تست رد شده',
            principal: UNAUTHORIZED_PRINCIPAL,
          }),
        ),
      );

      // 1. Refused
      expect(result.isFail()).toBe(true);
      expect(result.errorOrThrow().code).toBe('SUPPLIER_PERMISSION_DENIED');

      // 2. Audit entry produced
      const auditEntry = audit.find('supplier.create');
      expect(auditEntry).toBeDefined();
      expect(auditEntry?.outcome).toBe('denied');
      expect(auditEntry?.actorUserId).toBe(UNAUTHORIZED_PRINCIPAL.userId);

      // 3. Rollback / no change in repository
      const listed = await repository.list(TENANT_A, {});
      expect(listed.total).toBe(0);
      expect(repository.addCalls).toBe(0);
    });

    it('refuses update write without role, records denied audit, and leaves aggregate untouched', async () => {
      const allowCreate = new CreateSupplierUseCase(repository, allowAuth, audit, boundary);
      const deniedUpdate = new UpdateSupplierUseCase(repository, deniedAuth, audit, boundary);

      // Seed valid supplier
      const created = await inTenant(TENANT_A, ACCOUNTANT_PRINCIPAL, async () => {
        const res = await allowCreate.execute(
          new CreateSupplierCommand({
            code: 'SUP-001',
            name: 'نام اولیه معتبر',
            principal: ACCOUNTANT_PRINCIPAL,
          }),
        );
        return requireCreatedSupplier(res.valueOrThrow());
      });

      // Attempt unauthorized update
      const updateResult = await inTenant(TENANT_A, UNAUTHORIZED_PRINCIPAL, () =>
        deniedUpdate.execute(
          new UpdateSupplierCommand({
            id: created.id,
            expectedRevision: 1,
            name: 'نام غیرمجاز تغییر یافته',
            principal: UNAUTHORIZED_PRINCIPAL,
          }),
        ),
      );

      // 1. Refused
      expect(updateResult.isFail()).toBe(true);
      expect(updateResult.errorOrThrow().code).toBe('SUPPLIER_PERMISSION_DENIED');

      // 2. Audit denial recorded
      const denialAudit = audit.recorded.find(
        (e) => e.action === 'supplier.update' && e.outcome === 'denied',
      );
      expect(denialAudit).toBeDefined();
      expect(denialAudit?.actorUserId).toBe(UNAUTHORIZED_PRINCIPAL.userId);

      // 3. Rollback / record untouched
      const current = await repository.findByCode(TENANT_A, SupplierCode.from('SUP-001'));
      expect(current).toBeDefined();
      expect(current?.aggregate.name.value).toBe('نام اولیه معتبر');
      expect(current?.revision.value).toBe(1);
    });

    it('refuses deactivate and activate writes without role, records denied audit', async () => {
      const allowCreate = new CreateSupplierUseCase(repository, allowAuth, audit, boundary);
      const deniedDeact = new DeactivateSupplierUseCase(repository, deniedAuth, audit, boundary);
      const deniedAct = new ActivateSupplierUseCase(repository, deniedAuth, audit, boundary);

      const created = await inTenant(TENANT_A, ACCOUNTANT_PRINCIPAL, async () => {
        const res = await allowCreate.execute(
          new CreateSupplierCommand({
            code: 'SUP-DEACT',
            name: 'تأمین‌کننده تست',
            principal: ACCOUNTANT_PRINCIPAL,
          }),
        );
        return requireCreatedSupplier(res.valueOrThrow());
      });

      // Refuse deactivation
      const deactRes = await inTenant(TENANT_A, UNAUTHORIZED_PRINCIPAL, () =>
        deniedDeact.execute(
          new DeactivateSupplierCommand({
            id: created.id,
            expectedRevision: 1,
            principal: UNAUTHORIZED_PRINCIPAL,
          }),
        ),
      );
      expect(deactRes.isFail()).toBe(true);
      expect(deactRes.errorOrThrow().code).toBe('SUPPLIER_PERMISSION_DENIED');
      const deactAudit = audit.recorded.find(
        (e) => e.action === 'supplier.deactivate' && e.outcome === 'denied',
      );
      expect(deactAudit).toBeDefined();

      // Refuse activation
      const actRes = await inTenant(TENANT_A, UNAUTHORIZED_PRINCIPAL, () =>
        deniedAct.execute(
          new ActivateSupplierCommand({
            id: created.id,
            expectedRevision: 1,
            principal: UNAUTHORIZED_PRINCIPAL,
          }),
        ),
      );
      expect(actRes.isFail()).toBe(true);
      expect(actRes.errorOrThrow().code).toBe('SUPPLIER_PERMISSION_DENIED');
      const actAudit = audit.recorded.find(
        (e) => e.action === 'supplier.activate' && e.outcome === 'denied',
      );
      expect(actAudit).toBeDefined();
    });
  });

  describe('Multi-tenant isolation: two tenants with identical supplier names operate independently', () => {
    let repository: InMemorySupplierRepository;
    let audit: RecordingAuditTrail;
    let boundary: PassthroughTransactionBoundary;
    let authorization: AllowAllSupplierAuthorization;

    let createUseCase: CreateSupplierUseCase;
    let getByIdUseCase: GetSupplierByIdUseCase;
    let listUseCase: ListSuppliersUseCase;
    let searchUseCase: SearchSuppliersUseCase;
    let lookup: DefaultSupplierLookup;

    beforeEach(() => {
      repository = new InMemorySupplierRepository();
      audit = new RecordingAuditTrail();
      boundary = new PassthroughTransactionBoundary();
      authorization = new AllowAllSupplierAuthorization();

      createUseCase = new CreateSupplierUseCase(repository, authorization, audit, boundary);
      getByIdUseCase = new GetSupplierByIdUseCase(repository);
      listUseCase = new ListSuppliersUseCase(repository);
      searchUseCase = new SearchSuppliersUseCase(repository);
      lookup = new DefaultSupplierLookup(repository);
    });

    it('allows identical code, name, and identification across two distinct tenants without interference', async () => {
      // 1. Create supplier in Tenant A
      const resA = await inTenant(TENANT_A, ACCOUNTANT_PRINCIPAL, () =>
        createUseCase.execute(
          new CreateSupplierCommand({
            code: 'SUP-DUPLICATE-CROSS-TENANT',
            name: 'شرکت پتروشیمی خلیج فارس',
            identificationNumber: '10100999999',
            principal: ACCOUNTANT_PRINCIPAL,
          }),
        ),
      );
      expect(resA.isOk()).toBe(true);
      const supplierA = requireCreatedSupplier(resA.valueOrThrow());

      // 2. Create supplier with identical code, identical name, and identical identification in Tenant B
      const resB = await inTenant(TENANT_B, ACCOUNTANT_PRINCIPAL, () =>
        createUseCase.execute(
          new CreateSupplierCommand({
            code: 'SUP-DUPLICATE-CROSS-TENANT',
            name: 'شرکت پتروشیمی خلیج فارس',
            identificationNumber: '10100999999',
            principal: ACCOUNTANT_PRINCIPAL,
          }),
        ),
      );
      expect(resB.isOk()).toBe(true);
      const supplierB = requireCreatedSupplier(resB.valueOrThrow());

      // Ensure distinct entity IDs
      expect(supplierA.id).not.toBe(supplierB.id);

      // 3. In Tenant A context:
      // List contains only supplierA
      const listA = await inTenant(TENANT_A, ACCOUNTANT_PRINCIPAL, () =>
        listUseCase.execute(new ListSuppliersQuery()),
      );
      expect(listA.valueOrThrow().items.length).toBe(1);
      expect(listA.valueOrThrow().items[0].id).toBe(supplierA.id);

      // Get supplierA succeeds
      const getA = await inTenant(TENANT_A, ACCOUNTANT_PRINCIPAL, () =>
        getByIdUseCase.execute(new GetSupplierByIdQuery({ id: supplierA.id })),
      );
      expect(getA.isOk()).toBe(true);

      // Get supplierB from Tenant A fails with SUPPLIER_NOT_FOUND
      const crossGetA = await inTenant(TENANT_A, ACCOUNTANT_PRINCIPAL, () =>
        getByIdUseCase.execute(new GetSupplierByIdQuery({ id: supplierB.id })),
      );
      expect(crossGetA.isFail()).toBe(true);
      expect(crossGetA.errorOrThrow().code).toBe('SUPPLIER_NOT_FOUND');

      // Search in Tenant A matches only supplierA
      const searchA = await inTenant(TENANT_A, ACCOUNTANT_PRINCIPAL, () =>
        searchUseCase.execute(new SearchSuppliersQuery({ query: 'خلیج فارس' })),
      );
      expect(searchA.valueOrThrow().length).toBe(1);
      expect(searchA.valueOrThrow()[0].id).toBe(supplierA.id);

      // Lookup in Tenant A cannot resolve supplierB
      const crossLookup = await lookup.resolveActiveSupplier(TENANT_A, supplierB.id);
      expect(crossLookup.isFail()).toBe(true);
      expect(crossLookup.errorOrThrow().code).toBe('SUPPLIER_NOT_FOUND');

      // 4. In Tenant B context:
      // List contains only supplierB
      const listB = await inTenant(TENANT_B, ACCOUNTANT_PRINCIPAL, () =>
        listUseCase.execute(new ListSuppliersQuery()),
      );
      expect(listB.valueOrThrow().items.length).toBe(1);
      expect(listB.valueOrThrow().items[0].id).toBe(supplierB.id);

      // Lookup in Tenant B resolves supplierB, but rejects supplierA
      const lookupB = await lookup.resolveActiveSupplier(TENANT_B, supplierB.id);
      expect(lookupB.isOk()).toBe(true);
      expect(lookupB.valueOrThrow().id).toBe(supplierB.id);

      const crossLookupB = await lookup.resolveActiveSupplier(TENANT_B, supplierA.id);
      expect(crossLookupB.isFail()).toBe(true);
      expect(crossLookupB.errorOrThrow().code).toBe('SUPPLIER_NOT_FOUND');
    });
  });
});
