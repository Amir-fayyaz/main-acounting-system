import { describe, expect, it } from 'vitest';
import { ActorScope } from '../../../../shared/actor/actor-scope.js';
import {
  PersistenceError,
  PersistenceFailureKind,
} from '../../../../shared/persistence/persistence-error.js';
import { Revision } from '../../../../shared/persistence/revision.js';
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
  AllowAllSupplierAuthorizationPort,
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

function createHarness(options?: { roleBased?: boolean }) {
  const repository = new InMemorySupplierRepository();
  const audit = new RecordingAuditTrail();
  const boundary = new RecordingTransactionBoundary();
  const authorization = options?.roleBased
    ? new RoleBasedSupplierAuthorizationPort()
    : new AllowAllSupplierAuthorizationPort();

  return {
    repository,
    audit,
    boundary,
    authorization,
    createSupplier: new CreateSupplierUseCase(repository, authorization, audit, boundary),
    updateSupplier: new UpdateSupplierUseCase(repository, authorization, audit, boundary),
    deactivateSupplier: new DeactivateSupplierUseCase(repository, authorization, audit, boundary),
    activateSupplier: new ActivateSupplierUseCase(repository, authorization, audit, boundary),
    getById: new GetSupplierByIdUseCase(repository, authorization),
    list: new ListSuppliersUseCase(repository, authorization),
    search: new SearchSuppliersUseCase(repository, authorization),
    lookup: new SupplierLookupService(repository),
  };
}

const TENANT_A = '11111111-1111-4111-8111-111111111111';
const TENANT_B = '22222222-2222-4222-8222-222222222222';
const ACTOR_ID = '33333333-3333-4333-8333-333333333333';

