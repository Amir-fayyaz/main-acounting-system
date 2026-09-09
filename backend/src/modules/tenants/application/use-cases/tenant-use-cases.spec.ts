import { CreateTenantCommand } from '../dtos/create-tenant.command';
import { ChangeValuationMethodCommand } from '../dtos/change-valuation-method.command';
import { CreateTenantUseCase } from './create-tenant.use-case';
import { ChangeTenantValuationMethodUseCase } from './change-tenant-valuation-method.use-case';
import { DeactivateTenantUseCase } from './deactivate-tenant.use-case';
import type { TenantRepositoryPort } from '../ports/tenant-repository.port';
import type { TenantId } from '@modules/tenants/domain';
import {
  ShopName,
  SubscriptionPlan,
  InventoryValuationMethod,
  TenantStatus,
  Tenant,
  tenantId,
} from '@modules/tenants/domain';
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

const freeTenant = () =>
  Tenant.reconstitute({
    id: tenantId('tenant-1'),
    shopName: ShopName.of('Free Mart'),
    valuationMethod: InventoryValuationMethod.fifo(),
    subscriptionPlan: SubscriptionPlan.free(),
    status: TenantStatus.active(),
  });

const paidTenant = () =>
  Tenant.reconstitute({
    id: tenantId('tenant-1'),
    shopName: ShopName.of('Paid Mart'),
    valuationMethod: InventoryValuationMethod.fifo(),
    subscriptionPlan: SubscriptionPlan.paid(),
    status: TenantStatus.active(),
  });

const fixedIdGenerator = { nextId: (): string => 'generated-1' };

describe('Tenant use cases', () => {
  describe('CreateTenantUseCase', () => {
    it('creates a tenant with default FIFO/FREE state and resolves the id via ID_GENERATOR', async () => {
      const repository = new InMemoryTenantRepository();
      const useCase = new CreateTenantUseCase(repository, fixedIdGenerator);

      const response = await useCase.execute(new CreateTenantCommand('  Corner Shop  '));

      expect(response.id).toBe('generated-1');
      expect(response.shopName).toBe('Corner Shop');
      expect(response.valuationMethod).toBe('FIFO');
      expect(response.subscriptionPlan).toBe('FREE');
      expect(response.status).toBe('ACTIVE');
      expect(await repository.exists(tenantId('generated-1'))).toBe(true);
    });

    it('honours an explicit subscription plan', async () => {
      const repository = new InMemoryTenantRepository();
      const useCase = new CreateTenantUseCase(repository, fixedIdGenerator);

      const response = await useCase.execute(new CreateTenantCommand('Shop', 'PAID'));

      expect(response.subscriptionPlan).toBe('PAID');
    });

    it('rejects an empty shop name', async () => {
      const useCase = new CreateTenantUseCase(new InMemoryTenantRepository(), fixedIdGenerator);

      await expect(useCase.execute(new CreateTenantCommand('  '))).rejects.toThrow(InvalidShopNameError);
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
