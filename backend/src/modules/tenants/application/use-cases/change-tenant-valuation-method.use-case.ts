import { Injectable } from '@nestjs/common';
import { NotFoundError } from '@shared/domain/errors/not-found.error';
import { InventoryValuationMethod } from '@modules/tenants/domain';
import type { ChangeValuationMethodCommand } from '../dtos/change-valuation-method.command';
import type { TenantResponseDto } from '../dtos/tenant-response.dto';
import { toTenantResponse } from './tenant-response.mapper';
import type { TenantRepositoryPort } from '../ports/tenant-repository.port';
import { SubscriptionPolicyService } from '../services/subscription-policy.service';

@Injectable()
export class ChangeTenantValuationMethodUseCase {
  constructor(
    private readonly repository: TenantRepositoryPort,
    private readonly subscriptionPolicy: SubscriptionPolicyService,
  ) {}

  async execute(command: ChangeValuationMethodCommand): Promise<TenantResponseDto> {
    const tenant = await this.repository.findById(command.tenantId);
    if (tenant === null) {
      throw new NotFoundError('Tenant not found');
    }

    this.subscriptionPolicy.assertCanUseValuationMethod(tenant.plan, command.method);
    tenant.changeValuationMethod(InventoryValuationMethod.of(command.method));
    await this.repository.save(tenant);

    return toTenantResponse(tenant);
  }
}
