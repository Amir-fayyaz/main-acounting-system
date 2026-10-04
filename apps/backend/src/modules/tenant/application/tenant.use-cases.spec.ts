import { describe, expect, it } from 'vitest';
import { ConflictError } from '../../../shared/errors/category-errors.js';
import { EntityId } from '../../../shared/id/entity-id.js';
import { Revision } from '../../../shared/persistence/revision.js';
import { createTenantContext } from '../../../shared/tenant/tenant-context.js';
import { TenantScope } from '../../../shared/tenant/tenant-scope.js';
import { TenantContextMissingError } from '../../../shared/tenant/tenant.errors.js';
import {
  InMemoryTenantRepository,
  PassthroughTransactionBoundary,
  RecordingTenantEvents,
  aTenant,
} from '../../../../test/support/tenant-doubles.js';
import { ChangeTenantStatusUseCase } from './use-cases/change-tenant-status.use-case.js';
import { ChangeTenantStatus } from './commands/change-tenant-status.command.js';
import { CreateTenant } from './commands/create-tenant.command.js';
import { UpdateTenant } from './commands/update-tenant.command.js';
import { tenantContext } from './services/tenant-context.js';
import { CreateTenantUseCase } from './use-cases/create-tenant.use-case.js';
import { GetTenantUseCase } from './use-cases/get-tenant.use-case.js';
import { GetTenant } from './queries/get-tenant.query.js';
import { UpdateTenantUseCase } from './use-cases/update-tenant.use-case.js';
import { tenantIdFrom } from '../domain/value-objects/tenant-id.js';
import { TenantStatus } from '../domain/value-objects/tenant-status.js';

interface Harness {
  readonly repository: InMemoryTenantRepository;
  readonly events: RecordingTenantEvents;
  readonly boundary: PassthroughTransactionBoundary;
  readonly createTenant: CreateTenantUseCase;
  readonly getTenant: GetTenantUseCase;
  readonly updateTenant: UpdateTenantUseCase;
  readonly changeTenantStatus: ChangeTenantStatusUseCase;
}

function harness(): Harness {
  const repository = new InMemoryTenantRepository();
  const events = new RecordingTenantEvents();
  const boundary = new PassthroughTransactionBoundary();

  return {
    repository,
    events,
    boundary,
    createTenant: new CreateTenantUseCase(repository, events, boundary),
    getTenant: new GetTenantUseCase(repository),
    updateTenant: new UpdateTenantUseCase(repository, events, boundary),
    changeTenantStatus: new ChangeTenantStatusUseCase(repository, events, boundary),
  };
}

/** Runs tenant-scoped work the way the trusted entry point does. */
function inTenant<T>(tenantId: string, work: () => Promise<T>): Promise<T> {
  return TenantScope.run(createTenantContext(tenantId), work);
}

function randomTenantId(): string {
  return EntityId.generate().value;
}

