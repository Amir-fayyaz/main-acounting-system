/**
 * The published tenant contract other modules use to confirm a tenant identity
 * refers to a tenant that exists (IAM-001; IAM-003; ADR-002 section 12).
 *
 * A module that owns tenant-scoped data (a membership, a financial record) must
 * not read the tenant module's table, adapter or entity to ask that question —
 * cross-module persistence access is exactly what the module boundary forbids.
 * What it *may* depend on is a published contract, and this is the one: a single
 * existence question answered over the tenant's stable identity, with no tenant
 * business data and no storage vocabulary leaking out.
 *
 * The contract states *existence*, not *state*: whether a tenant is active is
 * the tenant module's own business, and the membership relationship is created
 * against a tenant that exists — the later authentication/authorization flow is
 * what will decide whether a user may *enter* it. Keeping the question this
 * narrow is deliberate: a wider tenant contract here would couple every caller
 * to tenant lifecycle rules it does not own.
 *
 * The implementation lives behind the `TENANT_DIRECTORY` token and is provided
 * by the tenant module, so callers inject the contract and never a repository.
 */
export interface TenantDirectory {
  /**
   * Whether a tenant with the given stable identity exists.
   *
   * A malformed identifier is answered `false` rather than thrown: the caller
   * is asking a yes/no question about an opaque value it received, and "no such
   * tenant" is the honest answer for a value that could never name one.
   */
  exists(tenantId: string): Promise<boolean>;
}
