import { describe, expect, it } from 'vitest';

import { createJsonLogWriter } from './json-log-writer.js';
import type { LogRecord } from './log-record.js';

function capture(): {
  writer: ReturnType<typeof createJsonLogWriter>;
  out: string[];
  err: string[];
} {
  const out: string[] = [];
  const err: string[] = [];

  return {
    writer: createJsonLogWriter({ out: (line) => out.push(line), err: (line) => err.push(line) }),
    out,
    err,
  };
}

const record: LogRecord = {
  timestamp: '2026-10-13T09:22:34.673Z',
  level: 'info',
  service: 'backend',
  message: 'HTTP request completed',
  correlationId: 'abc-123',
  tenantId: 'tenant-42',
  userId: 'user-7',
  detail: { method: 'GET', path: '/api/health', status: 200 },
};

describe('JSON log writer (FND-011)', () => {
  it('writes one JSON object per line', () => {
    const { writer, out } = capture();

    writer.write(record);

    expect(out).toHaveLength(1);
    expect(out[0].endsWith('\n')).toBe(true);
    expect(out[0].slice(0, -1)).not.toContain('\n');
    expect(JSON.parse(out[0])).toEqual(record);
  });

  it('keeps the streams apart: info/debug to stdout, warn/error to stderr', () => {
    const { writer, out, err } = capture();

    writer.write({ ...record, level: 'debug' });
    writer.write({ ...record, level: 'info' });
    writer.write({ ...record, level: 'warn' });
    writer.write({ ...record, level: 'error' });

    expect(out).toHaveLength(2);
    expect(err).toHaveLength(2);
  });

  it('falls back to a minimal line instead of throwing on unserializable detail', () => {
    const { writer, err } = capture();
    const circular: Record<string, unknown> = {};
    circular['self'] = circular;

    expect(() =>
      writer.write({
        ...record,
        level: 'error',
        // A BigInt survives redaction (it becomes a string) but not every value
        // does; a raw object with a throwing toJSON is the hostile case.
        detail: {
          hostile: {
            toJSON: () => {
              throw new Error('cannot serialize');
            },
          },
        },
      }),
    ).not.toThrow();

    const parsed = JSON.parse(err[0]) as Record<string, unknown>;
    expect(parsed['detail']).toEqual({ serializationFailed: true });
    expect(parsed['message']).toBe(record.message);
  });
});
