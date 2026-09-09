import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { TenantRepositoryPort } from '@modules/tenants/application';
import type { Tenant, TenantId } from '@modules/tenants/domain';
import { TenantOrmEntity } from '../entities/tenant.orm-entity';
import { TenantMapper } from '../mappers/tenant.mapper';

/**
 * TypeORM adapter for the TenantRepositoryPort. Translates aggregate
 * operations into ORM persistence calls; the application layer never depends
 * on this class directly, only on the port token.
 */
@Injectable()
export class TenantTypeOrmRepository implements TenantRepositoryPort {
  constructor(
    @InjectRepository(TenantOrmEntity)
    private readonly repository: Repository<TenantOrmEntity>,
  ) {}

  async save(tenant: Tenant): Promise<void> {
    await this.repository.save(TenantMapper.toPersistence(tenant));
  }

  async findById(id: TenantId): Promise<Tenant | null> {
    const entity = await this.repository.findOne({ where: { id } });
    if (entity === null) {
      return null;
    }
    return TenantMapper.toDomain(entity);
  }

  async exists(id: TenantId): Promise<boolean> {
    return (await this.repository.count({ where: { id } })) > 0;
  }
}
