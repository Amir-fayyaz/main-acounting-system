import { describe, expect, it } from 'vitest';

import type { TenantMember } from '../assets/@types/membership.types';
import { filterMembersBySearch } from '../utils/filter-members';

const members: TenantMember[] = [
  {
    membershipId: '1',
    status: 'active',
    userId: 'u1',
    displayName: 'Ali Rezaei',
    email: 'ali@example.com',
    userStatus: 'active',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    revision: 1,
  },
  {
    membershipId: '2',
    status: 'inactive',
    userId: 'u2',
    displayName: 'Sara Mohammadi',
    email: 'sara@example.com',
    userStatus: 'active',
    createdAt: '2026-01-02T00:00:00.000Z',
    updatedAt: '2026-01-02T00:00:00.000Z',
    revision: 1,
  },
];

describe('filterMembersBySearch', () => {
  it('returns all members when search is empty', () => {
    expect(filterMembersBySearch(members, '')).toHaveLength(2);
    expect(filterMembersBySearch(members, '   ')).toHaveLength(2);
  });

  it('filters by display name (case-insensitive)', () => {
    const result = filterMembersBySearch(members, 'ali');
    expect(result).toHaveLength(1);
    expect(result[0]?.membershipId).toBe('1');
  });

  it('filters by email', () => {
    const result = filterMembersBySearch(members, 'sara@');
    expect(result).toHaveLength(1);
    expect(result[0]?.membershipId).toBe('2');
  });

  it('returns empty array when nothing matches', () => {
    expect(filterMembersBySearch(members, 'ناموجود')).toHaveLength(0);
  });
});
