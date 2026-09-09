/**
 * Public infrastructure exports for the Tenant module: typeORM entity,
 * mapper and repository adapter.
 */
export { TenantOrmEntity } from './entities/tenant.orm-entity';
export { TenantMapper } from './mappers/tenant.mapper';
export { TenantTypeOrmRepository } from './repositories/tenant-typeorm.repository';
export { TenantHeaderInterceptor } from './interceptors/tenant-header.interceptor';
