import { TenantController } from './tenant.controller';
import {
  ChangeTenantValuationMethodUseCase,
  CreateTenantUseCase,
  DeactivateTenantUseCase,
} from '@modules/tenants/application';
import type { TenantResponseDto } from '@modules/tenants/application';
import type { ChangeValuationMethodHttpRequest } from '../dtos/change-valuation-method.http-request';
import type { CreateTenantHttpRequest } from '../dtos/create-tenant.http-request';

const tenantResponse: TenantResponseDto = {
  id: '550e8400-e29b-41d4-a716-446655440000' as TenantResponseDto['id'],
  shopName: 'Acme Mart',
  legalName: 'Acme Trading LLC',
  nationalId: '1234567890',
  baseCurrency: 'IRR',
  valuationMethod: 'FIFO',
  subscriptionPlan: 'FREE',
  status: 'ACTIVE',
};

describe('TenantController', () => {
  const createTenant = { execute: jest.fn() } as unknown as CreateTenantUseCase;
  const changeValuationMethod = { execute: jest.fn() } as unknown as ChangeTenantValuationMethodUseCase;
  const deactivateTenant = { execute: jest.fn() } as unknown as DeactivateTenantUseCase;
  let controller: TenantController;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new TenantController(createTenant, changeValuationMethod, deactivateTenant);
  });

  it('delegates tenant creation and returns the use case response', async () => {
    const request: CreateTenantHttpRequest = {
      shopName: 'Acme Mart',
      legalName: 'Acme Trading LLC',
      nationalId: '1234567890',
      baseCurrency: 'IRR',
      subscriptionPlan: 'FREE',
    };
    jest.mocked(createTenant.execute).mockResolvedValue(tenantResponse);

    await expect(controller.create(request)).resolves.toBe(tenantResponse);
    expect(createTenant.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        shopName: request.shopName,
        legalName: request.legalName,
        nationalId: request.nationalId,
        baseCurrency: request.baseCurrency,
        subscriptionPlan: request.subscriptionPlan,
      }),
    );
  });

  it('delegates valuation changes with the tenant id from the route', async () => {
    const request: ChangeValuationMethodHttpRequest = { method: 'LIFO' };
    jest
      .mocked(changeValuationMethod.execute)
      .mockResolvedValue({ ...tenantResponse, valuationMethod: 'LIFO' });

    await expect(controller.changeValuation(tenantResponse.id, request)).resolves.toEqual({
      ...tenantResponse,
      valuationMethod: 'LIFO',
    });
    expect(changeValuationMethod.execute).toHaveBeenCalledWith(
      expect.objectContaining({ tenantId: tenantResponse.id, method: 'LIFO' }),
    );
  });

  it('delegates tenant deactivation with the tenant id from the route', async () => {
    jest.mocked(deactivateTenant.execute).mockResolvedValue({ ...tenantResponse, status: 'DEACTIVATED' });

    await expect(controller.deactivate(tenantResponse.id)).resolves.toEqual({
      ...tenantResponse,
      status: 'DEACTIVATED',
    });
    expect(deactivateTenant.execute).toHaveBeenCalledWith(tenantResponse.id);
  });
});
