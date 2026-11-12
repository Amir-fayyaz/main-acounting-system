import { env } from 'node:process';
import type { MySql2Database } from 'drizzle-orm/mysql2';
import type { Pool } from 'mysql2/promise';
import { sql } from 'drizzle-orm';
import { context, trace, SpanKind } from '@opentelemetry/api';
import { InMemorySpanExporter, SimpleSpanProcessor } from '@opentelemetry/sdk-trace';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

/**
 * MySQL spans under distributed tracing (FND-016 integration criterion).
 *
 * A query executed inside an active span must produce a MySQL client span that
 * shares the request's trace id and is parented by it — the evidence that
 * `instrumentation-mysql2` (the project's real driver, not the issue's
 * PostgreSQL wording) is wired into the same trace the HTTP layer opens.
 *
 * Opt-in, because the query needs a reachable MySQL server:
 *
 * ```bash
 * pnpm infra:up
 * MYSQL_INTEGRATION=1 pnpm --filter @accounting-saas/backend test
 * ```
 */
const integrationEnabled = env.MYSQL_INTEGRATION === '1';

const exporter = new InMemorySpanExporter();

(globalThis as Record<symbol, unknown>)[Symbol.for('backend.otel.test-span-processor')] =
  new SimpleSpanProcessor({ exporter });

describe.skipIf(!integrationEnabled)('MySQL tracing (integration)', () => {
  let pool: Pool;
  let database: MySql2Database<Record<string, never>>;

  beforeAll(async () => {
    // The tracing bootstrap must load before any driver module, exactly as an
    // entrypoint does (FND-016); the driver imports stay inside here so
    // `mysql2` is first required *after* the instrumentations have patched it.
    env['TRACING_ENABLED'] = 'true';
    env['OTEL_EXPORTER_OTLP_ENDPOINT'] = 'http://127.0.0.1:4318';

    await import('../src/tracing.js');

    const { loadDotEnvFiles } = await import('../src/infrastructure/config/dotenv.js');
    const { loadConfiguration } = await import('../src/infrastructure/config/configuration.js');
    const { AppConfigService } = await import('../src/infrastructure/config/app-config.service.js');
    const { createPool } = await import('mysql2/promise');
    const { drizzle } = await import('drizzle-orm/mysql2');

    loadDotEnvFiles();
    const config = new AppConfigService(loadConfiguration({ ...env, NODE_ENV: 'test' }));

    pool = createPool({
      host: config.database.host,
      port: config.database.port,
      user: config.database.user,
      password: config.database.password,
      database: config.database.name,
      connectionLimit: 2,
      timezone: 'Z',
    });

    database = drizzle(pool) as unknown as MySql2Database<Record<string, never>>;
  });

  afterAll(async () => {
    await pool?.end();
  });

  it('emits a MySQL span that shares the trace id of the request around it', async () => {
    exporter.reset();

    const tracer = trace.getTracer('spec');
    const requestSpan = tracer.startSpan('simulated request');

    await context.with(trace.setSpan(context.active(), requestSpan), async () => {
      await database.execute(sql`SELECT 1 AS probe`);
    });

    // The client span ends with the query; give the processor the same grace
    // the HTTP e2e does before asserting (the end hook can trail the await).
    const deadline = Date.now() + 5_000;
    let mysqlSpan = exporter.getFinishedSpans().find((span) => span.kind === SpanKind.CLIENT);
    while (mysqlSpan === undefined && Date.now() < deadline) {
      await new Promise((resolve) => setTimeout(resolve, 20));
      mysqlSpan = exporter.getFinishedSpans().find((span) => span.kind === SpanKind.CLIENT);
    }

    const names = exporter
      .getFinishedSpans()
      .map((span) => `${span.name}#${span.kind}`)
      .join(', ');

    expect(mysqlSpan, `no CLIENT span among [${names}]`).toBeDefined();
    expect(mysqlSpan?.spanContext().traceId).toBe(requestSpan.spanContext().traceId);
    expect(mysqlSpan?.parentSpanContext?.spanId).toBe(requestSpan.spanContext().spanId);

    requestSpan.end();
  });
});
