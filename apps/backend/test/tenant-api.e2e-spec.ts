import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { configureApplication } from '../src/bootstrap.js';
import { AppConfigModule } from '../src/infrastructure/config/app-config.module.js';
import { TRANSACTION_BOUNDARY } from '../src/infrastructure/database/database.tokens.js';
import { ChangeTenantStatusUseCase } from '../src/modules/tenant/application/use-cases/change-tenant-status.use-case.js';
import {
  TENANT_EVENT_RECORDER,
  TENANT_REPOSITORY,
} from '../src/modules/tenant/application/tenant.tokens.js';
import type { TenantEventRecorder } from '../src/modules/tenant/application/ports/tenant-event-recorder.port.js';
import { CreateTenantUseCase } from '../src/modules/tenant/application/use-cases/create-tenant.use-case.js';
import { GetTenantUseCase } from '../src/modules/tenant/application/use-cases/get-tenant.use-case.js';
import { UpdateTenantUseCase } from '../src/modules/tenant/application/use-cases/update-tenant.use-case.js';
import { TenantController } from '../src/modules/tenant/presentation/controllers/tenant.controller.js';
import type { TenantRepository } from '../src/modules/tenant/domain/repositories/tenant.repository.js';
import type { TransactionBoundary } from '../src/shared/transaction/transaction-boundary.js';
import {
  InMemoryTenantRepository,
  PassthroughTransactionBoundary,
  RecordingTenantEvents,
} from './support/tenant-doubles.js';

/**
 * The tenant resource over the real HTTP boundary (IAM-001; FND-006).
 *
 * These tests use the real controller, real use cases and real shared kernel,
 * with the module's ports bound to in-memory doubles — so they exercise the
 * routing, validation, tenant scoping, error contract, optimistic-concurrency
 * mapping and OpenAPI document without requiring a database. Persistence
 * against MySQL is covered separately by `tenant-persistence.e2e-spec.ts`.
 *
 * They also pin the security posture IAM-001 requires: the resource claims no
 * authentication, reads no client-supplied tenant identity, and no request
 * header can influence which tenant an operation touches.
 */

interface Harness {
  readonly app: INestApplication;
  readonly repository: InMemoryTenantRepository;
  readonly events: RecordingTenantEvents;
}

async function createHarness(): Promise<Harness> {
  const repository = new InMemoryTenantRepository();
  const events = new RecordingTenantEvents();
  const boundary = new PassthroughTransactionBoundary();

  const moduleRef = await Test.createTestingModule({
    imports: [AppConfigModule],
    controllers: [TenantController],
    providers: [
      { provide: TENANT_REPOSITORY, useValue: repository },
      { provide: TENANT_EVENT_RECORDER, useValue: events },
      { provide: TRANSACTION_BOUNDARY, useValue: boundary },
      {
        provide: CreateTenantUseCase,
        useFactory: (r: TenantRepository, e: TenantEventRecorder, b: TransactionBoundary) =>
          new CreateTenantUseCase(r, e, b),
        inject: [TENANT_REPOSITORY, TENANT_EVENT_RECORDER, TRANSACTION_BOUNDARY],
      },
      {
        provide: GetTenantUseCase,
        useFactory: (r: TenantRepository) => new GetTenantUseCase(r),
        inject: [TENANT_REPOSITORY],
      },
      {
        provide: UpdateTenantUseCase,
        useFactory: (r: TenantRepository, e: TenantEventRecorder, b: TransactionBoundary) =>
          new UpdateTenantUseCase(r, e, b),
        inject: [TENANT_REPOSITORY, TENANT_EVENT_RECORDER, TRANSACTION_BOUNDARY],
      },
      {
        provide: ChangeTenantStatusUseCase,
        useFactory: (r: TenantRepository, e: TenantEventRecorder, b: TransactionBoundary) =>
          new ChangeTenantStatusUseCase(r, e, b),
        inject: [TENANT_REPOSITORY, TENANT_EVENT_RECORDER, TRANSACTION_BOUNDARY],
      },
    ],
  }).compile();

  const app = moduleRef.createNestApplication();
  configureApplication(app);
  await app.init();

  return { app, repository, events };
}

