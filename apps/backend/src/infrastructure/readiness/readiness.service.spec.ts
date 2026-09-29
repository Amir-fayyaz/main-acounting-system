import { Logger } from '@nestjs/common';
import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from 'vitest';
import { NO_REDACTION, SecretRedactor } from '../config/secrets.js';
import { ReadinessService } from './readiness.service.js';
import type { DependencyProbe } from './readiness.types.js';

const readyProbe: DependencyProbe = { name: 'redis', check: async () => undefined };

describe('ReadinessService', () => {
  let warn: MockInstance;

  beforeEach(() => {
    // Failing probes log a warning on purpose; capture it so the suite stays
    // quiet and the log content can be asserted where it matters.
    warn = vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
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
      NO_REDACTION,
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
      NO_REDACTION,
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
      NO_REDACTION,
    );

    const pending = service.check();
    await vi.advanceTimersByTimeAsync(3000);
    const report = await pending;

    expect(report.status).toBe('not-ready');
    expect(report.checks[0]).toMatchObject({ status: 'down', reason: 'timeout' });
  });

  it('keeps driver detail out of the report but logs it redacted', async () => {
    const service = new ReadinessService(
      [
        {
          name: 'object-storage',
          check: async () => {
            throw new Error('Access denied for secret-key-do-not-leak');
          },
        },
      ],
      new SecretRedactor(['secret-key-do-not-leak']),
    );

    const report = await service.check();

    expect(JSON.stringify(report)).not.toContain('secret-key-do-not-leak');
    expect(report.checks[0]).toMatchObject({ status: 'down', reason: 'unavailable' });

    const logged = warn.mock.calls.map((call) => String(call[0])).join('\n');
    expect(logged).toContain('object-storage');
    expect(logged).toContain('[redacted]');
    expect(logged).not.toContain('secret-key-do-not-leak');
  });
});
