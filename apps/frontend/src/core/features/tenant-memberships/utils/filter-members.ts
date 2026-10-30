import type { TenantMember } from '../assets/@types/membership.types';

/**
 * Client-side filter for the current page of members.
 * The memberships list API does not accept a `search` query param;
 * this keeps SearchInput usable without sending unsupported params upstream.
 */
export function filterMembersBySearch(
  members: TenantMember[],
  searchTerm: string,
): TenantMember[] {
  const q = searchTerm.trim().toLowerCase();
  if (!q) return members;

  return members.filter((m) => {
    const haystack = [m.displayName, m.email, m.status, m.userStatus]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    return haystack.includes(q);
  });
}
