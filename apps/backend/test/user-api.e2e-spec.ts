import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { configureApplication } from '../src/bootstrap.js';
import { AppConfigModule } from '../src/infrastructure/config/app-config.module.js';
import { TRANSACTION_BOUNDARY } from '../src/infrastructure/database/database.tokens.js';
import { UsersController } from '../src/modules/identity/presentation/controllers/user.controller.js';
import type { UserEventRecorder } from '../src/modules/identity/application/ports/user-event-recorder.port.js';
import {
  USER_EVENT_RECORDER,
  USER_REPOSITORY,
} from '../src/modules/identity/application/user.tokens.js';
import { CreateUserUseCase } from '../src/modules/identity/application/use-cases/create-user.use-case.js';
import { ChangeUserStatusUseCase } from '../src/modules/identity/application/use-cases/change-user-status.use-case.js';
import { GetUserUseCase } from '../src/modules/identity/application/use-cases/get-user.use-case.js';
import { UpdateUserUseCase } from '../src/modules/identity/application/use-cases/update-user.use-case.js';
import type { UserRepository } from '../src/modules/identity/domain/repositories/user.repository.js';
import type { TransactionBoundary } from '../src/shared/transaction/transaction-boundary.js';
import {
  InMemoryUserRepository,
  PassthroughTransactionBoundary,
  RecordingUserEvents,
} from './support/user-doubles.js';

/**
 * The User resource over the real HTTP boundary (IAM-002; FND-006).
 *
 * These tests use the real controller, real use cases and real shared kernel,
 * with the module's ports bound to in-memory doubles — so they exercise routing,
 * validation, the error contract, optimistic-concurrency mapping, the OpenAPI
 * document and the absence of any tenant coupling without requiring a database.
 * Persistence against MySQL is covered separately by
 * `user-persistence.e2e-spec.ts`.
 *
 * They also pin the security posture IAM-002 requires: the resource claims no
 * authentication, reads no client-supplied tenant identity and exposes no
 * tenant, role or permission fields.
 */

interface Harness {
  readonly app: INestApplication;
  readonly repository: InMemoryUserRepository;
  readonly events: RecordingUserEvents;
}

async function createHarness(): Promise<Harness> {
  const repository = new InMemoryUserRepository();
  const events = new RecordingUserEvents();
  const boundary = new PassthroughTransactionBoundary();

  const moduleRef = await Test.createTestingModule({
    imports: [AppConfigModule],
    controllers: [UsersController],
    providers: [
      { provide: USER_REPOSITORY, useValue: repository },
      { provide: USER_EVENT_RECORDER, useValue: events },
      { provide: TRANSACTION_BOUNDARY, useValue: boundary },
      {
        provide: CreateUserUseCase,
        useFactory: (r: UserRepository, e: UserEventRecorder, b: TransactionBoundary) =>
          new CreateUserUseCase(r, e, b),
        inject: [USER_REPOSITORY, USER_EVENT_RECORDER, TRANSACTION_BOUNDARY],
      },
      {
        provide: GetUserUseCase,
        useFactory: (r: UserRepository) => new GetUserUseCase(r),
        inject: [USER_REPOSITORY],
      },
      {
        provide: UpdateUserUseCase,
        useFactory: (r: UserRepository, e: UserEventRecorder, b: TransactionBoundary) =>
          new UpdateUserUseCase(r, e, b),
        inject: [USER_REPOSITORY, USER_EVENT_RECORDER, TRANSACTION_BOUNDARY],
      },
      {
        provide: ChangeUserStatusUseCase,
        useFactory: (r: UserRepository, e: UserEventRecorder, b: TransactionBoundary) =>
          new ChangeUserStatusUseCase(r, e, b),
        inject: [USER_REPOSITORY, USER_EVENT_RECORDER, TRANSACTION_BOUNDARY],
      },
    ],
  }).compile();

  const app = moduleRef.createNestApplication();
  configureApplication(app);
  await app.init();

  return { app, repository, events };
}

