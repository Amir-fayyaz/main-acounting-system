import { EntityId } from '../../../../shared/id/entity-id.js';

/**
 * The stable identity of the Tenant a Membership points at (IAM-003; SHR-007;
 * ADR-002 section 12).
 *
 * A Membership is an *access relationship*, and one of the two things it refers
 * to is a tenant. It must not become a second representation of that tenant, so
 * it keeps only the tenant's stable identity — the same opaque UUID the tenant
 * module and the shared tenant context use — and none of the tenant's business
 * data (name, status, configuration).
 *
 * The type is the shared {@link EntityId} under a nominal alias, exactly like
 * `TenantId` inside the tenant module, but declared here because the Identity
 * module must not import the tenant module's Domain: a Domain file may reach
 * only its own module and `src/shared/` (`src/modules/module-boundaries.spec.ts`).
 * Because both are the same `EntityId`, the value is a valid tenant boundary
 * string for `createTenantContext(...)` with no translation, and no second
 * identifier shape exists for the same relationship.
 *
 * The alias is nominal only: a tenant reference is a UUID, and the tenant module
 * stays the authority on whether a tenant with that id exists (`TenantDirectory`).
 */
export type TenantReference = EntityId;

/** Wraps an existing tenant reference, e.g. one read from storage. */
export function tenantReferenceFrom(value: string): TenantReference {
  return EntityId.from(value);
}

/** Whether `value` is a well-formed tenant reference. */
export function isTenantReference(value: string): boolean {
  return EntityId.isValid(value);
}
