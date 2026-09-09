import { tenantId } from '@modules/tenants/domain';
import { TenantContextService } from './tenant-context.service';

describe('TenantContextService', () => {
  it('returns null when no tenant is bound', () => {
    const service = new TenantContextService();

    expect(service.getTenantId()).toBeNull();
  });

  it('returns the bound tenant id', () => {
    const service = new TenantContextService();

    service.setTenantId(tenantId('tenant-1'));

    expect(service.getTenantId()).toBe('tenant-1');
  });

  it('keeps the bound tenant visible across asynchronous continuation', async () => {
    const service = new TenantContextService();

    service.setTenantId(tenantId('tenant-1'));

    const observed = await Promise.resolve().then(() => service.getTenantId());

    expect(observed).toBe('tenant-1');
  });

  it('clears the bound tenant id', () => {
    const service = new TenantContextService();
    service.setTenantId(tenantId('tenant-1'));

    service.clear();

    expect(service.getTenantId()).toBeNull();
  });
});
