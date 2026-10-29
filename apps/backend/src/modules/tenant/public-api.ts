/**
 * The only entry point other modules may import from the tenant module (TNT-004).
 * Anything not exported here is a Tenant internal; `deps:check` enforces it.
 */
export { TenantModule } from './infrastructure/tenant.module.js';

// The creation contract, published for the development seeder (DEV-001): an
// example company is established through the ordinary use case — including its
// owner enrollment — instead of by writing tenant rows.
export { CreateTenant } from './application/commands/create-tenant.command.js';
export { CreateTenantUseCase } from './application/use-cases/create-tenant.use-case.js';
export {
  ACTIVE_COMPANY_SELECTION,
  TENANT_CONTEXT,
  TENANT_DIRECTORY,
  TENANT_EVENT_RECORDER,
  TENANT_OWNER_ENROLLMENT,
} from './application/tenant.tokens.js';
export type { ActiveCompanySelectionPort } from './application/ports/active-company-selection.port.js';
export type { TenantContextAccessor } from './application/ports/tenant-context.port.js';
export type { TenantDirectory } from './application/ports/tenant-directory.port.js';
export type { TenantEventRecorder } from './application/ports/tenant-event-recorder.port.js';
export type { TenantOwnerEnrollment } from './application/ports/tenant-owner-enrollment.port.js';
export type { ActiveCompanySelection } from './application/views/active-company-selection.view.js';
export type {
  AvailableTenantContext,
  TenantContext,
} from '../../shared/tenant/tenant-context.js';
