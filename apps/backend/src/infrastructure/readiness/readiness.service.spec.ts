import { afterEach, describe, expect, it, vi } from 'vitest';
import { NO_REDACTION, SecretRedactor } from '../config/secrets.js';
import { ReadinessService } from './readiness.service.js';
import type { DependencyProbe } from './readiness.types.js';

const readyProbe: DependencyProbe = { name: 'redis', check: async () => undefined };

describe('ReadinessService', () => {
  afterEach(() => {
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
  });

  it('reports the failing dependency together with its cause', async () => {
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
    expect(report.checks).toContainEqual(
      expect.objectContaining({
        name: 'database',
        status: 'down',
        error: 'connect ECONNREFUSED 127.0.0.1:3306',
      }),
    );
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
    expect(report.checks[0]?.error).toContain('timed out');
  });

  it('never returns a credential inside a probe error', async () => {
    const service = new ReadinessService(
      [
        {
          name: 'object-storage',
          check: async () => {
            throw new Error('Access Key minio-local does not match secret top-secret-key');
          },
        },
      ],
      new SecretRedactor(['top-secret-key']),
    );

    const report = await service.check();

    expect(report.checks[0]?.error).not.toContain('top-secret-key');
    expect(report.checks[0]?.error).toContain('[redacted]');
  });
});
