import { describe, expect, it } from 'vitest';

import { formatMemberDate } from '../utils/format-member-date';

describe('formatMemberDate', () => {
  it('returns em dash for empty or invalid input', () => {
    expect(formatMemberDate('')).toBe('—');
    expect(formatMemberDate('not-a-date')).toBe('—');
  });

  it('formats a valid ISO timestamp without throwing', () => {
    const formatted = formatMemberDate('2026-10-29T15:02:34.064Z');
    expect(formatted).not.toBe('—');
    expect(formatted.length).toBeGreaterThan(0);
  });
});
