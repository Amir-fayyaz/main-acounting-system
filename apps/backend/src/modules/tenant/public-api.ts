/**
 * The only entry point other modules may import from the tenant module (TNT-004).
 * Anything not exported here is a Tenant internal.
 */
export { TenantModule } from './infrastructure/tenant.module.js';
export { TENANT_DIRECTORY } from './application/tenant.tokens.js';
export * from './application/ports/tenant-directory.port.js';