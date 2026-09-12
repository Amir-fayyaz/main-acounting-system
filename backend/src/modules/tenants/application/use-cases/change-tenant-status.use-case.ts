import { Inject, Injectable } from '@nestjs/common';
import { EVENT_PUBLISHER, InvalidValueError, type EventPublisher } from '@accounting-saas/ddd-core';
import { NotFoundError } from '@shared/domain/errors/not-found.error';
import type { Tenant } from '@modules/tenants/domain';
import type { ChangeTenantStatusCommand } from '../dtos/change-tenant-status.command';
import type { TenantResponseDto } from '../dtos/tenant-response.dto';
import { toTenantResponse } from './tenant-response.mapper';
import type { TenantRepositoryPort } from '../ports/tenant-repository.port';

/**
 * Changes a tenant's lifecycle status through the aggregate's domain methods
 * (`suspend` / `reactivate`), so state transitions stay guarded and raise
 * `TenantStatusChangedDomainEvent` (issue #24).
 */
@Injectable()
export class ChangeTenantStatusUseCase {
  constructor(
    private readonly repository: TenantRepositoryPort,
    @Inject(EVENT_PUBLISHER) private readonly eventPublisher: EventPublisher,
  ) {}

  async execute(command: ChangeTenantStatusCommand): Promise<TenantResponseDto> {
    if (command.status !== 'SUSPENDED' && command.status !== 'ACTIVE') {
      throw new InvalidValueError('Status must be ACTIVE or SUSPENDED');
    }

    const tenant = await this.repository.findById(command.tenantId);
    if (tenant === null) {
      throw new NotFoundError('Tenant not found');
    }

    if (command.status === 'SUSPENDED') {
      tenant.suspend(command.reason);
    } else {
      tenant.reactivate();
    }
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
