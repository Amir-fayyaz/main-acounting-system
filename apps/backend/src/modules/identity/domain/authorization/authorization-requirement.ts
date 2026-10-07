import { PermissionKey } from '../value-objects/permission-key.js';

/**
 * What a protected operation requires before it may run (IAM-006; ADR-010
 * sections 3 and 13).
 *
 * An operation does not *contain* an access rule — it *states* one, in the
 * vocabulary IAM-004 established, and the authorization layer decides. Two
 * pieces make the statement complete:
 *
 * - the **capability** — a stable `PermissionKey` (`role.manage`,
 *   `purchase.create`), the same identity a role holds and a policy names;
 * - whether the operation is **tenant-scoped** — whether acting requires an
 *   active membership in the tenant the operation targets.
 *
 * That second flag is what keeps the two product rules the architecture
 * distinguishes apart (ADR-010 section 3): *action-level* authorization ("may
 * this subject perform this capability") and *tenant-level* authorization ("may
 * this subject enter this company"). `permissionRequirement('user.manage')` is
 * the first; `tenantPermissionRequirement('role.manage')` is both — capability
 * and membership.
 *
 * The requirement is data, not a decision: nothing here grants, denies or reads
 * anything. `decideAuthorization` consumes it together with the evidence the
 * application resolved (see `authorization-policy.ts`).
 */
export interface AuthorizationRequirement {
  /** The capability the operation needs. */
  readonly permission: PermissionKey;
  /** Whether an active membership in the operation's target tenant is required. */
  readonly tenantScoped: boolean;
}

/** A requirement for a capability that is not owned by one tenant. */
export function permissionRequirement(permission: PermissionKey): AuthorizationRequirement {
  return Object.freeze({ permission, tenantScoped: false });
}

/** A requirement for a capability exercised *within* a specific tenant. */
export function tenantPermissionRequirement(permission: PermissionKey): AuthorizationRequirement {
  return Object.freeze({ permission, tenantScoped: true });
}

/** Whether `requirement` demands an active membership in a target tenant. */
export function isTenantScoped(requirement: AuthorizationRequirement): boolean {
  return requirement.tenantScoped;
}
