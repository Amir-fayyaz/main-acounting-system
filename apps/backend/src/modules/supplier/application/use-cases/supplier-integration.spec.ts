import { describe, expect, it } from 'vitest';
import { ActorScope } from '../../../../shared/actor/actor-scope.js';
import { TenantScope } from '../../../../shared/tenant/tenant-scope.js';
import { RecordingAuditTrail } from '../../../../../test/support/audit-doubles.js';
import {
  InMemorySupplierRepository,
  RecordingTransactionBoundary,
} from '../../../../../test/support/supplier-doubles.js';
import {
  ActivateSupplierCommand,
  CreateSupplierCommand,
  DeactivateSupplierCommand,
  UpdateSupplierCommand,
} from '../commands/supplier.commands.js';
import {
  RoleBasedSupplierAuthorizationPort,
  SUPPLIER_MANAGE_PERMISSION,
  SUPPLIER_READ_PERMISSION,
} from '../ports/supplier-authorization.port.js';
import {
  GetSupplierByIdQuery,
  ListSuppliersQuery,
  SearchSuppliersQuery,
} from '../queries/supplier.queries.js';
import { SupplierLookupService } from '../services/supplier-lookup.service.js';
import { ActivateSupplierUseCase } from './activate-supplier.use-case.js';
import { CreateSupplierUseCase } from './create-supplier.use-case.js';
import { DeactivateSupplierUseCase } from './deactivate-supplier.use-case.js';
import { GetSupplierByIdUseCase } from './get-supplier-by-id.use-case.js';
import { ListSuppliersUseCase } from './list-suppliers.use-case.js';
import { SearchSuppliersUseCase } from './search-suppliers.use-case.js';
import { UpdateSupplierUseCase } from './update-supplier.use-case.js';

const TENANT_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const MANAGER = {
  userId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  permissions: [SUPPLIER_MANAGE_PERMISSION, SUPPLIER_READ_PERMISSION],
};

describe('Supplier Application Integration Lifecycle', () => {
  it('executes full create -> duplicate confirm -> search -> update -> deactivate -> lookup -> activate flow', async () => {
    const repository = new InMemorySupplierRepository();
    const audit = new RecordingAuditTrail();
    const boundary = new RecordingTransactionBoundary();
    const auth = new RoleBasedSupplierAuthorizationPort();

    const createUc = new CreateSupplierUseCase(repository, auth, audit, boundary);
    const updateUc = new UpdateSupplierUseCase(repository, auth, audit, boundary);
    const deactivateUc = new DeactivateSupplierUseCase(repository, auth, audit, boundary);
    const activateUc = new ActivateSupplierUseCase(repository, auth, audit, boundary);
    const getByIdUc = new GetSupplierByIdUseCase(repository, auth);
    const listUc = new ListSuppliersUseCase(repository, auth);
    const searchUc = new SearchSuppliersUseCase(repository, auth);
    const lookup = new SupplierLookupService(repository);

    await TenantScope.run({ state: 'available', tenantId: TENANT_ID }, () =>
      ActorScope.run(MANAGER.userId, async () => {
        // 1. Create primary supplier
        const first = await createUc.execute(
          new CreateSupplierCommand({
            code: 'SUP-100',
            name: 'تولیدی کیمیا',
            identificationNumber: '1010101010',
            principal: MANAGER,
          }),
        );
        expect(first.isOk()).toBe(true);
        const firstOutcome = first.valueOrThrow();
        if (firstOutcome.status !== 'created') throw new Error('Expected created');

        // 2. Duplicate warning with variant spelling
        const dup = await createUc.execute(
          new CreateSupplierCommand({
            code: 'SUP-101',
            name: 'تولیدي كيميا',
            principal: MANAGER,
          }),
        );
        expect(dup.isOk()).toBe(true);
        expect(dup.valueOrThrow().status).toBe('possible_duplicates');

        // 3. Confirm duplicate creation
        const second = await createUc.execute(
          new CreateSupplierCommand({
            code: 'SUP-101',
            name: 'تولیدي كيميا',
            confirmDuplicate: true,
            principal: MANAGER,
          }),
        );
        expect(second.isOk()).toBe(true);
        expect(second.valueOrThrow().status).toBe('created');

        // 4. Search with Persian variant
        const found = await searchUc.execute(
          new SearchSuppliersQuery({ query: 'کیمیا', principal: MANAGER }),
        );
        expect(found.isOk()).toBe(true);
        expect(found.valueOrThrow().total).toBe(2);

        // 5. Update first supplier
        const updated = await updateUc.execute(
          new UpdateSupplierCommand({
            id: firstOutcome.supplier.id,
            expectedRevision: 1,
            name: 'تولیدی کیمیا گستر',
            contactInfo: { phone: '02144445555' },
            principal: MANAGER,
          }),
        );
        expect(updated.isOk()).toBe(true);
        expect(updated.valueOrThrow().revision).toBe(2);

        // 6. Deactivate and verify lookup refuses it
        const deactivated = await deactivateUc.execute(
          new DeactivateSupplierCommand({
            id: firstOutcome.supplier.id,
            expectedRevision: 2,
            principal: MANAGER,
          }),
        );
        expect(deactivated.isOk()).toBe(true);
        expect(deactivated.valueOrThrow().status).toBe('inactive');

        const lookupInactive = await lookup.resolveActive(TENANT_ID, firstOutcome.supplier.id);
        expect(lookupInactive.isFail()).toBe(true);
        expect(lookupInactive.errorOrThrow().code).toBe('SUPPLIER_INACTIVE');

        // 7. List filtered by inactive
        const inactiveList = await listUc.execute(
          new ListSuppliersQuery({ status: 'inactive', principal: MANAGER }),
        );
        expect(inactiveList.isOk()).toBe(true);
        expect(inactiveList.valueOrThrow().total).toBe(1);

        // 8. Activate and verify lookup & getById succeed
        const activated = await activateUc.execute(
          new ActivateSupplierCommand({
            id: firstOutcome.supplier.id,
            expectedRevision: 3,
            principal: MANAGER,
          }),
        );
        expect(activated.isOk()).toBe(true);
        expect(activated.valueOrThrow().revision).toBe(4);

        const lookupActive = await lookup.resolveActive(TENANT_ID, firstOutcome.supplier.id);
        expect(lookupActive.isOk()).toBe(true);

        const fetched = await getByIdUc.execute(
          new GetSupplierByIdQuery({ id: firstOutcome.supplier.id, principal: MANAGER }),
        );
        expect(fetched.isOk()).toBe(true);
        expect(fetched.valueOrThrow().name).toBe('تولیدی کیمیا گستر');
      }),
    );

    expect(boundary.executions).toBe(6);
    expect(audit.recorded.map((entry) => entry.action)).toEqual([
      'supplier.create',
      'supplier.create',
      'supplier.update',
      'supplier.deactivate',
      'supplier.activate',
    ]);
  });
});
