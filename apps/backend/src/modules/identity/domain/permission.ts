import { PermissionKey } from './value-objects/permission-key.js';

/**
 * A stable access capability (IAM-004; doc 09-domain/01 section 2).
 *
 * A Permission is one thing a user *may* be allowed to do — `company.read`,
 * `user.manage` — named by a deterministic {@link PermissionKey}. It is a
 * platform-level capability, not tenant data: the identity of "read the company
 * profile" is the same in every tenant, and what differs per tenant is only which
 * roles hold it. That is why the catalog below is shared and immutable rather
 * than stored per tenant, and why roles reference keys rather than copies of
 * them.
 *
 * The catalog is deliberately small and is extended by the domain that owns a
 * capability, not by tenants: "business-specific permission sets should only be
 * introduced when required by the relevant Domain" (the issue's own rule).
 * Accounting, purchase and other business capabilities arrive with their modules;
 * this issue defines only the access-management capabilities the identity/session
 * domain itself needs.
 *
 * The identifier of a permission is its key. A key is the stable, human-readable
 * name a policy and a configuration file both use, and a second surrogate id
 * would only add a value to translate between; uniqueness is enforced over the
 * whole catalog at module load and re-checked by a test.
 */
export class Permission {
  /** The stable, deterministic capability name. */
  public readonly key: PermissionKey;

  /** A short human-readable description of what the capability allows. */
  public readonly description: string;

  public constructor(key: PermissionKey, description: string) {
    this.key = key;
    this.description = description;
  }

  /** The key as a plain string, convenient for mapping and logging. */
  public permissionKey(): string {
    return this.key.value;
  }

  /** Two permissions are the same capability when their keys match. */
  public equals(other: Permission): boolean {
    return other instanceof Permission && this.key.equals(other.key);
  }

  public toString(): string {
    return `Permission(${this.key.value})`;
  }
}

/**
 * The base access-management capabilities this issue introduces.
 *
 * `company.*` and `user.*` follow the issue's examples; `role.*` covers the new
 * role/permission administration itself. Nothing business-specific
 * (`purchase.create`, …) is added here: those permissions belong to the modules
 * that own the domain rules and are introduced with them.
 */
export const PERMISSION_CATALOG: readonly Permission[] = Object.freeze([
  new Permission(PermissionKey.from('company.read'), 'Read the company (tenant) profile.'),
  new Permission(PermissionKey.from('company.update'), 'Update the company (tenant) profile.'),
  new Permission(PermissionKey.from('user.read'), 'Read the users of a company.'),
  new Permission(PermissionKey.from('user.manage'), 'Create and update the users of a company.'),
  new Permission(PermissionKey.from('role.read'), 'Read roles and their permissions.'),
  new Permission(PermissionKey.from('role.manage'), 'Create roles and change their permissions.'),
]);

/** The catalog indexed by key, built once so lookups are constant time. */
const CATALOG_BY_KEY = new Map<string, Permission>(
  PERMISSION_CATALOG.map((permission) => [permission.key.value, permission]),
);

/** The capability registered under `key`, or `undefined` when none is. */
export function findPermission(key: PermissionKey): Permission | undefined {
  return CATALOG_BY_KEY.get(key.value);
}

/** Whether the catalog defines this capability at all. */
export function isKnownPermission(key: PermissionKey): boolean {
  return CATALOG_BY_KEY.has(key.value);
}
