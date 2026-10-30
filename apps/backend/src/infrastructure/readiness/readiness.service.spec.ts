import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SecretRedactor } from '../config/secrets.js';
import { createLogger } from '../logging/structured-logger.js';
import { ReadinessService } from './readiness.service.js';
import type { DependencyProbe } from './readiness.types.js';

const readyProbe: DependencyProbe = { name: 'redis', check: async () => undefined };

/**
 * The real logger with captured sinks (FND-011).
 *
 * Using the real logger — not a spy on a framework method — is what makes the
 * last test meaningful: it asserts the redaction the logging layer performs,
 * not that some component happened to call a method.
 */
function captureLogger(secretValues: readonly string[] = []): {
  logger: ReturnType<typeof createLogger>;
  lines: string[];
} {
  const lines: string[] = [];
  const logger = createLogger({
    service: 'test',
    level: 'debug',
    format: 'json',
    secrets: new SecretRedactor(secretValues),
    sinks: {
      out: (line) => lines.push(line),
      err: (line) => lines.push(line),
    },
  });

  return { logger, lines };
}

describe('ReadinessService', () => {
  beforeEach(() => {
    vi.useRealTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('reports ready when every probe succeeds', async () => {
    const service = new ReadinessService(
      [
        { name: 'database', check: async () => undefined },
        readyProbe,
        { name: 'object-storage', check: async () => undefined },
      ],
      captureLogger().logger,
    );

    const report = await service.check();

    expect(report.status).toBe('ready');
    expect(report.checks.map((check) => check.name)).toEqual([
      'database',
      'redis',
      'object-storage',
    ]);
    expect(report.checks.every((check) => check.status === 'up')).toBe(true);
    expect(report.checks.every((check) => check.reason === undefined)).toBe(true);
  });

  it('reports a failing dependency as down without rethrowing', async () => {
    const service = new ReadinessService(
      [
        readyProbe,
        {
          name: 'database',
          check: async () => {
            throw new Error('connect ECONNREFUSED 127.0.0.1:3306');
          },
        },
      ],
      captureLogger().logger,
    );

    const report = await service.check();

    expect(report.status).toBe('not-ready');
    expect(report.checks).toContainEqual({
      name: 'database',
      status: 'down',
      latencyMs: expect.any(Number),
      reason: 'unavailable',
    });
    expect(report.checks).not.toContainEqual(expect.objectContaining({ error: expect.anything() }));
  });

  it('reports a hanging dependency as down after the probe timeout', async () => {
    vi.useFakeTimers();
    const service = new ReadinessService(
      [{ name: 'object-storage', check: () => new Promise<void>(() => undefined) }],
      captureLogger().logger,
    );

    const pending = service.check();
    await vi.advanceTimersByTimeAsync(3000);
    const report = await pending;

    expect(report.status).toBe('not-ready');
    expect(report.checks[0]).toMatchObject({ status: 'down', reason: 'timeout' });
  });

  it('keeps driver detail out of the report but logs it redacted', async () => {
    const { logger, lines } = captureLogger(['secret-key-do-not-leak']);
    const service = new ReadinessService(
      [
        {
          name: 'object-storage',
          check: async () => {
            throw new Error('Access denied for secret-key-do-not-leak');
          },
        },
      ],
      logger,
    );

    const report = await service.check();

    expect(JSON.stringify(report)).not.toContain('secret-key-do-not-leak');
    expect(report.checks[0]).toMatchObject({ status: 'down', reason: 'unavailable' });

    const logged = lines.join('\n');
    expect(logged).toContain('object-storage');
    expect(logged).toContain('[redacted]');
    expect(logged).not.toContain('secret-key-do-not-leak');
  });
});
