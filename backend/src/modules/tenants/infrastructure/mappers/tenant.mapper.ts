import {
  InventoryValuationMethod,
  ShopName,
  SubscriptionPlan,
  Tenant,
  tenantId,
  TenantStatus,
} from '@modules/tenants/domain';
import { TenantOrmEntity } from '../entities/tenant.orm-entity';

/**
 * Bidirectional translator between the Tenant aggregate root and the TypeORM
 * persistence model. The domain never sees ORM decorators or column names.
 */
export class TenantMapper {
  static toDomain(entity: TenantOrmEntity): Tenant {
    return Tenant.reconstitute({
      id: tenantId(entity.id),
      shopName: ShopName.of(entity.shopName),
      valuationMethod: InventoryValuationMethod.of(entity.inventoryValuationMethod),
      subscriptionPlan: SubscriptionPlan.of(entity.subscriptionPlan),
      status: TenantStatus.of(entity.status),
    });
  }

  static toPersistence(tenant: Tenant): TenantOrmEntity {
    const entity = new TenantOrmEntity();
    entity.id = tenant.id;
    entity.shopName = tenant.storeName.value;
    entity.inventoryValuationMethod = tenant.valuation.value;
    entity.subscriptionPlan = tenant.plan.value;
    entity.status = tenant.tenantStatus.value;
    return entity;
  }
}
