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
      taxInfo: TaxInfo.of({ legalName: entity.legalName, nationalId: entity.nationalId }),
      baseCurrency: Currency.of(entity.baseCurrency),
      valuationMethod: InventoryValuationMethod.of(entity.inventoryValuationMethod),
      subscriptionPlan: SubscriptionPlan.of(entity.subscriptionPlan),
      status: TenantStatus.of(entity.status),
    });
  }

  static toPersistence(tenant: Tenant): TenantOrmEntity {
    const entity = new TenantOrmEntity();
    entity.id = tenant.id;
    entity.shopName = tenant.storeName.value;
    entity.legalName = tenant.taxIdentity.legalName;
    entity.nationalId = tenant.taxIdentity.nationalId;
    entity.baseCurrency = tenant.currency.value;
    entity.inventoryValuationMethod = tenant.valuation.value;
    entity.subscriptionPlan = tenant.plan.value;
    entity.status = tenant.tenantStatus.value;
    return entity;
  }
}
