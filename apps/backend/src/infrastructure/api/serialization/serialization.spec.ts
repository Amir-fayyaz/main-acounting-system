import { describe, expect, it } from 'vitest';
import { toIsoDate, toIsoDateTime } from './serialization.js';

describe('serialization', () => {
  it('serializes an instant as ISO-8601 UTC', () => {
    expect(toIsoDateTime(new Date('2026-09-30T09:22:34.673Z'))).toBe('2026-09-30T09:22:34.673Z');
  });

  it('serializes a calendar day without time or timezone', () => {
    expect(toIsoDate(new Date('2026-09-30T23:30:00.000Z'))).toBe('2026-09-30');
  });
});
