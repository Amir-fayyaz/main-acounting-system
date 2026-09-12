import { InvalidStateError } from '@shared/domain/invalid-state.error';
import { InvalidValueError } from '@shared/domain/invalid-value.error';
import { Tenant } from './tenant.aggregate';
import { tenantId } from '../value-objects/tenant-id';
import { Currency } from '../value-objects/currency.vo';
import { TaxInfo } from '../value-objects/tax-info.vo';
import { TenantCreatedDomainEvent } from '../events/tenant-created.event';
import { TenantStatusChangedDomainEvent } from '../events/tenant-status-changed.event';
import type { TenantValuationMethodChangedEvent } from '../events/tenant-valuation-method-changed.event';
import { TenantDeactivatedEvent } from '../events/tenant-deactivated.event';
import { ShopName } from '../value-objects/shop-name.vo';
import { InventoryValuationMethod } from '../value-objects/inventory-valuation-method.vo';
import { SubscriptionPlan } from '../value-objects/subscription-plan.vo';
import { TenantStatus } from '../value-objects/tenant-status.vo';
import { TenantAlreadyDeactivatedError } from '../errors/tenant-already-deactivated.error';

const shopName = () => ShopName.of('  Acme Mart  ');
const taxInfo = () => TaxInfo.of({ legalName: 'Acme Trading LLC', nationalId: '1234567890' });
const currency = () => Currency.of('irr');

const createTenant = () =>
  Tenant.create({
    id: tenantId('tenant-1'),
    shopName: shopName(),
    taxInfo: taxInfo(),
    baseCurrency: currency(),
  });

describe('Tenant value objects (issue #22)', () => {
  it('normalizes and accepts a supported ISO 4217 currency', () => {
    expect(currency().value).toBe('IRR');
    expect(Currency.of('usd').equals(Currency.of('USD'))).toBe(true);
  });

  it('rejects unsupported or malformed currencies', () => {
    expect(() => Currency.of('123')).toThrow(InvalidValueError);
    expect(() => Currency.of('XXY')).toThrow(InvalidValueError);
    expect(() => Currency.of('')).toThrow(InvalidValueError);
  });

  it('accepts a valid TaxInfo and trims the legal name', () => {
    const info = TaxInfo.of({ legalName: '  Acme  ', nationalId: '1234567890' });
    expect(info.legalName).toBe('Acme');
    expect(info.nationalId).toBe('1234567890');
  });

  it('rejects invalid TaxInfo values', () => {
    expect(() => TaxInfo.of({ legalName: '', nationalId: '1234567890' })).toThrow(InvalidValueError);
    expect(() => TaxInfo.of({ legalName: 'x'.repeat(101), nationalId: '1234567890' })).toThrow(
      InvalidValueError,
    );
    expect(() => TaxInfo.of({ legalName: 'Acme', nationalId: '12345' })).toThrow(InvalidValueError);
    expect(() => TaxInfo.of({ legalName: 'Acme', nationalId: '123456789a' })).toThrow(InvalidValueError);
  });
});

