import type { Tenant } from '@modules/tenants/domain';
import type { TenantResponseDto } from '../dtos/tenant-response.dto';

/** Maps a Tenant aggregate to the safe public projection returned to callers. */
export function toTenantResponse(tenant: Tenant): TenantResponseDto {
  return {
    id: tenant.id,
    shopName: tenant.storeName.value,
    legalName: tenant.taxIdentity.legalName,
    nationalId: tenant.taxIdentity.nationalId,
    baseCurrency: tenant.currency.value,
    valuationMethod: tenant.valuation.value,
    subscriptionPlan: tenant.plan.value,
    status: tenant.tenantStatus.value,
  };
}
