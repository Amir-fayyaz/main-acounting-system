import { EntityId } from '../../../../shared/id/entity-id.js';

/**
 * The tenant identifier (IAM-001; ADR-002 section 10).
 *
 * A tenant is the root business boundary, so its identity is deliberately the
 * *shared* {@link EntityId} rather than a value object of its own: one UUID
 * referenced by every module that carries a tenant scope. Reusing the kernel
 * primitive is what keeps the tenant id compatible with the tenant context —
 * an `EntityId` value is exactly the opaque identifier
 * `createTenantContext(...)` accepts, so there is no second identifier shape
 * for the same boundary (SHR-007).
 *
 * The alias is nominal only: it makes a `TenantId` read as a tenant at a call
 * site without introducing a parallel identity mechanism. The identifier is
 * generated once, on creation, and never changes; a tenant's id is never
 * reused for another tenant (the database enforces this through its primary
 * key, and nothing in this module writes a new record over an existing id).
 */
export type TenantId = EntityId;

/** Generates a fresh, globally unique tenant identity. */
export function generateTenantId(): TenantId {
  return EntityId.generate();
}

/** Wraps an existing tenant identity, e.g. one read from storage. */
export function tenantIdFrom(value: string): TenantId {
  return EntityId.from(value);
}

/** Whether `value` is a well-formed tenant identity. */
export function isTenantId(value: string): boolean {
  return EntityId.isValid(value);
}
