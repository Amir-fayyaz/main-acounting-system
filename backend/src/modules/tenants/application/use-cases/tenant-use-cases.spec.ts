import { ConflictError } from '@accounting-saas/ddd-core';
import { CreateTenantCommand } from '../dtos/create-tenant.command';
import { ChangeValuationMethodCommand } from '../dtos/change-valuation-method.command';
import { ChangeTenantStatusCommand } from '../dtos/change-tenant-status.command';
import { UpdateTaxInfoCommand } from '../dtos/update-tax-info.command';
import { CreateTenantUseCase } from './create-tenant.use-case';
import { ChangeTenantValuationMethodUseCase } from './change-tenant-valuation-method.use-case';
import { ChangeTenantStatusUseCase } from './change-tenant-status.use-case';
import { UpdateTenantTaxInfoUseCase } from './update-tenant-tax-info.use-case';
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
import { InvalidValueError } from '@accounting-saas/ddd-core';
import { NotFoundError } from '@shared/domain/errors/not-found.error';
import { InvalidShopNameError, TenantAlreadyDeactivatedError } from '@modules/tenants/domain';
import { SubscriptionPolicyService } from '../services/subscription-policy.service';
import { InvalidStateError } from '@shared/domain/invalid-state.error';

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

const suspendedTenant = () => {
  const tenant = freeTenant();
  tenant.suspend('Unpaid subscription');
  tenant.clearEvents();
  return tenant;
};

const deactivatedTenant = () => {
  const tenant = freeTenant();
  tenant.deactivate();
  tenant.clearEvents();
  return tenant;
};

const fixedIdGenerator = { nextId: (): string => 'generated-1' };

/** Mock of the application repository port (issue #24: mocked, not in-memory). */
const repositoryFactory = (behavior: Partial<TenantRepositoryPort> = {}) => {
  const save = jest.fn<Promise<void>, []>().mockResolvedValue(undefined);
  const findById = jest.fn<Promise<Tenant | null>, [TenantId]>().mockResolvedValue(null);
  const existsByNationalId = jest.fn<Promise<boolean>, [string]>().mockResolvedValue(false);
  const repository: TenantRepositoryPort = { save, findById, existsByNationalId, ...behavior };
  return { repository, save, findById, existsByNationalId };
};

/** Resolves with the given tenant without triggering the require-await rule. */
const resolvesTo = (tenant: Tenant): Promise<Tenant | null> => Promise.resolve(tenant);

/** Mock of the EVENT_PUBLISHER port capturing published domain events. */
const eventBus = {
  publish: jest.fn<Promise<void>, [unknown]>().mockResolvedValue(undefined),
};

