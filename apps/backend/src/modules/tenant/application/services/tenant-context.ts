import {
  createTenantContext,
  type AvailableTenantContext,
} from '../../../../shared/tenant/tenant-context.js';
import type { TenantId } from '../../domain/value-objects/tenant-id.js';

/**
 * The one place a tenant identity becomes a tenant context (IAM-001; SHR-007;
 * ADR-001 section 13).
 *
 * A tenant *is* the tenant boundary, so the bridge is intentionally this thin:
 * it takes the tenant's id and hands it to the shared factory. There is no
 * module-local context type, no second identifier format and no fallback — the
 * tenant context abstraction is used exactly as SHR-007 defines it, and a
 * tenant id is a valid tenant id because both are the same opaque string
 * (`TenantId` is the shared `EntityId`, whose UUID text the tenant factory
 * accepts).
 *
 * Establishing the scope from a trusted boundary (the authenticated principal,
 * the Worker restoring a job, or — until authentication exists — the application
 * resolving the target of an administrative operation) remains the caller's
 * responsibility: this helper builds the context, `TenantScope.run` publishes it.
 */
export function tenantContext(
  tenantId: TenantId,
  options?: { readonly correlationId?: string },
): AvailableTenantContext {
  return createTenantContext(tenantId.value, options);
}
