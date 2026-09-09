import { Injectable } from '@nestjs/common';
import { NotFoundError } from '@shared/domain/errors/not-found.error';
import type { TenantId } from '@modules/tenants/domain';
import type { TenantResponseDto } from '../dtos/tenant-response.dto';
import { toTenantResponse } from './tenant-response.mapper';
import type { TenantRepositoryPort } from '../ports/tenant-repository.port';

@Injectable()
export class DeactivateTenantUseCase {
  constructor(private readonly repository: TenantRepositoryPort) {}

  async execute(tenantId: TenantId): Promise<TenantResponseDto> {
    const tenant = await this.repository.findById(tenantId);
    if (tenant === null) {
      throw new NotFoundError('Tenant not found');
    }

    tenant.deactivate();
    await this.repository.save(tenant);

    return toTenantResponse(tenant);
  }
}
