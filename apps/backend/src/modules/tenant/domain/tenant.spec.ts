import { describe, expect, it } from 'vitest';
import { DateTime } from '../../../shared/time/date-time.js';
import { InvalidPrimitiveError } from '../../../shared/primitives/invalid-primitive-error.js';
import { Tenant } from './aggregates/tenant.js';
import { InactiveTenantError, InvalidTenantStatusTransitionError } from './errors/tenant.errors.js';
import { TenantName } from './value-objects/tenant-name.js';
import { TenantStatus, TENANT_STATUS_VALUES } from './value-objects/tenant-status.js';

const NOW = DateTime.parse('2026-10-03T08:00:00.000Z');
const LATER = DateTime.parse('2026-10-04T08:00:00.000Z');

function newTenant(name = 'Acme Trading Co.'): Tenant {
  return Tenant.create({ name: TenantName.from(name), now: NOW });
}

describe('Tenant aggregate', () => {
  describe('identity', () => {
    it('generates a stable, UUID-shaped identity that does not change', () => {
      const tenant = newTenant();
      const id = tenant.id.value;

      expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
      expect(tenant.id.value).toBe(id);

      tenant.rename(TenantName.from('Renamed'), LATER);

      expect(tenant.id.value).toBe(id);
    });

    it('never reuses an identity for another tenant', () => {
      const first = newTenant();
      const second = newTenant();

      expect(first.id.equals(second.id)).toBe(false);
    });

    it('exposes its identity as the tenant boundary string', () => {
      const tenant = newTenant();

      expect(tenant.tenantId()).toBe(tenant.id.value);
    });
  });

  describe('creation', () => {
    it('starts active with both timestamps equal to the creation instant', () => {
      const tenant = newTenant();

      expect(tenant.status).toBe(TenantStatus.ACTIVE);
      expect(tenant.name.value).toBe('Acme Trading Co.');
      expect(tenant.createdAt.equals(NOW)).toBe(true);
      expect(tenant.updatedAt.equals(NOW)).toBe(true);
      expect(tenant.isActive()).toBe(true);
    });

    it('rehydrates stored state through the same value objects', () => {
      const tenant = newTenant();
      const rehydrated = Tenant.rehydrate(tenant.snapshot());

      expect(rehydrated.id.equals(tenant.id)).toBe(true);
      expect(rehydrated.snapshot()).toEqual(tenant.snapshot());
    });

    it('rejects a stored state the value objects cannot accept', () => {
      expect(() =>
        Tenant.rehydrate({
          id: 'not-a-uuid',
          name: 'Acme',
          status: 'active',
          createdAt: NOW,
          updatedAt: NOW,
        }),
      ).toThrow(InvalidPrimitiveError);
    });
  });

  describe('mutable attributes', () => {
    it('renames and advances only updatedAt', () => {
      const tenant = newTenant();

      tenant.rename(TenantName.from('New Name'), LATER);

      expect(tenant.name.value).toBe('New Name');
      expect(tenant.createdAt.equals(NOW)).toBe(true);
      expect(tenant.updatedAt.equals(LATER)).toBe(true);
    });
  });

  describe('lifecycle', () => {
    it('deactivates an active tenant and reactivates it', () => {
      const tenant = newTenant();

      tenant.deactivate(LATER);
      expect(tenant.status).toBe(TenantStatus.INACTIVE);
      expect(tenant.updatedAt.equals(LATER)).toBe(true);

      tenant.activate(LATER);
      expect(tenant.status).toBe(TenantStatus.ACTIVE);
    });

    it('refuses to deactivate an already inactive tenant', () => {
      const tenant = newTenant();
      tenant.deactivate(NOW);

      expect(() => tenant.deactivate(LATER)).toThrow(InvalidTenantStatusTransitionError);
    });

    it('refuses to activate an already active tenant', () => {
      const tenant = newTenant();

      expect(() => tenant.activate(LATER)).toThrow(InvalidTenantStatusTransitionError);
    });

    it('refuses to change attributes of an inactive tenant', () => {
      const tenant = newTenant();
      tenant.deactivate(NOW);

      expect(() => tenant.rename(TenantName.from('New Name'), LATER)).toThrow(InactiveTenantError);
      expect(tenant.name.value).toBe('Acme Trading Co.');
    });

    it('reports the states it refused to move between', () => {
      const tenant = newTenant();
      tenant.deactivate(NOW);

      try {
        tenant.deactivate(LATER);
        expect.unreachable('the transition should have been refused');
      } catch (error) {
        expect(error).toBeInstanceOf(InvalidTenantStatusTransitionError);
        expect((error as InvalidTenantStatusTransitionError).code).toBe(
          'INVALID_TENANT_STATUS_TRANSITION',
        );
      }
    });
  });
});

describe('TenantName', () => {
  it('trims and keeps the text', () => {
    expect(TenantName.from('  Acme  ').value).toBe('Acme');
  });

  it('rejects blank and over-long names', () => {
    expect(() => TenantName.from('   ')).toThrow(InvalidPrimitiveError);
    expect(() => TenantName.from('x'.repeat(TenantName.MAX_LENGTH + 1))).toThrow(
      InvalidPrimitiveError,
    );
  });
});

describe('TenantStatus', () => {
  it('wraps and compares its two states', () => {
    expect(TenantStatus.from('active')).toBe(TenantStatus.ACTIVE);
    expect(TenantStatus.from('inactive')).toBe(TenantStatus.INACTIVE);
    expect(TenantStatus.ACTIVE.equals(TenantStatus.from('active'))).toBe(true);
    expect(TENANT_STATUS_VALUES).toEqual(['active', 'inactive']);
  });

  it('rejects an unknown state', () => {
    expect(() => TenantStatus.from('archived' as never)).toThrow(InvalidPrimitiveError);
  });
});
