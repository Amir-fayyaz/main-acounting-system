import { describe, expect, it, vi } from 'vitest';

import { ActorScope } from '../../shared/actor/actor-scope.js';
import { TenantScope } from '../../shared/tenant/tenant-scope.js';
import { SecretRedactor } from '../config/secrets.js';
import { LogContext } from './log-context.js';
import type { LogRecord } from './log-record.js';
import { createLogger } from './structured-logger.js';

const SECRET = 'super-secret-value';

/** A logger whose output is captured per stream, with the process redactor. */
function capture(overrides?: { level?: 'debug' | 'info' | 'warn' | 'error' }): {
  logger: ReturnType<typeof createLogger>;
  out: string[];
  err: string[];
  lines: () => string[];
} {
  const out: string[] = [];
  const err: string[] = [];

  const logger = createLogger({
    service: 'backend',
    level: overrides?.level ?? 'debug',
    format: 'json',
    secrets: new SecretRedactor([SECRET]),
    sinks: {
      out: (line) => out.push(line),
      err: (line) => err.push(line),
    },
  });

  return { logger, out, err, lines: () => [...out, ...err] };
}

/** A logger whose records are captured instead of their text. */
function captureRecords(): { logger: ReturnType<typeof createLogger>; records: LogRecord[] } {
  const records: LogRecord[] = [];

  const logger = createLogger({
    service: 'backend',
    level: 'debug',
    format: 'json',
    secrets: new SecretRedactor([SECRET]),
    writer: { write: (record) => records.push(record) },
  });

  return { logger, records };
}

describe('structured logger (FND-011)', () => {
  it('writes exactly one line per call', () => {
    const { logger, lines } = capture();

    logger.info('one');
    logger.warn('two');

    expect(lines()).toHaveLength(2);
    expect(
      lines().every((line) => line.endsWith('\n') && line.indexOf('\n') === line.length - 1),
    ).toBe(true);
  });

  it('sends info/debug to stdout and warn/error to stderr', () => {
    const { logger, out, err } = capture();

    logger.debug('d');
    logger.info('i');
    logger.warn('w');
    logger.error('e');

    expect(out).toHaveLength(2);
    expect(err).toHaveLength(2);
  });

  it('writes the documented JSON shape and nothing else', () => {
    const { logger, out } = capture();
    const now = new Date('2026-10-13T09:22:34.673Z');

    const fixed = createLogger({
      service: 'backend',
      level: 'debug',
      format: 'json',
      secrets: new SecretRedactor([SECRET]),
      now: () => now,
      sinks: { out: (line) => out.push(line), err: () => undefined },
    });

    logger.info('ignored');
    out.length = 0;
    fixed.info('HTTP request completed', {
      detail: { method: 'GET', path: '/api/health', status: 200 },
    });

    const parsed = JSON.parse(out[0]) as Record<string, unknown>;

    expect(Object.keys(parsed).sort()).toEqual(
      ['detail', 'level', 'message', 'service', 'timestamp'].sort(),
    );
    expect(parsed['timestamp']).toBe('2026-10-13T09:22:34.673Z');
    expect(parsed['level']).toBe('info');
    expect(parsed['service']).toBe('backend');
    expect(parsed['message']).toBe('HTTP request completed');
    expect(parsed['detail']).toEqual({ method: 'GET', path: '/api/health', status: 200 });
  });

  it('takes the correlation id from the ambient log context', async () => {
    const { logger, records } = captureRecords();

    await LogContext.run({ correlationId: 'abc-123' }, async () => {
      await Promise.resolve();
      logger.info('deep in a use case');
    });

    expect(records[0]?.correlationId).toBe('abc-123');
  });

  it('takes the tenant and the user from the scopes that authorised the work', async () => {
    const { logger, records } = captureRecords();

    await TenantScope.run({ state: 'available', tenantId: 'tenant-42' }, async () =>
      ActorScope.run('user-7', async () => {
        logger.info('tenant work');
      }),
    );

    expect(records[0]?.tenantId).toBe('tenant-42');
    expect(records[0]?.userId).toBe('user-7');
  });

  it('lets an explicit field win over the ambient one', async () => {
    const { logger, records } = captureRecords();

    await LogContext.run({ correlationId: 'ambient' }, async () => {
      logger.info('explicit', { correlationId: 'explicit' });
    });

    expect(records[0]?.correlationId).toBe('explicit');
  });

  it('redacts the message, the error and every nested detail string', () => {
    const { logger, lines } = capture();

    logger.error(`failure with ${SECRET}`, {
      error: { name: 'Error', message: `connect failed with ${SECRET}` },
      detail: {
        value: SECRET,
        items: [{ nested: SECRET }],
        stack: `at x (${SECRET})`,
      },
    });

    const logged = lines().join('\n');

    expect(logged).not.toContain(SECRET);
    expect(logged).toContain('[redacted]');
  });

  it('drops a line below the configured threshold', () => {
    const { logger, lines } = capture({ level: 'warn' });

    logger.debug('d');
    logger.info('i');
    logger.warn('w');

    expect(lines()).toHaveLength(1);
    expect(lines()[0]).toContain('"level":"warn"');
  });

  it('never throws when the writer fails', () => {
    const logger = createLogger({
      service: 'backend',
      level: 'debug',
      format: 'json',
      secrets: new SecretRedactor([]),
      writer: {
        write: vi.fn(() => {
          throw new Error('sink exploded');
        }),
      },
    });

    expect(() => logger.error('still fine')).not.toThrow();
  });

  it('never throws when a detail value cannot be serialized', () => {
    const { logger } = capture();

    expect(() => logger.info('bigint', { detail: { huge: 10n } })).not.toThrow();
  });
});
