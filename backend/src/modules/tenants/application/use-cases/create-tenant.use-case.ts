import { Inject, Injectable } from '@nestjs/common';
import { ID_GENERATOR, type IdGenerator } from '@shared/domain/providers/id-generator.provider';
import { ShopName, SubscriptionPlan, Tenant, tenantId } from '@modules/tenants/domain';
import type { CreateTenantCommand } from '../dtos/create-tenant.command';
import type { TenantResponseDto } from '../dtos/tenant-response.dto';
import { toTenantResponse } from './tenant-response.mapper';
import type { TenantRepositoryPort } from '../ports/tenant-repository.port';

@Injectable()
export class CreateTenantUseCase {
  constructor(
    private readonly repository: TenantRepositoryPort,
    @Inject(ID_GENERATOR) private readonly idGenerator: IdGenerator,
  ) {}

  async execute(command: CreateTenantCommand): Promise<TenantResponseDto> {
    const tenant = Tenant.create({
      id: tenantId(this.idGenerator.nextId()),
      shopName: ShopName.of(command.shopName),
      subscriptionPlan: command.subscriptionPlan
        ? SubscriptionPlan.of(command.subscriptionPlan)
        : SubscriptionPlan.free(),
    });

    await this.repository.save(tenant);

    return toTenantResponse(tenant);
  }
}
