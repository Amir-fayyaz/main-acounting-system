/**
 * Stores the company the authenticated user last selected as "active"
 * (Tenant Controller / select-active-company).
 *
 * This is a *preference*, not a grant: every tenant-scoped request still goes
 * through the authorization boundary against the route's tenant claim. The
 * preference only answers "which company did the user last choose in the UI".
 *
 * No HTTP, no framework types — adapters live under identity infrastructure.
 */
export interface ActiveTenantPreference {
  /** The tenant id the user selected, or `undefined` when none is stored. */
  get(userId: string): Promise<string | undefined>;

  /**
   * Records the selection. Replaces any previous preference for this user.
   * Callers must have already verified active membership.
   */
  set(userId: string, tenantId: string): Promise<void>;

  /** Clears the preference (optional; used by tests and sign-out flows later). */
  clear(userId: string): Promise<void>;
}

/** DI token for {@link ActiveTenantPreference}. */
export const ACTIVE_TENANT_PREFERENCE = Symbol('ACTIVE_TENANT_PREFERENCE');
