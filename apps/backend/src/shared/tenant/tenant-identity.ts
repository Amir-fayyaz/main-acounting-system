import { EntityId } from '../id/entity-id.js';

/**
 * The canonical spelling of a tenant identifier (IAM-007; SHR-007).
 *
 * A tenant id is an opaque string at the transport level and a UUID in every
 * module that owns tenant data, and the two spellings of one UUID (`ABC…` and
 * `abc…`) are the *same* company. Without a canonical form, a scope established
 * from one spelling and a request carrying the other would look like two
 * different tenants — the request would be refused as a cross-tenant access
 * even though it names the caller's own company, and the boundary would look
 * broken rather than strict.
 *
 * The canonical form is therefore:
 *
 * - the lower-case UUID text, when the value is a UUID at all;
 * - the trimmed value itself, for any other opaque tenant identifier.
 *
 * Only *comparison* uses this. Nothing here resolves, grants or authorizes a
 * tenant: the scope remains the authority, and a client-supplied identifier is
 * still only a claim that has to match it.
 */
export function canonicalTenantId(value: string): string {
  const trimmed = value.trim();

  return EntityId.isValid(trimmed) ? EntityId.from(trimmed).value : trimmed;
}

/**
 * Whether two tenant identifiers name the same company boundary (IAM-007).
 *
 * The comparison is canonical, so the two spellings of one UUID are one
 * boundary, while two different UUIDs never are — and an identifier that is
 * not a UUID is compared exactly, because for those the spelling *is* part of
 * the identity.
 */
export function isSameTenant(left: string, right: string): boolean {
  return canonicalTenantId(left) === canonicalTenantId(right);
}
