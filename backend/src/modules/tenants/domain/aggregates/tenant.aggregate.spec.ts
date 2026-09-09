import { InvalidValueError } from '@shared/domain/invalid-value.error';
import { Tenant } from './tenant.aggregate';
import { tenantId } from '../value-objects/tenant-id';
import { TenantCreatedEvent } from '../events/tenant-created.event';
import type { TenantValuationMethodChangedEvent } from '../events/tenant-valuation-method-changed.event';
import { TenantDeactivatedEvent } from '../events/tenant-deactivated.event';
import { ShopName } from '../value-objects/shop-name.vo';
import { InventoryValuationMethod } from '../value-objects/inventory-valuation-method.vo';
import { SubscriptionPlan } from '../value-objects/subscription-plan.vo';
import { TenantStatus } from '../value-objects/tenant-status.vo';
import { TenantAlreadyDeactivatedError } from '../errors/tenant-already-deactivated.error';

const shopName = () => ShopName.of('  Acme Mart  ');

describe('Tenant aggregate', () => {
  describe('create factory', () => {
    it('creates a tenant with default FIFO, FREE plan and ACTIVE status', () => {
      const tenant = Tenant.create({ id: tenantId('tenant-1'), shopName: shopName() });

      expect(tenant.id).toBe('tenant-1');
      expect(tenant.storeName).toEqual(ShopName.of('Acme Mart'));
      expect(tenant.valuation.value).toBe('FIFO');
      expect(tenant.plan.value).toBe('FREE');
      expect(tenant.tenantStatus.value).toBe('ACTIVE');
      expect(tenant.isActive).toBe(true);
    });

    it('honours an explicit initial subscription plan', () => {
      const tenant = Tenant.create({
        id: tenantId('tenant-1'),
        shopName: shopName(),
        subscriptionPlan: SubscriptionPlan.paid(),
      });

      expect(tenant.plan.value).toBe('PAID');
    });

    it('raises exactly one TenantCreatedEvent', () => {
      const tenant = Tenant.create({ id: tenantId('tenant-1'), shopName: shopName() });

      const events = tenant.getDomainEvents();
      expect(events).toHaveLength(1);
      expect(events[0]).toBeInstanceOf(TenantCreatedEvent);

      const event = events[0] as TenantCreatedEvent;
      expect(event.tenantId).toBe('tenant-1');
      expect(event.shopName).toBe('Acme Mart');
      expect(event.inventoryValuationMethod).toBe('FIFO');
      expect(event.subscriptionPlan).toBe('FREE');
      expect(event.eventName).toBe('TenantCreated');
    });
  });

  describe('changeValuationMethod', () => {
    it('switches valuation between FIFO and LIFO and raises the change event', () => {
      const tenant = Tenant.create({ id: tenantId('tenant-1'), shopName: shopName() });
      tenant.clearEvents();

      tenant.changeValuationMethod(InventoryValuationMethod.lifo());

      expect(tenant.valuation.value).toBe('LIFO');
      const events = tenant.getDomainEvents();
      expect(events).toHaveLength(1);
      const event = events[0] as TenantValuationMethodChangedEvent;
      expect(event.previousMethod).toBe('FIFO');
      expect(event.nextMethod).toBe('LIFO');
    });

    it('is a no-op when switching to the current valuation', () => {
      const tenant = Tenant.create({ id: tenantId('tenant-1'), shopName: shopName() });
      tenant.clearEvents();

      tenant.changeValuationMethod(InventoryValuationMethod.fifo());

      expect(tenant.getDomainEvents()).toHaveLength(0);
      expect(tenant.valuation.value).toBe('FIFO');
    });

    it('rejects valuation changes for a deactivated tenant', () => {
      const tenant = Tenant.create({ id: tenantId('tenant-1'), shopName: shopName() });
      tenant.deactivate();

      expect(() => tenant.changeValuationMethod(InventoryValuationMethod.lifo())).toThrow();
      expect(tenant.valuation.value).toBe('FIFO');
    });
  });

  describe('deactivate', () => {
    it('deactivates an active tenant and raises TenantDeactivatedEvent', () => {
      const tenant = Tenant.create({ id: tenantId('tenant-1'), shopName: shopName() });
      tenant.clearEvents();

      tenant.deactivate();

      expect(tenant.isActive).toBe(false);
      expect(tenant.tenantStatus.value).toBe('DEACTIVATED');
      const events = tenant.getDomainEvents();
      expect(events).toHaveLength(1);
      expect(events[0]).toBeInstanceOf(TenantDeactivatedEvent);
    });

    it('is idempotent for an already deactivated tenant', () => {
      const tenant = Tenant.create({ id: tenantId('tenant-1'), shopName: shopName() });
      tenant.deactivate();

      expect(() => tenant.deactivate()).toThrow(TenantAlreadyDeactivatedError);
      expect(tenant.tenantStatus.value).toBe('DEACTIVATED');
    });
  });

  describe('reactivate', () => {
    it('reactivates a deactivated tenant', () => {
      const tenant = Tenant.create({ id: tenantId('tenant-1'), shopName: shopName() });
      tenant.deactivate();

      tenant.reactivate();

      expect(tenant.isActive).toBe(true);
      expect(tenant.tenantStatus.value).toBe('ACTIVE');
    });
  });

  describe('upgradePlan', () => {
    it('upgrades from FREE to PAID', () => {
      const tenant = Tenant.create({ id: tenantId('tenant-1'), shopName: shopName() });

      tenant.upgradePlan(SubscriptionPlan.paid());

      expect(tenant.plan.value).toBe('PAID');
    });

    it('rejects a FREE target plan as the upgrade target', () => {
      const tenant = Tenant.create({ id: tenantId('tenant-1'), shopName: shopName() });

      expect(() => tenant.upgradePlan(SubscriptionPlan.free())).toThrow(InvalidValueError);
    });
  });

  describe('reconstitute', () => {
    it('rehydrates state without raising creation events', () => {
      const tenant = Tenant.reconstitute({
        id: tenantId('tenant-1'),
        shopName: ShopName.of('Acme Mart'),
        valuationMethod: InventoryValuationMethod.lifo(),
        subscriptionPlan: SubscriptionPlan.paid(),
        status: TenantStatus.deactivated(),
      });

      expect(tenant.valuation.value).toBe('LIFO');
      expect(tenant.plan.value).toBe('PAID');
      expect(tenant.isActive).toBe(false);
      expect(tenant.getDomainEvents()).toHaveLength(0);
    });
  });
});
