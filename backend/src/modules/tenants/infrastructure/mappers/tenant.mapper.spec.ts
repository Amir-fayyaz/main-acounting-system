import {
  Currency,
  InventoryValuationMethod,
  ShopName,
  SubscriptionPlan,
  TaxInfo,
  Tenant,
  tenantId,
  TenantStatus,
} from '@modules/tenants/domain';
import { TenantMapper } from './tenant.mapper';
import { TenantOrmEntity } from '../entities/tenant.orm-entity';

const taxInfo = () => TaxInfo.of({ legalName: 'Acme Trading LLC', nationalId: '1234567890' });

describe('TenantMapper', () => {
  describe('toPersistence', () => {
    it('maps a tenant aggregate to the ORM entity', () => {
      const tenant = Tenant.create({
        id: tenantId('tenant-1'),
        shopName: ShopName.of('Acme Mart'),
        taxInfo: taxInfo(),
        baseCurrency: Currency.of('IRR'),
      });
      tenant.changeValuationMethod(InventoryValuationMethod.lifo());
      tenant.upgradePlan(SubscriptionPlan.paid());

      const entity = TenantMapper.toPersistence(tenant);

      expect(entity).toBeInstanceOf(TenantOrmEntity);
      expect(entity.id).toBe('tenant-1');
      expect(entity.shopName).toBe('Acme Mart');
      expect(entity.legalName).toBe('Acme Trading LLC');
      expect(entity.nationalId).toBe('1234567890');
      expect(entity.baseCurrency).toBe('IRR');
      expect(entity.inventoryValuationMethod).toBe('LIFO');
      expect(entity.subscriptionPlan).toBe('PAID');
      expect(entity.status).toBe('ACTIVE');
    });
  });

  describe('toDomain', () => {
    it('maps an ORM entity back to a tenant aggregate without raising creation events', () => {
      const entity = new TenantOrmEntity();
      entity.id = 'tenant-1';
      entity.shopName = 'Acme Mart';
      entity.legalName = 'Acme Trading LLC';
      entity.nationalId = '1234567890';
      entity.baseCurrency = 'IRR';
      entity.inventoryValuationMethod = 'LIFO';
      entity.subscriptionPlan = 'PAID';
      entity.status = 'SUSPENDED';

      const tenant = TenantMapper.toDomain(entity);

      expect(tenant.id).toBe('tenant-1');
      expect(tenant.storeName).toEqual(ShopName.of('Acme Mart'));
      expect(tenant.taxIdentity).toEqual(taxInfo());
      expect(tenant.currency.value).toBe('IRR');
      expect(tenant.valuation.value).toBe('LIFO');
      expect(tenant.plan.value).toBe('PAID');
      expect(tenant.tenantStatus.value).toBe('SUSPENDED');
      expect(tenant.isActive).toBe(false);
      expect(tenant.getDomainEvents()).toHaveLength(0);
    });

    it('is a round-trip of value objects through both directions', () => {
      const tenant = Tenant.reconstitute({
        id: tenantId('tenant-9'),
        shopName: ShopName.of('Round Trip'),
        taxInfo: taxInfo(),
        baseCurrency: Currency.of('USD'),
        valuationMethod: InventoryValuationMethod.fifo(),
        subscriptionPlan: SubscriptionPlan.free(),
        status: TenantStatus.active(),
      });

      const entity = TenantMapper.toPersistence(tenant);
      const roundTripped = TenantMapper.toDomain(entity);

      expect(roundTripped.id).toBe('tenant-9');
      expect(roundTripped.storeName.equals(tenant.storeName)).toBe(true);
      expect(roundTripped.taxIdentity.equals(tenant.taxIdentity)).toBe(true);
      expect(roundTripped.currency.equals(tenant.currency)).toBe(true);
      expect(roundTripped.valuation.equals(tenant.valuation)).toBe(true);
      expect(roundTripped.plan.equals(tenant.plan)).toBe(true);
      expect(roundTripped.tenantStatus.equals(tenant.tenantStatus)).toBe(true);
    });
  });
});
