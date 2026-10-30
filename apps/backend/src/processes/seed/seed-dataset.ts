/**
 * The deterministic development/test dataset (DEV-001).
 *
 * Everything the seeder creates is declared here, once, as plain data:
 *
 * - **Stable keys.** A fixture key identifies a record across runs. Users and
 *   roles have natural unique keys (email, role name within a tenant); a tenant
 *   does not, so its key is recorded in the seed registry the first time it is
 *   created.
 * - **Registered capabilities only.** A role's permissions are keys from the
 *   Identity permission catalog (`PERMISSION_CATALOG`). The seeder never adds a
 *   capability; if a key here is not registered the run fails instead of
 *   silently seeding authority nobody defined.
 * - **Reserved domain.** Synthetic users use the reserved `.test` TLD, so a
 *   fixture can never collide with a real mailbox.
 * - **No platform authority.** No seeded tenant role holds `system-admin`; that
 *   role is platform-level and belongs to the Product Owner alone (DEV-001
 *   section 3). The Product Owner is deliberately *not* a member of the seeded
 *   tenants: its access comes from platform authorization, not membership.
 */

/** One synthetic user of one tenant. */
export interface SeedUserFixture {
  /** Stable fixture key, for reporting and for a readable registry row. */
  readonly fixtureKey: string;
  readonly displayName: string;
  /** A reserved `.test` address — never a real mailbox. */
  readonly email: string;
  /** The role of the tenant this user belongs to, by role key. */
  readonly roleKey: string;
}

/** One tenant-owned role the seeder creates. */
export interface SeedRoleFixture {
  /** Stable fixture key, not the role name. */
  readonly fixtureKey: string;
  /** The role name, unique within its tenant. */
  readonly name: string;
  /** The registered capability keys the role grants. */
  readonly permissions: readonly string[];
}

/** One example tenant and the synthetic people who work in it. */
export interface SeedTenantFixture {
  /** Stable fixture key, recorded so a rerun reuses the same tenant. */
  readonly fixtureKey: string;
  /** The company's display name. */
  readonly name: string;
  readonly users: readonly SeedUserFixture[];
}

/**
 * The tenant-level roles every example company gets.
 *
 * Two roles, deliberately far apart: an administrator that holds the full
 * access-management set, and an accountant that may only read the company. The
 * difference is what makes the seeded data useful for authorization tests — a
 * restricted user really is restricted, and an administrator of one company
 * still has no access to another.
 */
export const SEED_ROLES: readonly SeedRoleFixture[] = Object.freeze([
  Object.freeze({
    fixtureKey: 'role.tenant-administrator',
    name: 'Tenant Administrator',
    permissions: Object.freeze([
      'company.read',
      'company.update',
      'user.read',
      'user.manage',
      'role.read',
      'role.manage',
      'audit.read',
    ]),
  }),
  Object.freeze({
    fixtureKey: 'role.accountant',
    name: 'Accountant',
    permissions: Object.freeze(['company.read']),
  }),
]);

/**
 * Two example companies with distinct identities.
 *
 * They are separate tenants with separate memberships, so a developer can
 * exercise company switching, tenant-scoped reads and writes, and cross-tenant
 * denial: the administrator of the first company is not a member of the second.
 */
export const SEED_TENANTS: readonly SeedTenantFixture[] = Object.freeze([
  Object.freeze({
    fixtureKey: 'tenant.aria-trading',
    name: 'بازرگانی آریا',
    users: Object.freeze([
      Object.freeze({
        fixtureKey: 'user.aria.administrator',
        displayName: 'نیلوفر احمدی',
        email: 'aria.administrator@example.test',
        roleKey: 'role.tenant-administrator',
      }),
      Object.freeze({
        fixtureKey: 'user.aria.accountant',
        displayName: 'رضا کریمی',
        email: 'aria.accountant@example.test',
        roleKey: 'role.accountant',
      }),
    ]),
  }),
  Object.freeze({
    fixtureKey: 'tenant.pars-industrial',
    name: 'گروه صنعتی پارس',
    users: Object.freeze([
      Object.freeze({
        fixtureKey: 'user.pars.administrator',
        displayName: 'سارا موسوی',
        email: 'pars.administrator@example.test',
        roleKey: 'role.tenant-administrator',
      }),
      Object.freeze({
        fixtureKey: 'user.pars.accountant',
        displayName: 'امیر رستمی',
        email: 'pars.accountant@example.test',
        roleKey: 'role.accountant',
      }),
    ]),
  }),
]);

/**
 * The credential every seeded user is created with.
 *
 * It is a development fixture, not a default: it is only ever applied when the
 * seeder *creates* a user, never to an existing identity, and it is refused in
 * production together with the whole command. The value is documented in the
 * backend README so a developer can sign in as a seeded user.
 */
export const SEED_USER_PASSWORD = 'Seed-user-password-1!';
