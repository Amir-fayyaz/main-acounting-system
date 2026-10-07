import {
  AUTHORIZATION_ALLOWED,
  authorizationDenied,
  type AuthorizationDecision,
} from './authorization-decision.js';
import type { AuthorizationEvidence } from './authorization-evidence.js';
import type { AuthorizationRequirement } from './authorization-requirement.js';
import type { PermissionKey } from '../value-objects/permission-key.js';

/**
 * The authorization decision, as a pure function (IAM-006; ADR-010 section 13).
 *
 * This is the one place the access rule lives, and it is a function of its two
 * inputs alone: no repository, no clock, no ambient context, no framework — so
 * the same evidence always yields the same decision and every branch below can
 * be asserted directly. The application resolves the evidence (membership,
 * effective permissions); this decides. The presentation layer only translates
 * the outcome.
 *
 * The evaluation is fail-closed and ordered from the most structural check to
 * the most specific, so a deny names the *first* missing precondition:
 *
 * ```text
 * tenant-scoped?  no valid tenant        → TENANT_CONTEXT_MISSING
 *                 no membership          → MEMBERSHIP_MISSING
 *                 membership is elsewhere→ CONTEXT_INCONSISTENT
 *                 membership not active  → MEMBERSHIP_INACTIVE
 * holds capability? no                   → PERMISSION_MISSING
 *                                        → allow
 * ```
 *
 * A caller authenticated in the system but not a member of the target tenant is
 * therefore denied by `MEMBERSHIP_MISSING` — the same answer a forged tenant
 * identifier gets, which is what stops the boundary from confirming that a
 * tenant exists for someone who does not belong to it.
 */
export function decideAuthorization(
  requirement: AuthorizationRequirement,
  evidence: AuthorizationEvidence,
): AuthorizationDecision {
  if (requirement.tenantScoped) {
    const target = evidence.targetTenantId;

    if (target === undefined || target.trim() === '') {
      return authorizationDenied('TENANT_CONTEXT_MISSING');
    }

    const membership = evidence.membership;

    if (membership === undefined) {
      return authorizationDenied('MEMBERSHIP_MISSING');
    }

    if (membership.tenantId !== target) {
      return authorizationDenied('CONTEXT_INCONSISTENT');
    }

    if (!membership.active) {
      return authorizationDenied('MEMBERSHIP_INACTIVE');
    }
  }

  if (!evidence.permissions.has(requirement.permission.value)) {
    return authorizationDenied('PERMISSION_MISSING');
  }

  return AUTHORIZATION_ALLOWED;
}

/**
 * Whether an already-resolved permission set holds `permission`.
 *
 * The in-memory companion of `decideAuthorization`, for a caller that resolved
 * a context once and must answer further capability questions without another
 * read — the shape a reusable contract exposes to business modules.
 */
export function permits(
  permissions: ReadonlySet<string> | readonly string[],
  permission: PermissionKey,
): boolean {
  const has = Array.isArray(permissions)
    ? (permissions as readonly string[]).includes(permission.value)
    : (permissions as ReadonlySet<string>).has(permission.value);

  return has;
}