describe('tenant resource (e2e)', () => {
  let app: INestApplication;
  let events: RecordingTenantEvents;

  beforeAll(async () => {
    ({ app, events } = await createHarness());
  });

  afterAll(async () => {
    await app.close();
  });

  async function createTenant(name = 'Acme Trading Co.'): Promise<Record<string, unknown>> {
    const response = await request(app.getHttpServer())
      .post('/api/v1/tenants')
      .send({ name })
      .expect(201);

    return response.body as Record<string, unknown>;
  }

  describe('create', () => {
    it('creates a tenant, returns 201 and the representation', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/tenants')
        .send({ name: 'Acme Trading Co.' })
        .expect(201);

      expect(response.body).toMatchObject({
        name: 'Acme Trading Co.',
        status: 'active',
        revision: 1,
      });
      expect(response.body.id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
      );
      expect(new Date(response.body.createdAt).toISOString()).toBe(response.body.createdAt);
      expect(response.headers['x-correlation-id']).toBeTruthy();
      expect(events.recorded.some((event) => event.name === 'TenantCreated')).toBe(true);
    });

    it('rejects a blank name with the standard validation contract', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/tenants')
        .send({ name: '' })
        .expect(400);

      expect(response.body.error).toMatchObject({
        code: 'VALIDATION_FAILED',
        category: 'validation',
      });
      expect(
        response.body.error.details.map((detail: { field: string }) => detail.field),
      ).toContain('name');
    });
  });

  describe('get', () => {
    it('returns the created tenant', async () => {
      const created = await createTenant('Readable Co.');

      const response = await request(app.getHttpServer())
        .get(`/api/v1/tenants/${String(created.id)}`)
        .expect(200);

      expect(response.body).toMatchObject({ id: created.id, name: 'Readable Co.' });
    });

    it('returns the standard not-found error for an unknown tenant', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/tenants/018f0d3c-6d0f-7a4b-9d4e-2b3c4d5e6f70')
        .expect(404);

      expect(response.body.error.code).toBe('NOT_FOUND');
      expect(response.body.error.category).toBe('client');
    });

    it('treats a malformed identifier as not-found', async () => {
      await request(app.getHttpServer()).get('/api/v1/tenants/not-a-uuid').expect(404);
    });

    it('ignores a client-supplied tenant header', async () => {
      const created = await createTenant('Scoped Co.');
      const other = await createTenant('Other Co.');

      const response = await request(app.getHttpServer())
        .get(`/api/v1/tenants/${String(created.id)}`)
        .set('x-tenant-id', String(other.id))
        .expect(200);

      expect(response.body.id).toBe(created.id);
      expect(response.body.name).toBe('Scoped Co.');
    });
  });

  describe('update', () => {
    it('updates a mutable attribute and advances the revision', async () => {
      const created = await createTenant('Before');

      const response = await request(app.getHttpServer())
        .patch(`/api/v1/tenants/${String(created.id)}`)
        .send({ name: 'After', expectedRevision: 1 })
        .expect(200);

      expect(response.body).toMatchObject({ name: 'After', revision: 2 });
      expect(events.recorded.some((event) => event.name === 'TenantProfileUpdated')).toBe(true);
    });

    it('rejects a stale update with the conflict contract and stale-revision detail', async () => {
      const created = await createTenant('Contended');
      await request(app.getHttpServer())
        .patch(`/api/v1/tenants/${String(created.id)}`)
        .send({ name: 'Winner', expectedRevision: 1 })
        .expect(200);

      const response = await request(app.getHttpServer())
        .patch(`/api/v1/tenants/${String(created.id)}`)
        .send({ name: 'Loser', expectedRevision: 1 })
        .expect(409);

      expect(response.body.error).toMatchObject({ code: 'CONFLICT', category: 'client' });
      expect(response.body.error.details.map((detail: { code: string }) => detail.code)).toContain(
        'STALE_REVISION',
      );

      const current = await request(app.getHttpServer())
        .get(`/api/v1/tenants/${String(created.id)}`)
        .expect(200);
      expect(current.body.name).toBe('Winner');
    });

    it('requires the expected revision and a non-blank name', async () => {
      const created = await createTenant('Validated');

      const response = await request(app.getHttpServer())
        .patch(`/api/v1/tenants/${String(created.id)}`)
        .send({ name: '', expectedRevision: 0 })
        .expect(400);

      const fields = response.body.error.details.map((detail: { field: string }) => detail.field);
      expect(fields).toContain('name');
      expect(fields).toContain('expectedRevision');
    });
  });

  describe('lifecycle', () => {
    it('moves a tenant to inactive and back', async () => {
      const created = await createTenant('Lifecycle Co.');

      const deactivated = await request(app.getHttpServer())
        .post(`/api/v1/tenants/${String(created.id)}/status`)
        .send({ status: 'inactive', expectedRevision: 1 })
        .expect(200);
      expect(deactivated.body).toMatchObject({ status: 'inactive', revision: 2 });

      const reactivated = await request(app.getHttpServer())
        .post(`/api/v1/tenants/${String(created.id)}/status`)
        .send({ status: 'active', expectedRevision: 2 })
        .expect(200);
      expect(reactivated.body).toMatchObject({ status: 'active', revision: 3 });
    });

    it('rejects an invalid transition as a domain failure', async () => {
      const created = await createTenant('Active Co.');

      const response = await request(app.getHttpServer())
        .post(`/api/v1/tenants/${String(created.id)}/status`)
        .send({ status: 'active', expectedRevision: 1 })
        .expect(422);

      expect(response.body.error).toMatchObject({
        code: 'INVALID_TENANT_STATUS_TRANSITION',
        category: 'domain',
      });
    });

    it('rejects an unknown status at the boundary', async () => {
      const created = await createTenant('Active Co.');

      const response = await request(app.getHttpServer())
        .post(`/api/v1/tenants/${String(created.id)}/status`)
        .send({ status: 'archived', expectedRevision: 1 })
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_FAILED');
    });
  });

  describe('security posture', () => {
    it('claims no authentication or authorization in the contract', async () => {
      const response = await request(app.getHttpServer()).get('/api/docs-json').expect(200);

      const paths = response.body.paths;
      expect(paths['/api/v1/tenants']).toBeDefined();
      expect(paths['/api/v1/tenants'].post.security).toBeUndefined();
      expect(paths['/api/v1/tenants/{id}'].get.security).toBeUndefined();
      expect(response.body.security).toBeUndefined();
    });
  });
});
