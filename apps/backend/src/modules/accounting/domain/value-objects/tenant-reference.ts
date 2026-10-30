import { EntityId } from '../../../../shared/id/entity-id.js';

/**
 * The stable identity of the Tenant that owns a fiscal year (FIS-002; SHR-007;
 * ADR-002 section 12).
 *
 * A fiscal year belongs to exactly one tenant, and the tenant is the boundary
 * its non-overlap rule is scoped by: two companies may frame the same days
 * differently, one company may not cover a day twice. The aggregate keeps only
 * the tenant's stable identity — the same opaque UUID the tenant module and the
 * shared tenant context use — and none of the tenant's business data.
 *
 * The type is the shared {@link EntityId} under a nominal alias, declared here
 * because a Domain file may reach only its own module and `src/shared/`
 * (`src/modules/module-boundaries.spec.ts`): the tenant module's Domain is not
 * importable. Because both are the same `EntityId`, the value is a valid
 * tenant boundary string for `createTenantContext(...)` with no translation,
 * and the tenant module stays the authority on whether a tenant with that id
 * exists.
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
