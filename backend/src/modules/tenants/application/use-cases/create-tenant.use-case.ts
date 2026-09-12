import { Inject, Injectable } from '@nestjs/common';
import { ConflictError, EVENT_PUBLISHER, type EventPublisher } from '@accounting-saas/ddd-core';
import { ID_GENERATOR, type IdGenerator } from '@shared/domain/providers/id-generator.provider';
import { Currency, ShopName, SubscriptionPlan, TaxInfo, Tenant, tenantId } from '@modules/tenants/domain';
import type { CreateTenantCommand } from '../dtos/create-tenant.command';
import type { TenantResponseDto } from '../dtos/tenant-response.dto';
import { toTenantResponse } from './tenant-response.mapper';
import type { TenantRepositoryPort } from '../ports/tenant-repository.port';

@Injectable()
export class CreateTenantUseCase {
  constructor(
    private readonly repository: TenantRepositoryPort,
    @Inject(ID_GENERATOR) private readonly idGenerator: IdGenerator,
    @Inject(EVENT_PUBLISHER) private readonly eventPublisher: EventPublisher,
  ) {}

  async execute(command: CreateTenantCommand): Promise<TenantResponseDto> {
    const taxInfo = TaxInfo.of({ legalName: command.legalName, nationalId: command.nationalId });

    if (await this.repository.existsByNationalId(taxInfo.nationalId)) {
      throw new ConflictError(`A tenant with national ID ${taxInfo.nationalId} already exists`);
    }

    const tenant = Tenant.create({
      id: tenantId(this.idGenerator.nextId()),
      shopName: ShopName.of(command.shopName),
      taxInfo,
      baseCurrency: Currency.of(command.baseCurrency),
      subscriptionPlan: command.subscriptionPlan
        ? SubscriptionPlan.of(command.subscriptionPlan)
        : SubscriptionPlan.free(),
    });

    await this.repository.save(tenant);
    await this.dispatchEventsOf(tenant);

    return toTenantResponse(tenant);
  }

  private async dispatchEventsOf(tenant: Tenant): Promise<void> {
    for (const event of tenant.getDomainEvents()) {
      await this.eventPublisher.publish(event);
    }
    tenant.clearEvents();
  }
}
