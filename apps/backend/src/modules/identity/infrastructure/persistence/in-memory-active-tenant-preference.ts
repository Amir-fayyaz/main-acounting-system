import type { ActiveTenantPreference } from '../../application/ports/active-tenant-preference.port.js';

/**
 * Process-local active-company preference store.
 *
 * Sufficient for the select-active-company contract and integration tests until
 * a durable table is introduced. Not shared across process restarts.
 */
export class InMemoryActiveTenantPreference implements ActiveTenantPreference {
  private readonly byUser = new Map<string, string>();

  public async get(userId: string): Promise<string | undefined> {
    return this.byUser.get(userId);
  }

  public async set(userId: string, tenantId: string): Promise<void> {
    this.byUser.set(userId, tenantId);
  }

  public async clear(userId: string): Promise<void> {
    this.byUser.delete(userId);
  }
}
