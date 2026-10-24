import type { ActiveCompanyPreference } from '../../src/modules/identity/application/ports/active-company-preference.port.js';
import type {
  ActiveTenantMembership,
  TenantMembership,
} from '../../src/modules/identity/application/ports/tenant-membership.port.js';
import {
  tenantReferenceFrom,
  type TenantReference,
} from '../../src/modules/identity/domain/value-objects/tenant-reference.js';
import {
  userIdFrom,
  type UserId,
} from '../../src/modules/identity/domain/value-objects/user-id.js';
import { EntityId } from '../../src/shared/id/entity-id.js';
import type { DateTime } from '../../src/shared/time/date-time.js';

/**
 * Test doubles for the identity-owned side of company selection (IAM-009).
 *
 * They implement the application ports, never a Drizzle adapter, so the tenant
 * HTTP specs can exercise selection without a database while still using the
 * real use case, the real controller and the real audit contract.
 */

/** Remembers the last company selected for each user. */
export class InMemoryActiveCompanyPreference implements ActiveCompanyPreference {
  private readonly active = new Map<
    string,
    { readonly tenantId: TenantReference; readonly selectedAt: DateTime }
  >();

  public async findActiveTenant(userId: UserId): Promise<TenantReference | undefined> {
    return this.active.get(userId.value)?.tenantId;
  }

  public async setActiveTenant(
    userId: UserId,
    tenantId: TenantReference,
    selectedAt: DateTime,
  ): Promise<void> {
    this.active.set(userId.value, { tenantId, selectedAt });
  }

  /** The stored selection as a plain tenant id, or `undefined`. */
  public selectedFor(userId: string): string | undefined {
    return this.active.get(userIdFrom(userId).value)?.tenantId.value;
  }
}

/** Active memberships, keyed by the (user, tenant) pair. */
export class StubTenantMembership implements TenantMembership {
  private readonly pairs = new Set<string>();

  public grant(userId: string, tenantId: string): void {
    this.pairs.add(this.key(userId, tenantId));
  }

  public revoke(userId: string, tenantId: string): void {
    this.pairs.delete(this.key(userId, tenantId));
  }

  public async findActiveForUserAndTenant(
    userId: UserId,
    tenantId: TenantReference,
  ): Promise<ActiveTenantMembership | undefined> {
    if (!this.pairs.has(this.key(userId.value, tenantId.value))) {
      return undefined;
    }

    return {
      membershipId: EntityId.generate(),
      tenantId,
    };
  }

  private key(userId: string, tenantId: string): string {
    return `${userId}:${tenantReferenceFrom(tenantId).value}`;
  }
}
