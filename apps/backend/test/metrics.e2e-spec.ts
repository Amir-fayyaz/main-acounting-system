import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { env } from 'node:process';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from '../src/app.module.js';
import { configureApplication } from '../src/bootstrap.js';
import { AppConfigService } from '../src/infrastructure/config/app-config.service.js';

/**
 * Creates the application exactly as the process does, so the scrape endpoint
 * is exercised behind the same global prefix, guards and interceptors as
 * production (the probes themselves need no infrastructure: MySQL, Redis and
 * MinIO are all probed lazily and the tests only scrape metrics).
 */
async function createApp(): Promise<INestApplication> {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app = moduleRef.createNestApplication();
  configureApplication(app);
  await app.init();

  return app;
}
describe('Metrics endpoint (e2e)', () => {
  let app: INestApplication;
  let secrets: readonly string[];

  /** The scrape credential this spec configures; never a real secret. */
  const SCRAPE_TOKEN = 'e2e-scrape-token';

  /** A scrape carrying the configured token. */
  async function scrape() {
    return request(app.getHttpServer())
      .get('/api/metrics')
      .set('Authorization', `Bearer ${SCRAPE_TOKEN}`)
      .expect(200);
  }

  beforeAll(async () => {
    // A test fixture, not application configuration: the spec simulates the
    // environment variable a deployment sets, so the endpoint is exercised
    // behind the same token boundary as production (FND-016).
    // eslint-disable-next-line no-restricted-properties
    env['METRICS_TOKEN'] = SCRAPE_TOKEN;

    app = await createApp();

    const config = app.get(AppConfigService);
    secrets = [config.database.password, config.storage.accessKey, config.storage.secretKey].filter(
      (value) => value.length >= 6,
    );
  });

  afterAll(async () => {
    await app.close();
  });

  it('serves the Prometheus text exposition under the API prefix to a token-bearing scrape', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/metrics')
      .set('Authorization', `Bearer ${SCRAPE_TOKEN}`)
      .expect(200);

    expect(response.headers['content-type']).toContain('text/plain');
    expect(response.headers['cache-control']).toBe('no-store');
    expect(response.text).toContain('http_request_duration_seconds');
  });

  it('refuses an anonymous scrape (deny-by-default, FND-016)', async () => {
    const response = await request(app.getHttpServer()).get('/api/metrics').expect(401);

    expect(response.text).not.toContain('http_request_duration_seconds');
    expect(response.text).not.toContain(SCRAPE_TOKEN);
    expect(response.text).toContain('correlationId');
  });

  it('refuses a scrape with the wrong token and never echoes it', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/metrics')
      .set('Authorization', 'Bearer wrong-token')
      .expect(401);

    expect(response.text).not.toContain('http_request_duration_seconds');
    expect(response.text).not.toContain('wrong-token');
    expect(response.text).not.toContain(SCRAPE_TOKEN);
  });

  it('does not serve the endpoint outside the API prefix', async () => {
    await request(app.getHttpServer()).get('/metrics').expect(404);
  });

  it('exports the default Node.js process metrics', async () => {
    const response = await scrape();

    expect(response.text).toMatch(/^nodejs_[a-z_]+ /m);
    expect(response.text).toMatch(/^process_[a-z_]+ /m);
  });

  it('times a real HTTP request into the http_request_duration_seconds metric', async () => {
    // One request against a dependency-free operational endpoint, so the test
    // does not depend on any infrastructure being up.
    await request(app.getHttpServer()).get('/api/health').expect(200);

    const response = await scrape();
    const sample = response.text
      .split('\n')
      .find((line) =>
        line.startsWith(
          'http_request_duration_seconds_count{method="GET",route="/api/health",status_code="200"}',
        ),
      );

    expect(sample).toBeDefined();
    // The interceptor ran for the scrape request itself as well, so at least
    // two observations exist by now (health + metrics).
    expect(Number(sample?.split(' ')[1])).toBeGreaterThanOrEqual(1);
  });

  it('exposes the database pool gauges', async () => {
    const response = await scrape();

    expect(response.text).toContain('database_pool_connections{state="active"}');
    expect(response.text).toContain('database_pool_connections{state="idle"}');
    expect(response.text).toContain('database_pool_connections{state="waiting"}');
  });

  it('exposes job execution and queue-depth metrics', async () => {
    const response = await scrape();

    expect(response.text).toContain('job_execution_duration_seconds');
    expect(response.text).toContain('job_queue_depth');
  });

  it('never exposes credentials or connection details', async () => {
    const response = await scrape();

    for (const secret of secrets) {
      expect(response.text).not.toContain(secret);
    }
    expect(response.text).not.toContain('connectionString');
    expect(response.text).not.toContain('password=');
  });

  it('does not expose the scrape token itself in the exposition', async () => {
    const response = await scrape();

    expect(response.text).not.toContain(SCRAPE_TOKEN);
  });

  it('does not expose business or tenant data in the exposition', async () => {
    const response = await scrape();

    // The only route label present is the operational endpoint itself plus the
    // scrape route — no ids, no tenant or business payloads.
    const routes = response.text
      .split('\n')
      .filter((line) => line.startsWith('http_request_duration_seconds_count{'))
      .map((line) => line.match(/route="([^"]*)"/)?.[1]);

    for (const route of routes) {
      expect(route).toMatch(/^\/api\/(health|metrics)(\/.*)?$|^unmatched$/);
    }
  });
});
