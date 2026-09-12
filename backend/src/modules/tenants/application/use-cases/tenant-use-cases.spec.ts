import { CreateTenantCommand } from '../dtos/create-tenant.command';
import { ChangeValuationMethodCommand } from '../dtos/change-valuation-method.command';
import { CreateTenantUseCase } from './create-tenant.use-case';
import { ChangeTenantValuationMethodUseCase } from './change-tenant-valuation-method.use-case';
import { DeactivateTenantUseCase } from './deactivate-tenant.use-case';
import type { TenantRepositoryPort } from '../ports/tenant-repository.port';
import type { TenantId } from '@modules/tenants/domain';
import {
  Currency,
  ShopName,
  SubscriptionPlan,
  InventoryValuationMethod,
  TaxInfo,
  TenantStatus,
  Tenant,
  tenantId,
} from '@modules/tenants/domain';
import { InvalidValueError } from '@shared/domain/invalid-value.error';
import { NotFoundError } from '@shared/domain/errors/not-found.error';
import { InvalidShopNameError, TenantAlreadyDeactivatedError } from '@modules/tenants/domain';
import { SubscriptionPolicyService } from '../services/subscription-policy.service';
import { InvalidStateError } from '@shared/domain/invalid-state.error';

/** In-memory adapter implementing the application port for tests. */
class InMemoryTenantRepository implements TenantRepositoryPort {
  private readonly tenants = new Map<string, Tenant>();

  async save(tenant: Tenant): Promise<void> {
    this.tenants.set(tenant.id, tenant);
    await Promise.resolve();
  }

  async findById(id: TenantId): Promise<Tenant | null> {
    return Promise.resolve(this.tenants.get(id) ?? null);
  }

  async exists(id: TenantId): Promise<boolean> {
    return Promise.resolve(this.tenants.has(id));
  }
}

const taxInfo = () => TaxInfo.of({ legalName: 'Corner Shop LLC', nationalId: '1234567890' });

const freeTenant = () =>
  Tenant.reconstitute({
    id: tenantId('tenant-1'),
    shopName: ShopName.of('Free Mart'),
    taxInfo: taxInfo(),
    baseCurrency: Currency.of('IRR'),
    valuationMethod: InventoryValuationMethod.fifo(),
    subscriptionPlan: SubscriptionPlan.free(),
    status: TenantStatus.active(),
  });

const paidTenant = () =>
  Tenant.reconstitute({
    id: tenantId('tenant-1'),
    shopName: ShopName.of('Paid Mart'),
    taxInfo: taxInfo(),
    baseCurrency: Currency.of('IRR'),
    valuationMethod: InventoryValuationMethod.fifo(),
    subscriptionPlan: SubscriptionPlan.paid(),
    status: TenantStatus.active(),
  });

const fixedIdGenerator = { nextId: (): string => 'generated-1' };

