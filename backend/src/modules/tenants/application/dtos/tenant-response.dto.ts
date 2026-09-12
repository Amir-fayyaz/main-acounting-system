import type {
  InventoryValuationMethodValue,
  SubscriptionPlanValue,
  TenantId,
  TenantStatusValue,
} from '@modules/tenants/domain';

/**
 * Safe, read-oriented projection of a tenant returned by use cases/controllers.
 * Never exposes internal state beyond the documented public contract.
 */
export interface TenantResponseDto {
  readonly id: TenantId;
  readonly shopName: string;
  readonly legalName: string;
  readonly nationalId: string;
  readonly baseCurrency: string;
  readonly valuationMethod: InventoryValuationMethodValue;
  readonly subscriptionPlan: SubscriptionPlanValue;
  readonly status: TenantStatusValue;
}
