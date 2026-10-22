/**
 * The only entry point other modules may import from the tenant module (TNT-004).
 * Anything not exported here is a Tenant internal; `deps:check` enforces it.
 */
export { TenantModule } from './infrastructure/tenant.module.js';
export { TENANT_CONTEXT, TENANT_DIRECTORY } from './application/tenant.tokens.js';
export type { TenantContextAccessor } from './application/ports/tenant-context.port.js';
export type { TenantDirectory } from './application/ports/tenant-directory.port.js';
export type {
  AvailableTenantContext,
  TenantContext,
} from '../../shared/tenant/tenant-context.js';