describe('Tenant use cases', () => {
  describe('CreateTenantUseCase', () => {
    it('creates a tenant with legal identity and default FIFO/FREE state', async () => {
      const repository = new InMemoryTenantRepository();
      const useCase = new CreateTenantUseCase(repository, fixedIdGenerator);

      const response = await useCase.execute(
        new CreateTenantCommand('  Corner Shop  ', 'Corner Shop LLC', '1234567890', 'IRR'),
      );

      expect(response.id).toBe('generated-1');
      expect(response.shopName).toBe('Corner Shop');
      expect(response.legalName).toBe('Corner Shop LLC');
      expect(response.nationalId).toBe('1234567890');
      expect(response.baseCurrency).toBe('IRR');
      expect(response.valuationMethod).toBe('FIFO');
      expect(response.subscriptionPlan).toBe('FREE');
      expect(response.status).toBe('ACTIVE');
      expect(await repository.exists(tenantId('generated-1'))).toBe(true);
    });

    it('honours an explicit subscription plan', async () => {
      const repository = new InMemoryTenantRepository();
      const useCase = new CreateTenantUseCase(repository, fixedIdGenerator);

      const response = await useCase.execute(
        new CreateTenantCommand('Shop', 'Shop LLC', '1234567890', 'IRR', 'PAID'),
      );

      expect(response.subscriptionPlan).toBe('PAID');
    });

    it('rejects an empty shop name', async () => {
      const useCase = new CreateTenantUseCase(new InMemoryTenantRepository(), fixedIdGenerator);

      await expect(
        useCase.execute(new CreateTenantCommand('  ', 'Shop LLC', '1234567890', 'IRR')),
      ).rejects.toThrow(InvalidShopNameError);
    });

    it('rejects an invalid national ID', async () => {
      const useCase = new CreateTenantUseCase(new InMemoryTenantRepository(), fixedIdGenerator);

      await expect(
        useCase.execute(new CreateTenantCommand('Shop', 'Shop LLC', 'BAD', 'IRR')),
      ).rejects.toThrow(InvalidValueError);
    });

    it('rejects an unsupported currency', async () => {
      const useCase = new CreateTenantUseCase(new InMemoryTenantRepository(), fixedIdGenerator);

      await expect(
        useCase.execute(new CreateTenantCommand('Shop', 'Shop LLC', '1234567890', 'XYZ')),
      ).rejects.toThrow(InvalidValueError);
    });
  });

  describe('ChangeTenantValuationMethodUseCase', () => {
    it('switches the valuation method of an existing PAID tenant to LIFO', async () => {
      const repository = new InMemoryTenantRepository();
      await repository.save(paidTenant());
      const useCase = new ChangeTenantValuationMethodUseCase(repository, new SubscriptionPolicyService());

      const response = await useCase.execute(new ChangeValuationMethodCommand(tenantId('tenant-1'), 'LIFO'));

      expect(response.valuationMethod).toBe('LIFO');
      expect(response.id).toBe('tenant-1');
    });

    it('allows a FREE-plan tenant to keep FIFO valuation', async () => {
      const repository = new InMemoryTenantRepository();
      await repository.save(freeTenant());
      const useCase = new ChangeTenantValuationMethodUseCase(repository, new SubscriptionPolicyService());

      const response = await useCase.execute(new ChangeValuationMethodCommand(tenantId('tenant-1'), 'FIFO'));

      expect(response.valuationMethod).toBe('FIFO');
    });

    it('rejects LIFO for a FREE-plan tenant via the subscription policy', async () => {
      const repository = new InMemoryTenantRepository();
      await repository.save(freeTenant());
      const useCase = new ChangeTenantValuationMethodUseCase(repository, new SubscriptionPolicyService());

      await expect(
        useCase.execute(new ChangeValuationMethodCommand(tenantId('tenant-1'), 'LIFO')),
      ).rejects.toThrow(InvalidStateError);
    });

    it('throws NotFound when the tenant does not exist', async () => {
      const useCase = new ChangeTenantValuationMethodUseCase(
        new InMemoryTenantRepository(),
        new SubscriptionPolicyService(),
      );

      await expect(
        useCase.execute(new ChangeValuationMethodCommand(tenantId('missing'), 'LIFO')),
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('DeactivateTenantUseCase', () => {
    it('deactivates an existing tenant', async () => {
      const repository = new InMemoryTenantRepository();
      await repository.save(freeTenant());
      const useCase = new DeactivateTenantUseCase(repository);

      const response = await useCase.execute(tenantId('tenant-1'));

      expect(response.status).toBe('DEACTIVATED');
    });

    it('throws NotFound when the tenant does not exist', async () => {
      const useCase = new DeactivateTenantUseCase(new InMemoryTenantRepository());

      await expect(useCase.execute(tenantId('missing'))).rejects.toThrow(NotFoundError);
    });

    it('rejects deactivating an already deactivated tenant', async () => {
      const tenant = freeTenant();
      tenant.deactivate();
      const repository = new InMemoryTenantRepository();
      await repository.save(tenant);
      const useCase = new DeactivateTenantUseCase(repository);

      await expect(useCase.execute(tenantId('tenant-1'))).rejects.toThrow(TenantAlreadyDeactivatedError);
    });
  });
});