describe('Tenant use cases', () => {
  beforeEach(() => {
    eventBus.publish.mockClear();
  });

  describe('CreateTenantUseCase', () => {
    it('creates a tenant with legal identity and default FIFO/FREE state', async () => {
      const { repository, save } = repositoryFactory();
      const useCase = new CreateTenantUseCase(repository, fixedIdGenerator, eventBus);

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
      expect(save).toHaveBeenCalledTimes(1);
    });

    it('checks uniqueness by national ID before creating', async () => {
      const { repository, save } = repositoryFactory({
        existsByNationalId: () => Promise.resolve(true),
      });
      const useCase = new CreateTenantUseCase(repository, fixedIdGenerator, eventBus);

      await expect(
        useCase.execute(new CreateTenantCommand('Shop', 'Shop LLC', '1234567890', 'IRR')),
      ).rejects.toThrow(ConflictError);
      expect(save).not.toHaveBeenCalled();
    });

    it('dispatches the TenantCreatedDomainEvent after saving', async () => {
      const { repository } = repositoryFactory();
      const useCase = new CreateTenantUseCase(repository, fixedIdGenerator, eventBus);

      await useCase.execute(new CreateTenantCommand('Shop', 'Shop LLC', '1234567890', 'IRR'));

      expect(eventBus.publish).toHaveBeenCalledTimes(1);
      const event = eventBus.publish.mock.calls[0][0] as {
        eventName: string;
        legalName: string;
        baseCurrency: string;
      };
      expect(event.eventName).toBe('TenantCreated');
      expect(event.legalName).toBe('Shop LLC');
      expect(event.baseCurrency).toBe('IRR');
    });

    it('honours an explicit subscription plan', async () => {
      const { repository } = repositoryFactory();
      const useCase = new CreateTenantUseCase(repository, fixedIdGenerator, eventBus);

      const response = await useCase.execute(
        new CreateTenantCommand('Shop', 'Shop LLC', '1234567890', 'IRR', 'PAID'),
      );

      expect(response.subscriptionPlan).toBe('PAID');
    });

    it('rejects an empty shop name', async () => {
      const { repository } = repositoryFactory();
      const useCase = new CreateTenantUseCase(repository, fixedIdGenerator, eventBus);

      await expect(
        useCase.execute(new CreateTenantCommand('  ', 'Shop LLC', '1234567890', 'IRR')),
      ).rejects.toThrow(InvalidShopNameError);
    });

    it('rejects an invalid national ID', async () => {
      const { repository } = repositoryFactory();
      const useCase = new CreateTenantUseCase(repository, fixedIdGenerator, eventBus);

      await expect(
        useCase.execute(new CreateTenantCommand('Shop', 'Shop LLC', 'BAD', 'IRR')),
      ).rejects.toThrow(InvalidValueError);
    });

    it('rejects an unsupported currency', async () => {
      const { repository } = repositoryFactory();
      const useCase = new CreateTenantUseCase(repository, fixedIdGenerator, eventBus);

      await expect(
        useCase.execute(new CreateTenantCommand('Shop', 'Shop LLC', '1234567890', 'XYZ')),
      ).rejects.toThrow(InvalidValueError);
    });
  });

  describe('ChangeTenantValuationMethodUseCase', () => {
    it('switches the valuation method of an existing PAID tenant to LIFO', async () => {
      const { repository, save } = repositoryFactory({ findById: () => resolvesTo(paidTenant()) });
      const useCase = new ChangeTenantValuationMethodUseCase(
        repository,
        new SubscriptionPolicyService(),
        eventBus,
      );

      const response = await useCase.execute(new ChangeValuationMethodCommand(tenantId('tenant-1'), 'LIFO'));

      expect(response.valuationMethod).toBe('LIFO');
      expect(response.id).toBe('tenant-1');
      expect(save).toHaveBeenCalledTimes(1);
      expect(eventBus.publish).toHaveBeenCalledTimes(1);
    });

    it('allows a FREE-plan tenant to keep FIFO valuation', async () => {
      const { repository } = repositoryFactory({ findById: () => resolvesTo(freeTenant()) });
      const useCase = new ChangeTenantValuationMethodUseCase(
        repository,
        new SubscriptionPolicyService(),
        eventBus,
      );

      const response = await useCase.execute(new ChangeValuationMethodCommand(tenantId('tenant-1'), 'FIFO'));

      expect(response.valuationMethod).toBe('FIFO');
      expect(eventBus.publish).not.toHaveBeenCalled();
    });

    it('rejects LIFO for a FREE-plan tenant via the subscription policy', async () => {
      const { repository, save } = repositoryFactory({ findById: () => resolvesTo(freeTenant()) });
      const useCase = new ChangeTenantValuationMethodUseCase(
        repository,
        new SubscriptionPolicyService(),
        eventBus,
      );

      await expect(
        useCase.execute(new ChangeValuationMethodCommand(tenantId('tenant-1'), 'LIFO')),
      ).rejects.toThrow(InvalidStateError);
      expect(save).not.toHaveBeenCalled();
    });

    it('throws NotFound when the tenant does not exist', async () => {
      const { repository } = repositoryFactory();
      const useCase = new ChangeTenantValuationMethodUseCase(
        repository,
        new SubscriptionPolicyService(),
        eventBus,
      );

      await expect(
        useCase.execute(new ChangeValuationMethodCommand(tenantId('missing'), 'LIFO')),
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('ChangeTenantStatusUseCase', () => {
    it('suspends an active tenant with a reason and dispatches the status event', async () => {
      const { repository, save } = repositoryFactory({ findById: () => resolvesTo(freeTenant()) });
      const useCase = new ChangeTenantStatusUseCase(repository, eventBus);

      const response = await useCase.execute(
        new ChangeTenantStatusCommand(tenantId('tenant-1'), 'SUSPENDED', 'Unpaid subscription'),
      );

      expect(response.status).toBe('SUSPENDED');
      expect(save).toHaveBeenCalledTimes(1);
      expect(eventBus.publish).toHaveBeenCalledTimes(1);
      const event = eventBus.publish.mock.calls[0][0] as {
        eventName: string;
        previousStatus: string;
        newStatus: string;
        reason: string;
      };
      expect(event.eventName).toBe('TenantStatusChanged');
      expect(event.previousStatus).toBe('ACTIVE');
      expect(event.newStatus).toBe('SUSPENDED');
      expect(event.reason).toBe('Unpaid subscription');
    });

    it('reactivates a suspended tenant', async () => {
      const { repository } = repositoryFactory({ findById: () => resolvesTo(suspendedTenant()) });
      const useCase = new ChangeTenantStatusUseCase(repository, eventBus);

      const response = await useCase.execute(
        new ChangeTenantStatusCommand(tenantId('tenant-1'), 'ACTIVE', 'Reactivation'),
      );

      expect(response.status).toBe('ACTIVE');
      const event = eventBus.publish.mock.calls[0][0] as {
        previousStatus: string;
        newStatus: string;
      };
      expect(event.previousStatus).toBe('SUSPENDED');
      expect(event.newStatus).toBe('ACTIVE');
    });

    it('rejects an invalid target status', async () => {
      const { repository, save } = repositoryFactory();
      const useCase = new ChangeTenantStatusUseCase(repository, eventBus);

      await expect(
        useCase.execute(new ChangeTenantStatusCommand(tenantId('tenant-1'), 'ARCHIVED', 'nope')),
      ).rejects.toThrow(InvalidValueError);
      expect(save).not.toHaveBeenCalled();
    });

    it('throws NotFound when the tenant does not exist', async () => {
      const { repository } = repositoryFactory();
      const useCase = new ChangeTenantStatusUseCase(repository, eventBus);

      await expect(
        useCase.execute(new ChangeTenantStatusCommand(tenantId('missing'), 'SUSPENDED', 'why')),
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('UpdateTenantTaxInfoUseCase', () => {
    it('updates the tax identity of an active tenant', async () => {
      const { repository, save } = repositoryFactory({ findById: () => resolvesTo(freeTenant()) });
      const useCase = new UpdateTenantTaxInfoUseCase(repository, eventBus);

      const response = await useCase.execute(
        new UpdateTaxInfoCommand(tenantId('tenant-1'), 'New Name LLC', '0987654321'),
      );

      expect(response.legalName).toBe('New Name LLC');
      expect(response.nationalId).toBe('0987654321');
      expect(save).toHaveBeenCalledTimes(1);
    });

    it('rejects an invalid national ID without saving', async () => {
      const { repository, save } = repositoryFactory({ findById: () => resolvesTo(freeTenant()) });
      const useCase = new UpdateTenantTaxInfoUseCase(repository, eventBus);

      await expect(
        useCase.execute(new UpdateTaxInfoCommand(tenantId('tenant-1'), 'New Name LLC', 'BAD')),
      ).rejects.toThrow(InvalidValueError);
      expect(save).not.toHaveBeenCalled();
    });

    it('rejects tax info updates for a suspended tenant', async () => {
      const { repository, save } = repositoryFactory({ findById: () => resolvesTo(suspendedTenant()) });
      const useCase = new UpdateTenantTaxInfoUseCase(repository, eventBus);

      await expect(
        useCase.execute(new UpdateTaxInfoCommand(tenantId('tenant-1'), 'New Name LLC', '0987654321')),
      ).rejects.toThrow(InvalidStateError);
      expect(save).not.toHaveBeenCalled();
    });

    it('throws NotFound when the tenant does not exist', async () => {
      const { repository } = repositoryFactory();
      const useCase = new UpdateTenantTaxInfoUseCase(repository, eventBus);

      await expect(
        useCase.execute(new UpdateTaxInfoCommand(tenantId('missing'), 'New Name LLC', '0987654321')),
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('DeactivateTenantUseCase', () => {
    it('deactivates an existing tenant and dispatches both events', async () => {
      const { repository } = repositoryFactory({ findById: () => resolvesTo(freeTenant()) });
      const useCase = new DeactivateTenantUseCase(repository, eventBus);

      const response = await useCase.execute(tenantId('tenant-1'));

      expect(response.status).toBe('DEACTIVATED');
      expect(eventBus.publish).toHaveBeenCalledTimes(2);
      const [statusEvent, deactivatedEvent] = eventBus.publish.mock.calls.map(
        (call) => call[0] as { eventName: string },
      );
      expect(statusEvent.eventName).toBe('TenantStatusChanged');
      expect(deactivatedEvent.eventName).toBe('TenantDeactivated');
    });

    it('throws NotFound when the tenant does not exist', async () => {
      const { repository } = repositoryFactory();
      const useCase = new DeactivateTenantUseCase(repository, eventBus);

      await expect(useCase.execute(tenantId('missing'))).rejects.toThrow(NotFoundError);
    });

    it('rejects deactivating an already deactivated tenant', async () => {
      const { repository } = repositoryFactory({ findById: () => resolvesTo(deactivatedTenant()) });
      const useCase = new DeactivateTenantUseCase(repository, eventBus);

      await expect(useCase.execute(tenantId('tenant-1'))).rejects.toThrow(TenantAlreadyDeactivatedError);
    });
  });
});
