import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from '../src/app.module.js';
import { configureApplication } from '../src/bootstrap.js';
import { AppConfigService } from '../src/infrastructure/config/app-config.service.js';
import { READINESS_PROBES } from '../src/infrastructure/readiness/readiness.tokens.js';
import type { DependencyProbe } from '../src/infrastructure/readiness/readiness.types.js';

/**
 * Creates the application exactly as the process does, optionally replacing the
 * dependency probes so a failure can be exercised deterministically without
 * stopping real infrastructure inside the test run.
 */
async function createApp(probes?: readonly DependencyProbe[]): Promise<INestApplication> {
  const builder = Test.createTestingModule({ imports: [AppModule] });

  if (probes) {
    builder.overrideProvider(READINESS_PROBES).useValue(probes);
  }

  const moduleRef = await builder.compile();
  const app = moduleRef.createNestApplication();
  configureApplication(app);
  await app.init();

  return app;
}

describe('Health endpoints (e2e)', () => {
  describe('liveness', () => {
    let app: INestApplication;

    beforeAll(async () => {
      app = await createApp();
    });

    afterAll(async () => {
      await app.close();
    });

    it('reports the running process under the configured API prefix', async () => {
      const response = await request(app.getHttpServer()).get('/api/health').expect(200);

      expect(response.body).toMatchObject({ status: 'ok', service: 'backend' });
      expect(response.body.environment).toBe('test');
      expect(new Date(response.body.timestamp).toISOString()).toBe(response.body.timestamp);
      expect(response.headers['cache-control']).toBe('no-store');
    });

    it('does not expose the endpoint outside the API prefix', async () => {
      await request(app.getHttpServer()).get('/health').expect(404);
    });
  });

  describe('readiness with every dependency available', () => {
    let app: INestApplication;

    beforeAll(async () => {
      app = await createApp([
        { name: 'database', check: async () => undefined },
        { name: 'redis', check: async () => undefined },
        { name: 'object-storage', check: async () => undefined },
      ]);
    });

    afterAll(async () => {
      await app.close();
    });

    it('returns 200 with one structured check per dependency', async () => {
      const response = await request(app.getHttpServer()).get('/api/health/ready').expect(200);

      expect(response.body).toEqual({
        status: 'ready',
        checks: [
          { name: 'database', status: 'up', latencyMs: expect.any(Number) },
          { name: 'redis', status: 'up', latencyMs: expect.any(Number) },
          { name: 'object-storage', status: 'up', latencyMs: expect.any(Number) },
        ],
      });
      expect(response.headers['cache-control']).toBe('no-store');
    });
  });

  describe('readiness with a required dependency unavailable', () => {
    let app: INestApplication;
    let secrets: readonly string[];

    beforeAll(async () => {
      app = await createApp([
        { name: 'database', check: async () => undefined },
        {
          name: 'redis',
          check: async () => {
            throw new Error('connection refused');
          },
        },
        { name: 'object-storage', check: async () => undefined },
      ]);

      const config = app.get(AppConfigService);
      secrets = [
        config.database.password,
        config.storage.accessKey,
        config.storage.secretKey,
      ].filter((value) => value.length >= 6);
    });

    afterAll(async () => {
      await app.close();
    });

    it('fails readiness with 503 while the process stays alive', async () => {
      // Liveness must not depend on the dependency: the process is healthy and
      // must not be restarted because Redis is down.
      await request(app.getHttpServer()).get('/api/health').expect(200);

      const response = await request(app.getHttpServer()).get('/api/health/ready').expect(503);

      expect(response.body).toEqual({
        status: 'not-ready',
        checks: [
          { name: 'database', status: 'up', latencyMs: expect.any(Number) },
          { name: 'redis', status: 'down', latencyMs: expect.any(Number), reason: 'unavailable' },
          { name: 'object-storage', status: 'up', latencyMs: expect.any(Number) },
        ],
      });
    });

    it('never returns credentials, connection strings or driver text', async () => {
      const failingApp = await createApp([
        {
          name: 'database',
          check: async () => {
            const config = app.get(AppConfigService);
            throw new Error(
              `connect ECONNREFUSED 10.0.0.5:3306 user=root password=${config.database.password} secret=${config.storage.secretKey}`,
            );
          },
        },
      ]);

      try {
        const response = await request(failingApp.getHttpServer())
          .get('/api/health/ready')
          .expect(503);
        const serialized = JSON.stringify(response.body);

        expect(serialized).not.toContain('ECONNREFUSED');
        expect(serialized).not.toContain('10.0.0.5:3306');
        for (const secret of secrets) {
          expect(serialized).not.toContain(secret);
        }
      } finally {
        await failingApp.close();
      }
    });
  });

  describe('readiness with a hanging dependency', () => {
    let app: INestApplication;

    beforeAll(async () => {
      app = await createApp([
        { name: 'database', check: () => new Promise<void>(() => undefined) },
      ]);
    });

    afterAll(async () => {
      await app.close();
    });

    it('reports the timeout as a stable reason instead of hanging the request', async () => {
      const startedAt = Date.now();
      const response = await request(app.getHttpServer()).get('/api/health/ready').expect(503);

      expect(Date.now() - startedAt).toBeLessThan(5000);
      expect(response.body).toEqual({
        status: 'not-ready',
        checks: [
          { name: 'database', status: 'down', latencyMs: expect.any(Number), reason: 'timeout' },
        ],
      });
    });
  });
});