describe('Tenant aggregate', () => {
  describe('create factory', () => {
    it('creates a tenant with legal/financial identity, default FIFO, FREE plan and ACTIVE status', () => {
      const tenant = createTenant();

      expect(tenant.id).toBe('tenant-1');
      expect(tenant.storeName).toEqual(ShopName.of('Acme Mart'));
      expect(tenant.taxIdentity).toEqual(taxInfo());
      expect(tenant.currency).toEqual(currency());
      expect(tenant.valuation.value).toBe('FIFO');
      expect(tenant.plan.value).toBe('FREE');
      expect(tenant.tenantStatus.value).toBe('ACTIVE');
      expect(tenant.isActive).toBe(true);
    });

    it('raises exactly one TenantCreatedDomainEvent with the tax/currency payload', () => {
      const tenant = createTenant();

      const events = tenant.getDomainEvents();
      expect(events).toHaveLength(1);
      expect(events[0]).toBeInstanceOf(TenantCreatedDomainEvent);

      const event = events[0] as TenantCreatedDomainEvent;
      expect(event.tenantId).toBe('tenant-1');
      expect(event.legalName).toBe('Acme Trading LLC');
      expect(event.baseCurrency).toBe('IRR');
      expect(event.createdAt).toBeInstanceOf(Date);
      expect(event.eventName).toBe('TenantCreated');
    });
  });

  describe('suspend / activate transitions', () => {
    it('suspends an active tenant with a reason and raises TenantStatusChangedDomainEvent', () => {
      const tenant = createTenant();
      tenant.clearEvents();

      tenant.suspend('Unpaid subscription');

      expect(tenant.tenantStatus.value).toBe('SUSPENDED');
      expect(tenant.isActive).toBe(false);
      const events = tenant.getDomainEvents();
      expect(events).toHaveLength(1);
      const event = events[0] as TenantStatusChangedDomainEvent;
      expect(event.previousStatus).toBe('ACTIVE');
      expect(event.newStatus).toBe('SUSPENDED');
      expect(event.reason).toBe('Unpaid subscription');
      expect(event.eventName).toBe('TenantStatusChanged');
    });

    it('reactivates a suspended tenant and raises the status-changed event', () => {
      const tenant = createTenant();
      tenant.suspend('Unpaid subscription');
      tenant.clearEvents();

      tenant.reactivate();

      expect(tenant.tenantStatus.value).toBe('ACTIVE');
      const event = tenant.getDomainEvents()[0] as TenantStatusChangedDomainEvent;
      expect(event.previousStatus).toBe('SUSPENDED');
      expect(event.newStatus).toBe('ACTIVE');
    });

    it('rejects suspending an already suspended tenant', () => {
      const tenant = createTenant();
      tenant.suspend('first');

      expect(() => tenant.suspend('second')).toThrow(InvalidStateError);
    });

    it('rejects reactivating an already active tenant', () => {
      const tenant = createTenant();

      expect(() => tenant.reactivate()).toThrow(InvalidStateError);
    });

    it('reactivates a legacy-deactivated tenant for backwards compatibility', () => {
      const tenant = createTenant();
      tenant.deactivate();
      tenant.clearEvents();

      tenant.reactivate();

      expect(tenant.tenantStatus.value).toBe('ACTIVE');
      const event = tenant.getDomainEvents()[0] as TenantStatusChangedDomainEvent;
      expect(event.previousStatus).toBe('DEACTIVATED');
      expect(event.newStatus).toBe('ACTIVE');
    });
  });

  describe('updateTaxInfo', () => {
    it('updates the legal tax identity of an active tenant', () => {
      const tenant = createTenant();
      const updated = TaxInfo.of({ legalName: 'New Name LLC', nationalId: '0987654321' });

      tenant.updateTaxInfo(updated);

      expect(tenant.taxIdentity).toEqual(updated);
    });

    it('rejects tax info updates for a suspended tenant', () => {
      const tenant = createTenant();
      tenant.suspend('Unpaid subscription');

      expect(() => tenant.updateTaxInfo(taxInfo())).toThrow(InvalidStateError);
    });
  });

  describe('changeValuationMethod', () => {
    it('switches valuation between FIFO and LIFO and raises the change event', () => {
      const tenant = createTenant();
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
      const tenant = createTenant();
      tenant.clearEvents();

      tenant.changeValuationMethod(InventoryValuationMethod.fifo());

      expect(tenant.getDomainEvents()).toHaveLength(0);
      expect(tenant.valuation.value).toBe('FIFO');
    });

    it('rejects valuation changes for a suspended tenant', () => {
      const tenant = createTenant();
      tenant.suspend('Unpaid subscription');

      expect(() => tenant.changeValuationMethod(InventoryValuationMethod.lifo())).toThrow();
      expect(tenant.valuation.value).toBe('FIFO');
    });
  });

  describe('deactivate', () => {
    it('archives an active tenant and raises the status-changed and deactivated events', () => {
      const tenant = createTenant();
      tenant.clearEvents();

      tenant.deactivate();

      expect(tenant.isActive).toBe(false);
      expect(tenant.tenantStatus.value).toBe('DEACTIVATED');
      const events = tenant.getDomainEvents();
      expect(events).toHaveLength(2);
      expect(events[0]).toBeInstanceOf(TenantStatusChangedDomainEvent);
      expect(events[1]).toBeInstanceOf(TenantDeactivatedEvent);
    });

    it('is idempotent for an already deactivated tenant', () => {
      const tenant = createTenant();
      tenant.deactivate();

      expect(() => tenant.deactivate()).toThrow(TenantAlreadyDeactivatedError);
      expect(tenant.tenantStatus.value).toBe('DEACTIVATED');
    });
  });

  describe('upgradePlan', () => {
    it('upgrades from FREE to PAID', () => {
      const tenant = createTenant();

      tenant.upgradePlan(SubscriptionPlan.paid());

      expect(tenant.plan.value).toBe('PAID');
    });

    it('rejects a FREE target plan as the upgrade target', () => {
      const tenant = createTenant();

      expect(() => tenant.upgradePlan(SubscriptionPlan.free())).toThrow(InvalidValueError);
    });
  });

  describe('reconstitute', () => {
    it('rehydrates state without raising creation events', () => {
      const tenant = Tenant.reconstitute({
        id: tenantId('tenant-1'),
        shopName: ShopName.of('Acme Mart'),
        taxInfo: taxInfo(),
        baseCurrency: currency(),
        valuationMethod: InventoryValuationMethod.lifo(),
        subscriptionPlan: SubscriptionPlan.paid(),
        status: TenantStatus.suspended(),
      });

      expect(tenant.valuation.value).toBe('LIFO');
      expect(tenant.plan.value).toBe('PAID');
      expect(tenant.taxIdentity).toEqual(taxInfo());
      expect(tenant.currency).toEqual(currency());
      expect(tenant.tenantStatus.value).toBe('SUSPENDED');
      expect(tenant.getDomainEvents()).toHaveLength(0);
    });
  });
});