describe('user resource (e2e)', () => {
  let app: INestApplication;
  let events: RecordingUserEvents;

  beforeAll(async () => {
    ({ app, events } = await createHarness());
  });

  afterAll(async () => {
    await app.close();
  });

  let emailCounter = 0;
  function uniqueEmail(prefix = 'ali'): string {
    emailCounter += 1;
    return `${prefix}.${emailCounter}@example.com`;
  }

  async function createUser(
    displayName = 'Ali Rezaei',
    email = 'ali@example.com',
  ): Promise<Record<string, unknown>> {
    const response = await request(app.getHttpServer())
      .post('/api/v1/users')
      .send({ displayName, email })
      .expect(201);

    return response.body as Record<string, unknown>;
  }

  describe('create', () => {
    it('creates a user, returns 201 and the representation', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/users')
        .send({ displayName: 'Ali Rezaei', email: uniqueEmail() })
        .expect(201);

      expect(response.body).toMatchObject({
        displayName: 'Ali Rezaei',
        status: 'active',
        revision: 1,
      });
      expect(response.body.id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
      );
      expect(response.body.email).toBe(response.body.email.toLowerCase());
      expect(new Date(response.body.createdAt).toISOString()).toBe(response.body.createdAt);
      expect(response.headers['x-correlation-id']).toBeTruthy();
      expect(events.recorded.some((event) => event.name === 'UserCreated')).toBe(true);
    });

    it('rejects a blank name with the standard validation contract', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/users')
        .send({ displayName: '', email: uniqueEmail() })
        .expect(400);

      expect(response.body.error).toMatchObject({
        code: 'VALIDATION_FAILED',
        category: 'validation',
      });
      expect(
        response.body.error.details.map((detail: { field: string }) => detail.field),
      ).toContain('displayName');
    });

    it('rejects a malformed email with the standard validation contract', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/users')
        .send({ displayName: 'Ali', email: 'not-an-email' })
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_FAILED');
      expect(
        response.body.error.details.map((detail: { field: string }) => detail.field),
      ).toContain('email');
    });

    it('refuses a duplicate email with the conflict contract', async () => {
      const email = uniqueEmail('shared');
      await createUser('First', email);

      const response = await request(app.getHttpServer())
        .post('/api/v1/users')
        .send({ displayName: 'Second', email: email.toUpperCase() })
        .expect(409);

      expect(response.body.error).toMatchObject({ code: 'CONFLICT', category: 'client' });
    });
  });

  describe('get', () => {
    it('returns the created user by its stable identifier', async () => {
      const created = await createUser('Readable User', uniqueEmail('readable'));

      const response = await request(app.getHttpServer())
        .get(`/api/v1/users/${String(created.id)}`)
        .expect(200);

      expect(response.body).toMatchObject({ id: created.id, displayName: 'Readable User' });
    });

    it('returns the standard not-found error for an unknown user', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/users/018f0d3c-6d0f-7a4b-9d4e-2b3c4d5e6f70')
        .expect(404);

      expect(response.body.error.code).toBe('NOT_FOUND');
      expect(response.body.error.category).toBe('client');
    });

    it('treats a malformed identifier as not-found', async () => {
      await request(app.getHttpServer()).get('/api/v1/users/not-a-uuid').expect(404);
    });

    it('exposes no tenant, role or permission data', async () => {
      const created = await createUser('Tenant Independent', uniqueEmail('independent'));

      const response = await request(app.getHttpServer())
        .get(`/api/v1/users/${String(created.id)}`)
        .expect(200);

      expect(Object.keys(response.body).sort()).toEqual(
        ['createdAt', 'displayName', 'email', 'id', 'revision', 'status', 'updatedAt'].sort(),
      );
      expect(response.body).not.toHaveProperty('tenantId');
      expect(response.body).not.toHaveProperty('role');
      expect(response.body).not.toHaveProperty('permissions');
    });

    it('ignores a client-supplied tenant header entirely', async () => {
      const created = await createUser('Header Ignorer', uniqueEmail('header'));

      const response = await request(app.getHttpServer())
        .get(`/api/v1/users/${String(created.id)}`)
        .set('x-tenant-id', '018f0d3c-6d0f-7a4b-9d4e-2b3c4d5e6f70')
        .expect(200);

      expect(response.body.id).toBe(created.id);
    });
  });

  describe('update', () => {
    it('updates a mutable attribute and advances the revision', async () => {
      const created = await createUser('Before', uniqueEmail('before'));

      const response = await request(app.getHttpServer())
        .patch(`/api/v1/users/${String(created.id)}`)
        .send({ displayName: 'After', expectedRevision: 1 })
        .expect(200);

      expect(response.body).toMatchObject({ displayName: 'After', revision: 2 });
      expect(events.recorded.some((event) => event.name === 'UserProfileUpdated')).toBe(true);
    });

    it('updates the email as well as the name', async () => {
      const created = await createUser('Both Fields', uniqueEmail('both'));

      const response = await request(app.getHttpServer())
        .patch(`/api/v1/users/${String(created.id)}`)
        .send({
          displayName: 'Both Renamed',
          email: 'both.renamed@example.com',
          expectedRevision: 1,
        })
        .expect(200);

      expect(response.body).toMatchObject({
        displayName: 'Both Renamed',
        email: 'both.renamed@example.com',
        revision: 2,
      });
    });

    it('rejects a stale update with the conflict contract and stale-revision detail', async () => {
      const created = await createUser('Contended', uniqueEmail('contended'));
      await request(app.getHttpServer())
        .patch(`/api/v1/users/${String(created.id)}`)
        .send({ displayName: 'Winner', expectedRevision: 1 })
        .expect(200);

      const response = await request(app.getHttpServer())
        .patch(`/api/v1/users/${String(created.id)}`)
        .send({ displayName: 'Loser', expectedRevision: 1 })
        .expect(409);

      expect(response.body.error).toMatchObject({ code: 'CONFLICT', category: 'client' });
      expect(response.body.error.details.map((detail: { code: string }) => detail.code)).toContain(
        'STALE_REVISION',
      );

      const current = await request(app.getHttpServer())
        .get(`/api/v1/users/${String(created.id)}`)
        .expect(200);
      expect(current.body.displayName).toBe('Winner');
    });

    it('requires the expected revision and validates the payload', async () => {
      const created = await createUser('Validated', uniqueEmail('validated'));

      const response = await request(app.getHttpServer())
        .patch(`/api/v1/users/${String(created.id)}`)
        .send({ displayName: '', expectedRevision: 0 })
        .expect(400);

      const fields = response.body.error.details.map((detail: { field: string }) => detail.field);
      expect(fields).toContain('displayName');
      expect(fields).toContain('expectedRevision');
    });

    it('rejects unknown properties rather than silently dropping them', async () => {
      const created = await createUser('Strict', uniqueEmail('strict'));

      const response = await request(app.getHttpServer())
        .patch(`/api/v1/users/${String(created.id)}`)
        .send({ displayName: 'Strict', expectedRevision: 1, tenantId: 'sneaky' })
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_FAILED');
    });
  });

  describe('lifecycle', () => {
    it('moves a user to inactive and back', async () => {
      const created = await createUser('Lifecycle User', uniqueEmail('lifecycle'));

      const deactivated = await request(app.getHttpServer())
        .post(`/api/v1/users/${String(created.id)}/status`)
        .send({ status: 'inactive', expectedRevision: 1 })
        .expect(200);
      expect(deactivated.body).toMatchObject({ status: 'inactive', revision: 2 });

      const reactivated = await request(app.getHttpServer())
        .post(`/api/v1/users/${String(created.id)}/status`)
        .send({ status: 'active', expectedRevision: 2 })
        .expect(200);
      expect(reactivated.body).toMatchObject({ status: 'active', revision: 3 });
    });

    it('refuses to update an inactive user', async () => {
      const created = await createUser('Inactive User', uniqueEmail('inactive'));
      await request(app.getHttpServer())
        .post(`/api/v1/users/${String(created.id)}/status`)
        .send({ status: 'inactive', expectedRevision: 1 })
        .expect(200);

      const response = await request(app.getHttpServer())
        .patch(`/api/v1/users/${String(created.id)}`)
        .send({ displayName: 'Should Not Apply', expectedRevision: 2 })
        .expect(422);

      expect(response.body.error).toMatchObject({ code: 'USER_INACTIVE', category: 'domain' });
    });

    it('rejects an invalid transition as a domain failure', async () => {
      const created = await createUser('Active User', uniqueEmail('active'));

      const response = await request(app.getHttpServer())
        .post(`/api/v1/users/${String(created.id)}/status`)
        .send({ status: 'active', expectedRevision: 1 })
        .expect(422);

      expect(response.body.error).toMatchObject({
        code: 'INVALID_USER_STATUS_TRANSITION',
        category: 'domain',
      });
    });

    it('rejects an unknown status at the boundary', async () => {
      const created = await createUser('Unknown Status', uniqueEmail('unknown'));

      const response = await request(app.getHttpServer())
        .post(`/api/v1/users/${String(created.id)}/status`)
        .send({ status: 'archived', expectedRevision: 1 })
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_FAILED');
    });
  });

  describe('security posture', () => {
    it('claims no authentication or authorization in the contract', async () => {
      const response = await request(app.getHttpServer()).get('/api/docs-json').expect(200);

      const paths = response.body.paths;
      expect(paths['/api/v1/users']).toBeDefined();
      expect(paths['/api/v1/users'].post.security).toBeUndefined();
      expect(paths['/api/v1/users/{id}'].get.security).toBeUndefined();
      expect(response.body.security).toBeUndefined();
    });

    it('describes no tenant field on the user response schema', async () => {
      const response = await request(app.getHttpServer()).get('/api/docs-json').expect(200);

      const schema = response.body.components.schemas.UserResponseDto;
      expect(Object.keys(schema.properties)).toEqual(
        expect.arrayContaining([
          'id',
          'displayName',
          'email',
          'status',
          'createdAt',
          'updatedAt',
          'revision',
        ]),
      );
      expect(Object.keys(schema.properties)).not.toContain('tenantId');
      expect(Object.keys(schema.properties)).not.toContain('role');
    });
  });
});
