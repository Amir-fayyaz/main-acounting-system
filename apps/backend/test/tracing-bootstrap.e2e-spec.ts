import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * The tracing bootstrap must be the *first statement* of every process
 * entrypoint (FND-016): ES module imports are hoisted, so an instrumentation
 * bootstrap placed below other imports loads `http`, `mysql2` and `redis`
 * before the SDK can patch them, and those modules' spans are silently lost.
 *
 * This is a static test on purpose: it reads the source files, so it passes in
 * every environment without booting the application.
 */
const here = dirname(fileURLToPath(import.meta.url));

const ENTRYPOINTS = [
  '../src/main.ts',
  '../src/processes/worker/worker.ts',
  '../src/processes/scheduler/scheduler.ts',
];

describe('tracing bootstrap import order', () => {
  it.each(ENTRYPOINTS)('starts %s with the tracing import and nothing above it', (entry) => {
    const source = readFileSync(resolve(here, entry), 'utf8');
    const firstImport = source.match(/^import .*$/m)?.[0];

    expect(firstImport, `${entry} has no imports`).toBeDefined();
    expect(firstImport).toMatch(/^import\s+'(\.\.\/|\.\.?\/)*tracing\.js';$/);
  });

  it('exposes the shared instrumentation set including MySQL2 and Redis, never PostgreSQL', async () => {
    const { buildInstrumentations } = await import('../src/tracing.js');

    const names = buildInstrumentations().map(
      (instrumentation) => (instrumentation as { instrumentationName: string }).instrumentationName,
    );

    expect(names).toContain('@opentelemetry/instrumentation-http');
    expect(names).toContain('@opentelemetry/instrumentation-express');
    expect(names).toContain('@opentelemetry/instrumentation-nestjs-core');
    expect(names).toContain('@opentelemetry/instrumentation-mysql2');
    expect(names).toContain('@opentelemetry/instrumentation-redis');
    // The database is MySQL 8.4 (docker-compose, package.json); a PostgreSQL
    // instrumentation would be dead weight and a misleading span name.
    expect(names).not.toContain('@opentelemetry/instrumentation-pg');
  });
});
