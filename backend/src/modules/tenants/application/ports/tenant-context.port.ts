import type { TenantId } from '@modules/tenants/domain';

/**
 * Application port for resolving the active tenant of the current request
 * (BR-TENANT-002). The infrastructure interceptor populates it from the
 * `x-tenant-id` header; domain/application services read it without depending
 * on NestJS or HTTP primitives.
 */
export interface TenantContextPort {
  /** The tenant id bound to the current request, or null when unbound. */
  getTenantId(): TenantId | null;

  /** Bind the tenant id for the current request scope. */
  setTenantId(tenantId: TenantId): void;

  /** Clear the bound tenant id for the current request scope. */
  clear(): void;
}

/** NestJS injection token for the tenant context port. */
export const TENANT_CONTEXT_PORT = Symbol('TENANT_CONTEXT_PORT');