describe('Supplier Application Use Cases', () => {
  it('creates a supplier inside transaction boundary and records audit with ambient actor', async () => {
    const h = createHarness();

    const result = await TenantScope.run({ state: 'available', tenantId: TENANT_A }, () =>
      ActorScope.run(ACTOR_ID, () =>
        h.createSupplier.execute(
          new CreateSupplierCommand({
            code: 'SUP-001',
            name: 'شرکت پارس',
            identificationNumber: '1234567890',
            contactInfo: { phone: '02188887777', email: 'info@pars.ir' },
          }),
        ),
      ),
    );

    expect(result.isOk()).toBe(true);
    const value = result.valueOrThrow();
    expect(value.status).toBe('created');
    if (value.status === 'created') {
      expect(value.supplier.code).toBe('SUP-001');
      expect(value.supplier.name).toBe('شرکت پارس');
      expect(value.supplier.status).toBe('active');
      expect(value.supplier.revision).toBe(1);
    }
    expect(h.boundary.executions).toBe(1);
    expect(h.audit.recorded).toHaveLength(1);
    expect(h.audit.recorded[0]).toMatchObject({
      action: 'supplier.create',
      outcome: 'success',
      actorUserId: ACTOR_ID,
    });
  });

  it('reports possible duplicates for normalized Persian name variants and creates only after confirmation', async () => {
    const h = createHarness();

    await TenantScope.run({ state: 'available', tenantId: TENANT_A }, () =>
      h.createSupplier.execute(
        new CreateSupplierCommand({
          code: 'SUP-001',
          name: 'شرکت کیک و شیرینی',
        }),
      ),
    );

    // Same name using Arabic kaf/yeh and ZWNJ
    const duplicateCheck = await TenantScope.run({ state: 'available', tenantId: TENANT_A }, () =>
      h.createSupplier.execute(
        new CreateSupplierCommand({
          code: 'SUP-002',
          name: 'شركت كیك\u200c و شيرينى',
        }),
      ),
    );

    expect(duplicateCheck.isOk()).toBe(true);
    const dupOutcome = duplicateCheck.valueOrThrow();
    expect(dupOutcome.status).toBe('possible_duplicates');
    if (dupOutcome.status === 'possible_duplicates') {
      expect(dupOutcome.duplicates).toHaveLength(1);
      expect(dupOutcome.duplicates[0]?.code).toBe('SUP-001');
    }

    // Confirming creates the second supplier
    const confirmed = await TenantScope.run({ state: 'available', tenantId: TENANT_A }, () =>
      h.createSupplier.execute(
        new CreateSupplierCommand({
          code: 'SUP-002',
          name: 'شركت كیك\u200c و شيرينى',
          confirmDuplicate: true,
        }),
      ),
    );

    expect(confirmed.isOk()).toBe(true);
    expect(confirmed.valueOrThrow().status).toBe('created');
  });

  it('refuses duplicate code and identification number even when confirmDuplicate is true', async () => {
    const h = createHarness();

    await TenantScope.run({ state: 'available', tenantId: TENANT_A }, () =>
      h.createSupplier.execute(
        new CreateSupplierCommand({
          code: 'SUP-001',
          name: 'تامین کننده یک',
          identificationNumber: '1234567890',
        }),
      ),
    );

    const dupCode = await TenantScope.run({ state: 'available', tenantId: TENANT_A }, () =>
      h.createSupplier.execute(
        new CreateSupplierCommand({
          code: 'sup-001',
          name: 'تامین کننده دو',
          confirmDuplicate: true,
        }),
      ),
    );
    expect(dupCode.isFail()).toBe(true);
    expect(dupCode.errorOrThrow().code).toBe('SUPPLIER_CODE_DUPLICATE');

    const dupId = await TenantScope.run({ state: 'available', tenantId: TENANT_A }, () =>
      h.createSupplier.execute(
        new CreateSupplierCommand({
          code: 'SUP-002',
          name: 'تامین کننده دو',
          identificationNumber: '۱۲۳۴۵۶۷۸۹۰',
          confirmDuplicate: true,
        }),
      ),
    );
    expect(dupId.isFail()).toBe(true);
    expect(dupId.errorOrThrow().code).toBe('SUPPLIER_IDENTIFICATION_DUPLICATE');
  });

  it('maps database unique constraint PersistenceError(CONFLICT) to domain duplicate errors', async () => {
    const h = createHarness();
    const originalAdd = h.repository.add.bind(h.repository);
    h.repository.add = async () => {
      throw new PersistenceError(PersistenceFailureKind.CONFLICT, 'Suppliers.add.code', {
        cause: new Error('Unique constraint supplier_code failed'),
      });
    };

    const result = await TenantScope.run({ state: 'available', tenantId: TENANT_A }, () =>
      h.createSupplier.execute(
        new CreateSupplierCommand({
          code: 'SUP-RACE',
          name: 'تامین مسابقه',
        }),
      ),
    );

    expect(result.isFail()).toBe(true);
    expect(result.errorOrThrow().code).toBe('SUPPLIER_CODE_DUPLICATE');

    h.repository.add = originalAdd;
  });

  it('refuses unauthorized writes and records a denied audit entry', async () => {
    const h = createHarness({ roleBased: true });
    const viewerPrincipal = { userId: ACTOR_ID, permissions: [SUPPLIER_READ_PERMISSION] };

    const result = await TenantScope.run({ state: 'available', tenantId: TENANT_A }, () =>
      ActorScope.run(ACTOR_ID, () =>
        h.createSupplier.execute(
          new CreateSupplierCommand({
            code: 'SUP-001',
            name: 'تامین کننده',
            principal: viewerPrincipal,
          }),
        ),
      ),
    );

    expect(result.isFail()).toBe(true);
    expect(result.errorOrThrow().code).toBe('SUPPLIER_PERMISSION_DENIED');
    expect(h.audit.recorded).toHaveLength(1);
    expect(h.audit.recorded[0]).toMatchObject({
      action: 'supplier.create',
      outcome: 'denied',
      actorUserId: ACTOR_ID,
    });
  });

  it('updates supplier fields and refuses stale revision', async () => {
    const h = createHarness();

    const created = await TenantScope.run({ state: 'available', tenantId: TENANT_A }, () =>
      h.createSupplier.execute(
        new CreateSupplierCommand({
          code: 'SUP-001',
          name: 'نام قدیم',
          identificationNumber: '111222333',
        }),
      ),
    );
    const createdOutcome = created.valueOrThrow();
    if (createdOutcome.status !== 'created') throw new Error('Expected created');
    const id = createdOutcome.supplier.id;

    const updated = await TenantScope.run({ state: 'available', tenantId: TENANT_A }, () =>
      h.updateSupplier.execute(
        new UpdateSupplierCommand({
          id,
          expectedRevision: 1,
          name: 'نام جدید',
          identificationNumber: null,
        }),
      ),
    );

    expect(updated.isOk()).toBe(true);
    expect(updated.valueOrThrow().name).toBe('نام جدید');
    expect(updated.valueOrThrow().identificationNumber).toBeUndefined();
    expect(updated.valueOrThrow().revision).toBe(2);

    const stale = await TenantScope.run({ state: 'available', tenantId: TENANT_A }, () =>
      h.updateSupplier.execute(
        new UpdateSupplierCommand({
          id,
          expectedRevision: 1,
          name: 'نام منقضی',
        }),
      ),
    );
    expect(stale.isFail()).toBe(true);
    expect(stale.errorOrThrow().code).toBe('CONFLICT');
  });

  it('deactivates, activates, and enforces state transitions and lookup usability', async () => {
    const h = createHarness();

    const created = await TenantScope.run({ state: 'available', tenantId: TENANT_A }, () =>
      h.createSupplier.execute(
        new CreateSupplierCommand({
          code: 'SUP-001',
          name: 'تامین فعال',
        }),
      ),
    );
    const createdOutcome = created.valueOrThrow();
    if (createdOutcome.status !== 'created') throw new Error('Expected created');
    const id = createdOutcome.supplier.id;

    // Lookup succeeds when active
    const lookupActive = await h.lookup.resolveActive(TENANT_A, id);
    expect(lookupActive.isOk()).toBe(true);
    expect(lookupActive.valueOrThrow().status).toBe('active');

    // Deactivate
    const deactivated = await TenantScope.run({ state: 'available', tenantId: TENANT_A }, () =>
      h.deactivateSupplier.execute(new DeactivateSupplierCommand({ id, expectedRevision: 1 })),
    );
    expect(deactivated.isOk()).toBe(true);
    expect(deactivated.valueOrThrow().status).toBe('inactive');

    // Double deactivate fails
    const doubleDeactivate = await TenantScope.run({ state: 'available', tenantId: TENANT_A }, () =>
      h.deactivateSupplier.execute(new DeactivateSupplierCommand({ id, expectedRevision: 2 })),
    );
    expect(doubleDeactivate.isFail()).toBe(true);
    expect(doubleDeactivate.errorOrThrow().code).toBe('SUPPLIER_ALREADY_INACTIVE');

    // Lookup refuses inactive supplier
    const lookupInactive = await h.lookup.resolveActive(TENANT_A, id);
    expect(lookupInactive.isFail()).toBe(true);
    expect(lookupInactive.errorOrThrow().code).toBe('SUPPLIER_INACTIVE');

    // Activate
    const activated = await TenantScope.run({ state: 'available', tenantId: TENANT_A }, () =>
      h.activateSupplier.execute(new ActivateSupplierCommand({ id, expectedRevision: 2 })),
    );
    expect(activated.isOk()).toBe(true);
    expect(activated.valueOrThrow().status).toBe('active');
    expect(activated.valueOrThrow().revision).toBe(3);

    // Double activate fails
    const doubleActivate = await TenantScope.run({ state: 'available', tenantId: TENANT_A }, () =>
      h.activateSupplier.execute(new ActivateSupplierCommand({ id, expectedRevision: 3 })),
    );
    expect(doubleActivate.isFail()).toBe(true);
    expect(doubleActivate.errorOrThrow().code).toBe('SUPPLIER_ALREADY_ACTIVE');
  });

  it('enforces tenant isolation across queries, writes, and lookup', async () => {
    const h = createHarness({ roleBased: true });
    const manager = { userId: ACTOR_ID, permissions: [SUPPLIER_MANAGE_PERMISSION] };

    const createdA = await TenantScope.run({ state: 'available', tenantId: TENANT_A }, () =>
      h.createSupplier.execute(
        new CreateSupplierCommand({
          code: 'SUP-001',
          name: 'تامین الف',
          principal: manager,
        }),
      ),
    );
    const outcomeA = createdA.valueOrThrow();
    if (outcomeA.status !== 'created') throw new Error('Expected created');

    // Tenant B can create with the same code and name without conflict or duplicate warning
    const createdB = await TenantScope.run({ state: 'available', tenantId: TENANT_B }, () =>
      h.createSupplier.execute(
        new CreateSupplierCommand({
          code: 'SUP-001',
          name: 'تامین الف',
          principal: manager,
        }),
      ),
    );
    expect(createdB.isOk()).toBe(true);
    expect(createdB.valueOrThrow().status).toBe('created');

    // Tenant B cannot get or lookup Tenant A's supplier
    const getFromB = await TenantScope.run({ state: 'available', tenantId: TENANT_B }, () =>
      h.getById.execute(new GetSupplierByIdQuery({ id: outcomeA.supplier.id, principal: manager })),
    );
    expect(getFromB.isFail()).toBe(true);
    expect(getFromB.errorOrThrow().code).toBe('SUPPLIER_NOT_FOUND');

    const lookupFromB = await h.lookup.resolveActive(TENANT_B, outcomeA.supplier.id);
    expect(lookupFromB.isFail()).toBe(true);
    expect(lookupFromB.errorOrThrow().code).toBe('SUPPLIER_NOT_FOUND');

    // Missing or malformed id in lookup returns SUPPLIER_NOT_FOUND
    const lookupMalformed = await h.lookup.resolveActive(TENANT_A, 'not-a-uuid');
    expect(lookupMalformed.isFail()).toBe(true);
    expect(lookupMalformed.errorOrThrow().code).toBe('SUPPLIER_NOT_FOUND');
  });

  it('lists with pagination/status filter and searches with Persian normalization', async () => {
    const h = createHarness();

    const s1 = await TenantScope.run({ state: 'available', tenantId: TENANT_A }, () =>
      h.createSupplier.execute(new CreateSupplierCommand({ code: 'SUP-001', name: 'آلفا' })),
    );
    await TenantScope.run({ state: 'available', tenantId: TENANT_A }, () =>
      h.createSupplier.execute(new CreateSupplierCommand({ code: 'SUP-002', name: 'کابل پارس' })),
    );
    await TenantScope.run({ state: 'available', tenantId: TENANT_A }, () =>
      h.createSupplier.execute(new CreateSupplierCommand({ code: 'SUP-003', name: 'بتا' })),
    );

    const s1View = s1.valueOrThrow();
    if (s1View.status !== 'created') throw new Error('Expected created');
    await TenantScope.run({ state: 'available', tenantId: TENANT_A }, () =>
      h.deactivateSupplier.execute(
        new DeactivateSupplierCommand({ id: s1View.supplier.id, expectedRevision: 1 }),
      ),
    );

    const activePage = await TenantScope.run({ state: 'available', tenantId: TENANT_A }, () =>
      h.list.execute(new ListSuppliersQuery({ status: 'active', page: 1, pageSize: 1 })),
    );
    expect(activePage.isOk()).toBe(true);
    expect(activePage.valueOrThrow().total).toBe(2);
    expect(activePage.valueOrThrow().items).toHaveLength(1);

    const searchArabic = await TenantScope.run({ state: 'available', tenantId: TENANT_A }, () =>
      h.search.execute(new SearchSuppliersQuery({ query: 'كابل' })),
    );
    expect(searchArabic.isOk()).toBe(true);
    expect(searchArabic.valueOrThrow().items).toHaveLength(1);
    expect(searchArabic.valueOrThrow().items[0]?.code).toBe('SUP-002');
  });

  it('handles concurrent update race via repository Revision check', async () => {
    const h = createHarness();
    const created = await TenantScope.run({ state: 'available', tenantId: TENANT_A }, () =>
      h.createSupplier.execute(new CreateSupplierCommand({ code: 'SUP-001', name: 'تامین' })),
    );
    const outcome = created.valueOrThrow();
    if (outcome.status !== 'created') throw new Error('Expected created');

    const loaded = await h.repository.get(
      TENANT_A,
      (await h.repository.findByTenant(TENANT_A))[0]!.aggregate.id,
    );
    expect(loaded?.revision.equals(Revision.initial())).toBe(true);

    // Simulate concurrent write advancing revision
    await h.repository.update(loaded!.aggregate, Revision.initial());

    const staleUpdate = await TenantScope.run({ state: 'available', tenantId: TENANT_A }, () =>
      h.updateSupplier.execute(
        new UpdateSupplierCommand({
          id: outcome.supplier.id,
          expectedRevision: 1,
          name: 'نام همزمان',
        }),
      ),
    );
    expect(staleUpdate.isFail()).toBe(true);
    expect(staleUpdate.errorOrThrow().code).toBe('CONFLICT');
  });
});
