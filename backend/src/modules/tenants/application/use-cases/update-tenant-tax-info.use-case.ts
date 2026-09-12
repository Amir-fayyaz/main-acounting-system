import { Inject, Injectable } from '@nestjs/common';
import { EVENT_PUBLISHER, type EventPublisher } from '@accounting-saas/ddd-core';
import { NotFoundError } from '@shared/domain/errors/not-found.error';
import type { Tenant } from '@modules/tenants/domain';
import { TaxInfo } from '@modules/tenants/domain';
import type { UpdateTaxInfoCommand } from '../dtos/update-tax-info.command';
import type { TenantResponseDto } from '../dtos/tenant-response.dto';
import { toTenantResponse } from './tenant-response.mapper';
import type { TenantRepositoryPort } from '../ports/tenant-repository.port';

/**
 * Updates a tenant's legal tax identity (issue #24). The aggregate enforces
 * that only an ACTIVE tenant may change its tax info.
 */
@Injectable()
export class UpdateTenantTaxInfoUseCase {
  constructor(
    private readonly repository: TenantRepositoryPort,
    @Inject(EVENT_PUBLISHER) private readonly eventPublisher: EventPublisher,
  ) {}

  async execute(command: UpdateTaxInfoCommand): Promise<TenantResponseDto> {
    const tenant = await this.repository.findById(command.tenantId);
    if (tenant === null) {
      throw new NotFoundError('Tenant not found');
    }

    tenant.updateTaxInfo(TaxInfo.of({ legalName: command.legalName, nationalId: command.nationalId }));
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
