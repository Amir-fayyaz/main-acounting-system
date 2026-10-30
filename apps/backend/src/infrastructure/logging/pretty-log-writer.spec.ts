import { describe, expect, it } from 'vitest';

import type { LogRecord } from './log-record.js';
import { createPrettyLogWriter } from './pretty-log-writer.js';

const record: LogRecord = {
  timestamp: '2026-10-13T09:22:34.673Z',
  level: 'info',
  service: 'backend',
  message: 'HTTP request completed',
  correlationId: 'abc-123',
  tenantId: 'tenant-42',
  userId: 'user-7',
  detail: { method: 'GET', status: 200 },
};

describe('pretty log writer (FND-011)', () => {
  it('prints every context field the JSON writer would carry', () => {
    const out: string[] = [];
    const writer = createPrettyLogWriter({ out: (line) => out.push(line), err: () => undefined });

    writer.write(record);

    expect(out).toHaveLength(1);
    expect(out[0]).toContain('INFO');
    expect(out[0]).toContain('[backend]');
    expect(out[0]).toContain('correlation:abc-123');
    expect(out[0]).toContain('tenant:tenant-42');
    expect(out[0]).toContain('user:user-7');
    expect(out[0]).toContain('HTTP request completed');
    expect(out[0]).toContain('"method":"GET"');
    expect(out[0].endsWith('\n')).toBe(true);
  });

  it('keeps the stream rules of the JSON writer', () => {
    const out: string[] = [];
    const err: string[] = [];
    const writer = createPrettyLogWriter({
      out: (line) => out.push(line),
      err: (line) => err.push(line),
    });

    writer.write({ ...record, level: 'info' });
    writer.write({ ...record, level: 'error' });

    expect(out).toHaveLength(1);
    expect(err).toHaveLength(1);
  });

  it('omits the context it does not have', () => {
    const out: string[] = [];
    const writer = createPrettyLogWriter({ out: (line) => out.push(line), err: () => undefined });
    const { correlationId, tenantId, userId, ...bare } = record;

    expect([correlationId, tenantId, userId].every((value) => value !== undefined)).toBe(true);

    writer.write(bare);

    expect(out[0]).not.toContain('correlation:');
    expect(out[0]).not.toContain('tenant:');
    expect(out[0]).not.toContain('user:');
  });
});
