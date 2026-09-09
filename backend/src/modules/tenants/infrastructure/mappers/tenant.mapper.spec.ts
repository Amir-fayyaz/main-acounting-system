import {
  InventoryValuationMethod,
  ShopName,
  SubscriptionPlan,
  Tenant,
  tenantId,
  TenantStatus,
} from '@modules/tenants/domain';
import { TenantMapper } from './tenant.mapper';
import { TenantOrmEntity } from '../entities/tenant.orm-entity';

describe('TenantMapper', () => {
  describe('toPersistence', () => {
    it('maps a tenant aggregate to the ORM entity', () => {
      const tenant = Tenant.create({
        id: tenantId('tenant-1'),
        shopName: ShopName.of('Acme Mart'),
      });
      tenant.changeValuationMethod(InventoryValuationMethod.lifo());
      tenant.upgradePlan(SubscriptionPlan.paid());

      const entity = TenantMapper.toPersistence(tenant);

      expect(entity).toBeInstanceOf(TenantOrmEntity);
      expect(entity.id).toBe('tenant-1');
      expect(entity.shopName).toBe('Acme Mart');
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
      entity.inventoryValuationMethod = 'LIFO';
      entity.subscriptionPlan = 'PAID';
      entity.status = 'DEACTIVATED';

      const tenant = TenantMapper.toDomain(entity);

      expect(tenant.id).toBe('tenant-1');
      expect(tenant.storeName).toEqual(ShopName.of('Acme Mart'));
      expect(tenant.valuation.value).toBe('LIFO');
      expect(tenant.plan.value).toBe('PAID');
      expect(tenant.tenantStatus.value).toBe('DEACTIVATED');
      expect(tenant.isActive).toBe(false);
      expect(tenant.getDomainEvents()).toHaveLength(0);
    });

    it('is a round-trip of value objects through both directions', () => {
      const tenant = Tenant.reconstitute({
        id: tenantId('tenant-9'),
        shopName: ShopName.of('Round Trip'),
        valuationMethod: InventoryValuationMethod.fifo(),
        subscriptionPlan: SubscriptionPlan.free(),
        status: TenantStatus.active(),
      });

      const entity = TenantMapper.toPersistence(tenant);
      const roundTripped = TenantMapper.toDomain(entity);

      expect(roundTripped.id).toBe('tenant-9');
      expect(roundTripped.storeName.equals(tenant.storeName)).toBe(true);
      expect(roundTripped.valuation.equals(tenant.valuation)).toBe(true);
      expect(roundTripped.plan.equals(tenant.plan)).toBe(true);
      expect(roundTripped.tenantStatus.equals(tenant.tenantStatus)).toBe(true);
    });
  });
});
