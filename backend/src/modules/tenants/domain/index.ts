/**
 * Public domain exports for the Tenant module. Other layers must import
 * tenant domain types from this entry point only.
 */
export { Tenant } from './aggregates/tenant.aggregate';
export { tenantId, type TenantId } from './value-objects/tenant-id';
export { ShopName } from './value-objects/shop-name.vo';
export { TaxInfo } from './value-objects/tax-info.vo';
export { Currency } from './value-objects/currency.vo';
export {
  InventoryValuationMethod,
  type InventoryValuationMethodValue,
} from './value-objects/inventory-valuation-method.vo';
export { SubscriptionPlan, type SubscriptionPlanValue } from './value-objects/subscription-plan.vo';
export { TenantStatus, type TenantStatusValue } from './value-objects/tenant-status.vo';
export { InvalidShopNameError } from './errors/invalid-shop-name.error';
export { TenantAlreadyDeactivatedError } from './errors/tenant-already-deactivated.error';
export { TenantCreatedDomainEvent } from './events/tenant-created.event';
export { TenantStatusChangedDomainEvent } from './events/tenant-status-changed.event';
export { TenantValuationMethodChangedEvent } from './events/tenant-valuation-method-changed.event';
export { TenantDeactivatedEvent } from './events/tenant-deactivated.event';
