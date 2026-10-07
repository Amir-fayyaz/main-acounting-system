import { DomainError } from '../../../../shared/errors/domain-error.js';
import { ErrorCategory } from '../../../../shared/errors/error-category.js';
import type { AuthorizationDenialReason } from '../authorization/authorization-decision.js';

/**
 * Identity-owned authorization failures (IAM-006; ADR-010 sections 3, 9 and 13;
 * 06-security-engineering).
 *
 * The vocabulary exists to make four outcomes *distinguishable* without telling
 * a caller anything it is not entitled to know:
 *
 * | Code | Meaning |
 * | --- | --- |
 * | `AUTHORIZATION_DENIED` | The subject is authenticated but lacks the capability. |
 * | `TENANT_CONTEXT_REQUIRED` | The operation needs a valid tenant and none was supplied. |
 * | `MEMBERSHIP_REQUIRED` | The subject has no membership in the target tenant. |
 * | `MEMBERSHIP_INACTIVE` | The membership exists but is not in force. |
 * | `AUTHORIZATION_CONTEXT_INVALID` | The resolved context is inconsistent or incomplete. |
 * | `AUTHORIZATION_POLICY_MISSING` | The operation declared no authorization policy at all. |
 *
 * Two rules shape them:
 *
 * - **They are separate from authentication.** Authentication answers *who is
 *   this*; these answer *may they do this*. A caller can therefore tell "sign in"
 *   from "you may not", which is the distinction the issue requires — and none
 *   of these knows about HTTP, so the 401/403 split stays a presentation
 *   decision.
 * - **They disclose no existence.** A missing membership, an inactive one and a
 *   forged tenant all deny; the message never says whether the tenant, the
 *   record or the caller's other memberships exist, so the boundary cannot be
 *   used to probe across tenants.
 */
export class AuthorizationDeniedError extends DomainError {
  public constructor(permission?: string) {
    super(
      'AUTHORIZATION_DENIED',
      'The authenticated principal is not authorized to perform this operation.',
      {
        category: ErrorCategory.BUSINESS_RULE,
        details:
          permission === undefined
            ? undefined
            : [
                {
                  code: 'PERMISSION_REQUIRED',
                  field: 'permission',
                  message: `the operation requires "${permission}"`,
                },
              ],
      },
    );
  }
}

/** The operation is tenant-scoped and no usable tenant context was resolved. */
export class TenantContextRequiredError extends DomainError {
  public constructor() {
    super('TENANT_CONTEXT_REQUIRED', 'This operation requires a valid tenant context.', {
      category: ErrorCategory.BUSINESS_RULE,
    });
  }
}

/** The authenticated subject has no membership in the target tenant. */
export class MembershipRequiredError extends DomainError {
  public constructor() {
    super('MEMBERSHIP_REQUIRED', 'The authenticated principal is not a member of this tenant.', {
      category: ErrorCategory.BUSINESS_RULE,
    });
  }
}

/** The subject's membership in the target tenant is not in force. */
export class InactiveMembershipError extends DomainError {
  public constructor() {
    super('MEMBERSHIP_INACTIVE', 'The membership in this tenant is not active.', {
      category: ErrorCategory.BUSINESS_RULE,
    });
  }
}

/** The resolved authorization context is inconsistent or incomplete. */
export class AuthorizationContextInvalidError extends DomainError {
  public constructor() {
    super('AUTHORIZATION_CONTEXT_INVALID', 'The authorization context is not valid.', {
      category: ErrorCategory.STATE_VIOLATION,
    });
  }
}

/**
 * A protected operation was reached without declaring an authorization policy.
 *
 * This is a wiring mistake rather than a client outcome, and it denies for that
 * very reason: the safe response to "nobody stated what this operation
 * requires" is no access, not access (fail closed, ADR-010 section 13).
 */
export class AuthorizationPolicyMissingError extends DomainError {
  public constructor() {
    super(
      'AUTHORIZATION_POLICY_MISSING',
      'This operation declares no authorization policy and cannot be performed.',
      { category: ErrorCategory.STATE_VIOLATION },
    );
  }
}

/**
 * The failure that corresponds to a denied decision reason.
 *
 * `permission` only enriches the `AUTHORIZATION_DENIED` detail with the
 * capability that was missing; it is a non-secret identifier, never a grant.
 */
export function authorizationErrorFor(
  reason: AuthorizationDenialReason,
  permission?: string,
): DomainError {
  switch (reason) {
    case 'TENANT_CONTEXT_MISSING':
      return new TenantContextRequiredError();
    case 'MEMBERSHIP_MISSING':
      return new MembershipRequiredError();
    case 'MEMBERSHIP_INACTIVE':
      return new InactiveMembershipError();
    case 'CONTEXT_INCONSISTENT':
      return new AuthorizationContextInvalidError();
    case 'PERMISSION_MISSING':
      return new AuthorizationDeniedError(permission);
  }
}
