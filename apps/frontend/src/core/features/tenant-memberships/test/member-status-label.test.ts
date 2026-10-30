import { describe, expect, it } from 'vitest';

import { memberStatusLabel } from '../utils/member-status-label';

describe('memberStatusLabel', () => {
  it('maps known statuses to Persian labels', () => {
    expect(memberStatusLabel('active')).toBe('فعال');
    expect(memberStatusLabel('INACTIVE')).toBe('غیرفعال');
    expect(memberStatusLabel('pending')).toBe('در انتظار');
  });

  it('returns the original value for unknown statuses', () => {
    expect(memberStatusLabel('custom-status')).toBe('custom-status');
  });
});
