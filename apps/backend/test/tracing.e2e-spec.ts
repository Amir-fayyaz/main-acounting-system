import type { INestApplication } from '@nestjs/common';
import { InMemorySpanExporter, SimpleSpanProcessor } from '@opentelemetry/sdk-trace';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

/**
 * The tracing bootstrap is a side-effect import that must run before the
 * application's modules load, so this spec configures the environment and the
 * in-memory test exporter *first* and then imports `tracing.ts` and every
 * framework module dynamically — a statically imported `@nestjs/testing` would
 * load Express (and its module graph) before the instrumentations register.
 *
 * `NODE_ENV=test` keeps tracing off by default; `TRACING_ENABLED=true` turns
 * it on exactly as a deployment would.
 */
const exporter = new InMemorySpanExporter();

(globalThis as Record<symbol, unknown>)[Symbol.for('backend.otel.test-span-processor')] =
  new SimpleSpanProcessor({ exporter });

describe('Distributed tracing (e2e)', () => {
  let app: INestApplication;

  beforeAll(
    async () => {
      // A test fixture, not application configuration: the spec simulates the
      // environment variable a deployment sets, because the tracing bootstrap
      // is a side-effect import whose defaults must not be changed for tests.
      // eslint-disable-next-line no-restricted-properties
      process.env['TRACING_ENABLED'] = 'true';

      await import('../src/tracing.js');
      const { AppModule } = await import('../src/app.module.js');
      const { configureApplication } = await import('../src/bootstrap.js');
      const { Test } = await import('@nestjs/testing');

      const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
      app = moduleRef.createNestApplication();
      configureApplication(app);
      await app.init();
    },
    // Starting the SDK, patching five instrumentations and booting the
    // application is far heavier than a normal beforeAll; under a loaded
    // machine (the whole workspace suite runs concurrently) it must not hit
    // the default 30 s hook timeout.
    120_000,
  );

  afterAll(async () => {
    // `app` stays undefined when the beforeAll failed; the failure is already
    // reported, the teardown must not raise a second one.
    await app?.close();
  });

  it('registers the HTTP, Express, Nest, MySQL2 and Redis instrumentations', async () => {
    const { buildInstrumentations } = await import('../src/tracing.js');

    const names = buildInstrumentations().map(
      (instrumentation) => (instrumentation as { instrumentationName: string }).instrumentationName,
    );

    expect(names).toContain('@opentelemetry/instrumentation-http');
    expect(names).toContain('@opentelemetry/instrumentation-express');
    expect(names).toContain('@opentelemetry/instrumentation-nestjs-core');
    expect(names).toContain('@opentelemetry/instrumentation-mysql2');
    expect(names).toContain('@opentelemetry/instrumentation-redis');
  });

  it('serves one HTTP request inside one trace whose id is the correlation id', async () => {
    // One request against a dependency-free endpoint, so the test does not
    // depend on MySQL/Redis being up (CI runs with neither).
    const { default: request } = await import('supertest');
    const response = await request(app.getHttpServer()).get('/api/health').expect(200);

    const spans = exporter.getFinishedSpans();
    const serverSpan = spans.find((span) => span.kind === 1 /* SERVER */);

    expect(serverSpan).toBeDefined();

    const traceId = serverSpan?.spanContext().traceId;
    const spansOfTheRequest = spans.filter((span) => span.spanContext().traceId === traceId);

    // At least the server span and its supertest client parent share the trace.
    expect(spansOfTheRequest.length).toBeGreaterThanOrEqual(2);

    // The correlation boundary resolved the id from the active span, so the
    // response header (and every log line of the request) carries the trace id.
    expect(response.headers['x-correlation-id']).toBe(traceId);
  });

  it('shuts down cleanly even when tracing never started', async () => {
    const { shutdownTracing } = await import('../src/tracing.js');

    await expect(shutdownTracing()).resolves.toBeUndefined();
  });
});
