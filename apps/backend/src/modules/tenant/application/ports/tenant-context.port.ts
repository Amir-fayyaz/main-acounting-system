import type {
  AvailableTenantContext,
  TenantContext,
} from '../../../../shared/tenant/tenant-context.js';

/**
 * The published contract for reading the ambient tenant boundary (TNT-004;
 * SHR-007).
 *
 * It only *reads* the scope a trusted boundary established; it can never choose
 * or widen a tenant. Without an available scope, `require*` fail closed.
 */
export interface TenantContextAccessor {
  /** The current context: available, system or missing. */
  current(): TenantContext;

  /** The available context. @throws TenantContextMissingError when missing or system. */
  require(): AvailableTenantContext;

  /** The current tenant id, or `undefined` when no tenant scope is established. */
  currentTenantId(): string | undefined;

  /** The current tenant id. @throws TenantContextMissingError when missing or system. */
  requireTenantId(): string;
}