/**
 * Strongly-typed identifier for tenants. The brand prevents accidental
 * cross-assignment of unrelated string identifiers without forcing a runtime
 * wrapper (matches the UserId pattern in the identity module).
 */
export type TenantId = string & { readonly __brand: 'TenantId' };

/** Factory helper for trusted call sites that already hold a validated id. */
export const tenantId = (value: string): TenantId => value as TenantId;
