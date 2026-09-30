import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from '../src/app.module.js';
import { configureApplication } from '../src/bootstrap.js';

/**
 * Exercises the FND-006 baseline through the real HTTP boundary: the versioned
 * base route, request validation, the success and pagination conventions, the
 * error contract and the generated OpenAPI document.
 */
async function createApp(): Promise<INestApplication> {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app = moduleRef.createNestApplication();

  configureApplication(app);
  await app.init();

  return app;
}

describe('API baseline (e2e)', () => {
  describe('base route and versioning', () => {
    let app: INestApplication;

    beforeAll(async () => {
      app = await createApp();
    });

    afterAll(async () => {
      await app.close();
    });

    it('serves business endpoints under the default version', async () => {
      await request(app.getHttpServer()).get('/api/v1/examples').expect(200);
    });

    it('does not serve a business endpoint without a version segment', async () => {
      await request(app.getHttpServer()).get('/api/examples').expect(404);
    });

    it('keeps operational health liveness unversioned', async () => {
      await request(app.getHttpServer()).get('/api/health').expect(200);
      await request(app.getHttpServer()).get('/api/v1/health').expect(404);
    });

    it('returns a paginated collection with the standard envelope', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/examples?page=1&limit=1')
        .expect(200);

      expect(response.body.meta).toEqual({ page: 1, limit: 1, total: 2, totalPages: 2 });
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0]).toMatchObject({ origin: 'seed' });
    });

    it('rejects an out-of-range pagination query with the error contract', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/examples?limit=1000')
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_FAILED');
      expect(
        response.body.error.details.map((detail: { field: string }) => detail.field),
      ).toContain('limit');
    });
  });

  describe('request validation and response conventions', () => {
    let app: INestApplication;

    beforeAll(async () => {
      app = await createApp();
    });

    afterAll(async () => {
      await app.close();
    });

    it('accepts a valid body and returns the created resource', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/examples')
        .send({
          message: 'hello',
          note: 'a note',
          amount: { amount: '125000.00', currency: 'IRR' },
        })
        .expect(201);

      expect(response.body).toMatchObject({
        message: 'hello',
        origin: 'created',
        note: 'a note',
        amount: { amount: '125000.00', currency: 'IRR' },
      });
      expect(response.body.id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
      );
      expect(new Date(response.body.createdAt).toISOString()).toBe(response.body.createdAt);
      expect(response.headers['x-correlation-id']).toBeTruthy();
    });

    it('returns null (not an omitted key) for the optional fields it did not receive', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/examples')
        .send({ message: 'minimal' })
        .expect(201);

      expect(response.body).toHaveProperty('amount', null);
      expect(response.body).toHaveProperty('note', null);
    });

    it('rejects invalid input with per-field detail', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/examples')
        .send({ message: '', extra: true })
        .expect(400);

      expect(response.body.error).toMatchObject({
        code: 'VALIDATION_FAILED',
        category: 'validation',
      });
      expect(response.body.error.correlationId).toEqual(expect.any(String));

      const fields = response.body.error.details.map((detail: { field: string }) => detail.field);
      expect(fields).toContain('message');
      expect(fields).toContain('extra');
    });

    it('validates a nested object and reports a dotted field path', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/examples')
        .send({ message: 'ok', amount: { amount: 'not-a-number', currency: 'IR' } })
        .expect(400);

      const fields = response.body.error.details.map((detail: { field: string }) => detail.field);
      expect(fields).toContain('amount.amount');
      expect(fields).toContain('amount.currency');
    });
  });

  describe('error contract', () => {
    let app: INestApplication;

    beforeAll(async () => {
      app = await createApp();
    });

    afterAll(async () => {
      await app.close();
    });

    it('returns the standard not-found error', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/examples/does-not-exist')
        .expect(404);

      expect(response.body).toEqual({
        error: {
          code: 'NOT_FOUND',
          category: 'client',
          message: 'The requested resource was not found.',
          correlationId: expect.any(String),
        },
      });
    });

    it('echoes a client-supplied correlation id on the response and the error', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/examples/does-not-exist')
        .set('x-correlation-id', 'test-correlation-id')
        .expect(404);

      expect(response.headers['x-correlation-id']).toBe('test-correlation-id');
      expect(response.body.error.correlationId).toBe('test-correlation-id');
    });

    it('never exposes internal detail for an unexpected server error', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/examples/probe/server-error')
        .expect(500);

      expect(response.body.error).toMatchObject({
        code: 'INTERNAL_ERROR',
        category: 'technical',
        message: 'An unexpected error occurred.',
      });
      expect(response.body.error.correlationId).toBe(response.headers['x-correlation-id']);

      const serialized = JSON.stringify(response.body);
      expect(serialized).not.toContain('FND-006');
      expect(serialized).not.toContain('stack');
      expect(serialized).not.toContain('.ts:');
    });
  });

  describe('OpenAPI document', () => {
    let app: INestApplication;

    beforeAll(async () => {
      app = await createApp();
    });

    afterAll(async () => {
      await app.close();
    });

    it('serves the generated document in development', async () => {
      const response = await request(app.getHttpServer()).get('/api/docs-json').expect(200);

      expect(response.body.info.version).toBe('1');
      expect(response.body.paths).toHaveProperty('/api/v1/examples');
      expect(response.body.paths).toHaveProperty('/api/health');
    });

    it('describes the implemented request body schemas', async () => {
      const response = await request(app.getHttpServer()).get('/api/docs-json').expect(200);

      const requestSchema =
        response.body.paths['/api/v1/examples'].post.requestBody.content['application/json'].schema;
      expect(JSON.stringify(requestSchema)).toContain('CreateExampleDto');

      const dto = response.body.components.schemas.CreateExampleDto;
      expect(dto.required).toContain('message');
      expect(Object.keys(dto.properties)).toEqual(
        expect.arrayContaining(['message', 'note', 'amount']),
      );
    });

    it('serves the documentation UI', async () => {
      await request(app.getHttpServer()).get('/api/docs').expect(200);
    });
  });
});