describe('tenant use cases', () => {
  describe('create', () => {
    it('creates an active tenant, persists it and records TenantCreated', async () => {
      const app = harness();

      const outcome = await TenantScope.runAsSystem(() =>
        app.createTenant.execute(new CreateTenant({ name: '  Acme Trading Co.  ' })),
      );

      expect(outcome.isOk()).toBe(true);
      const view = outcome.valueOrThrow();
      expect(view.name).toBe('Acme Trading Co.');
      expect(view.status).toBe('active');
      expect(view.revision).toBe(1);
      expect(view.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
      expect(view.createdAt).toBe(view.updatedAt);
      expect(app.repository.addCalls).toBe(1);
      expect(app.repository.revisionOf(tenantIdFrom(view.id))?.value).toBe(1);

      expect(app.events.recorded).toHaveLength(1);
      expect(app.events.recorded[0]?.name).toBe('TenantCreated');
      expect(app.events.recorded[0]?.metadata.tenantId).toBe(view.id);
    });

    it('rejects a blank name as an expected failure without persisting', async () => {
      const app = harness();

      const outcome = await TenantScope.runAsSystem(() =>
        app.createTenant.execute(new CreateTenant({ name: '   ' })),
      );

      expect(outcome.isFail()).toBe(true);
      expect(outcome.errorOrThrow().code).toBe('VALIDATION_FAILED');
      expect(app.repository.addCalls).toBe(0);
      expect(app.events.recorded).toEqual([]);
    });
  });

  describe('get', () => {
    it('reads a tenant within its tenant scope', async () => {
      const app = harness();
      const tenant = aTenant('Acme');
      app.repository.seed(tenant);

      const outcome = await inTenant(tenant.id.value, () =>
        app.getTenant.execute(new GetTenant({ tenantId: tenant.id.value })),
      );

      expect(outcome.valueOrThrow()).toMatchObject({ id: tenant.id.value, name: 'Acme' });
    });

    it('answers not-found for an unknown tenant', async () => {
      const app = harness();
      const missing = randomTenantId();

      const outcome = await inTenant(missing, () =>
        app.getTenant.execute(new GetTenant({ tenantId: missing })),
      );

      expect(outcome.isFail()).toBe(true);
      expect(outcome.errorOrThrow().code).toBe('NOT_FOUND');
    });

    it('does not read a tenant outside the current tenant scope', async () => {
      const app = harness();
      const stored = aTenant('Acme');
      app.repository.seed(stored);
      const other = randomTenantId();

      // Scope is the stored tenant, the requested target is another one.
      const outcome = await inTenant(stored.id.value, () =>
        app.getTenant.execute(new GetTenant({ tenantId: other })),
      );

      expect(outcome.isFail()).toBe(true);
      expect(outcome.errorOrThrow().code).toBe('NOT_FOUND');
    });

    it('fails closed without a tenant scope', async () => {
      const app = harness();
      const tenant = aTenant();
      app.repository.seed(tenant);

      await expect(
        app.getTenant.execute(new GetTenant({ tenantId: tenant.id.value })),
      ).rejects.toThrow(TenantContextMissingError);
    });
  });

  describe('update', () => {
    it('renames an active tenant, advances the revision and records the change', async () => {
      const app = harness();
      const tenant = aTenant('Old Name');
      app.repository.seed(tenant);

      const outcome = await inTenant(tenant.id.value, () =>
        app.updateTenant.execute(
          new UpdateTenant({
            tenantId: tenant.id.value,
            name: 'New Name',
            expectedRevision: 1,
          }),
        ),
      );

      expect(outcome.valueOrThrow()).toMatchObject({ name: 'New Name', revision: 2 });
      expect(app.repository.stored(tenant.id)?.name.value).toBe('New Name');
      expect(app.events.recorded[0]?.name).toBe('TenantProfileUpdated');
    });

    it('refuses to change an inactive tenant', async () => {
      const app = harness();
      const tenant = aTenant('Acme');
      app.repository.seed(tenant);
      await inTenant(tenant.id.value, () =>
        app.changeTenantStatus.execute(
          new ChangeTenantStatus({
            tenantId: tenant.id.value,
            status: 'inactive',
            expectedRevision: 1,
          }),
        ),
      );

      const outcome = await inTenant(tenant.id.value, () =>
        app.updateTenant.execute(
          new UpdateTenant({
            tenantId: tenant.id.value,
            name: 'Should Not Apply',
            expectedRevision: 2,
          }),
        ),
      );

      expect(outcome.isFail()).toBe(true);
      expect(outcome.errorOrThrow().code).toBe('TENANT_INACTIVE');
      expect(app.repository.stored(tenant.id)?.name.value).toBe('Acme');
    });

    it('detects a conflicting concurrent update and keeps the winner', async () => {
      const app = harness();
      const tenant = aTenant('Original');
      app.repository.seed(tenant, Revision.initial());

      const first = await inTenant(tenant.id.value, () =>
        app.updateTenant.execute(
          new UpdateTenant({
            tenantId: tenant.id.value,
            name: 'First Writer',
            expectedRevision: 1,
          }),
        ),
      );
      const second = await inTenant(tenant.id.value, () =>
        app.updateTenant.execute(
          new UpdateTenant({
            tenantId: tenant.id.value,
            name: 'Second Writer',
            expectedRevision: 1,
          }),
        ),
      );

      expect(first.isOk()).toBe(true);
      expect(second.isFail()).toBe(true);
      expect(second.errorOrThrow()).toBeInstanceOf(ConflictError);

      // The winner stands, the revision moved exactly once, and no mutation
      // was retried.
      expect(app.repository.stored(tenant.id)?.name.value).toBe('First Writer');
      expect(app.repository.revisionOf(tenant.id)?.value).toBe(2);
      expect(app.repository.updateCalls).toBe(2);
    });
  });

  describe('change status', () => {
    it('moves active -> inactive and records the transition', async () => {
      const app = harness();
      const tenant = aTenant('Acme');
      app.repository.seed(tenant);

      const outcome = await inTenant(tenant.id.value, () =>
        app.changeTenantStatus.execute(
          new ChangeTenantStatus({
            tenantId: tenant.id.value,
            status: 'inactive',
            expectedRevision: 1,
          }),
        ),
      );

      expect(outcome.valueOrThrow()).toMatchObject({ status: 'inactive', revision: 2 });
      expect(app.events.recorded[0]?.name).toBe('TenantStatusChanged');
    });

    it('rejects an invalid transition', async () => {
      const app = harness();
      const tenant = aTenant('Acme');
      app.repository.seed(tenant);

      // Already active: moving to active again is not a transition.
      const outcome = await inTenant(tenant.id.value, () =>
        app.changeTenantStatus.execute(
          new ChangeTenantStatus({
            tenantId: tenant.id.value,
            status: 'active',
            expectedRevision: 1,
          }),
        ),
      );

      expect(outcome.isFail()).toBe(true);
      expect(outcome.errorOrThrow().code).toBe('INVALID_TENANT_STATUS_TRANSITION');
      expect(app.repository.stored(tenant.id)?.status).toBe(TenantStatus.ACTIVE);
    });
  });

  describe('tenant context integration', () => {
    it('represents a tenant identity as a tenant context', () => {
      const tenant = aTenant();

      expect(tenantContext(tenant.id)).toEqual({
        state: 'available',
        tenantId: tenant.id.value,
      });
    });
  });
});
