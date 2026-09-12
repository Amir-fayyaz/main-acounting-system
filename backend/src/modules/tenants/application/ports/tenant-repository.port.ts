import type { Tenant, TenantId } from '@modules/tenants/domain';

/**
 * Application-owned persistence contract for the Tenant aggregate (issue #24).
 * The concrete adapter (TypeORM) implements this port; the application layer
 * only ever depends on this interface.
 */
export interface TenantRepositoryPort {
  save(tenant: Tenant): Promise<void>;
  findById(id: TenantId): Promise<Tenant | null>;
  existsByNationalId(nationalId: string): Promise<boolean>;
}
