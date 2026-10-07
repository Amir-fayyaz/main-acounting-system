import type { DomainError } from '../../../../shared/errors/domain-error.js';
import type { Result } from '../../../../shared/errors/result.js';
import type { PermissionKey } from '../../domain/value-objects/permission-key.js';
import type { AuthorizationContextView } from '../authorization/authorization-context.view.js';
import type { AuthenticatedPrincipalView } from '../views/principal.view.js';

/**
 * The reusable authorization contract (IAM-006; ADR-010 section 3;
 * 06-security-engineering).
 *
 * This is what a business module depends on to protect an operation, and what
 * keeps it from ever querying identity tables, repositories or the role model
 * itself:
 *
 * ```ts
 * // inside a purchase use case, with AUTHORIZATION injected
 * const outcome = await this.authorization.authorize({
 *   principal,
 *   requiredPermission: PermissionKey.from('purchase.create'),
 *   targetTenantId,                       // omitted for a platform capability
 * });
 * if (outcome.isFail()) return Result.fail(outcome.errorOrThrow());
 * // …only now does the protected business action run
 * ```
 *
 * Two rules define the contract:
 *
 * - **It answers in the application's vocabulary.** Input is a principal, a
 *   capability key and an optional target tenant; output is a resolved
 *   {@link AuthorizationContextView} or a `DomainError` from the authorization
 *   vocabulary. No HTTP status, no role, no membership record and no
 *   identity-storage type is ever part of it.
 * - **It fails closed.** Every path that is not a definite "yes" is a failure,
 *   and a failure must stop the caller before the protected action runs. The
 *   contract never returns a partially-resolved context or a fallback grant.
 *
 * The implementation is provided under the `AUTHORIZATION` token, so a consumer
 * injects the contract and never the use case that implements it.
 */
export interface Authorization {
  /**
   * Resolves the caller's authorization context and decides whether the
   * required capability (and, for a tenant-scoped requirement, an active
   * membership in `targetTenantId`) is satisfied.
   *
   * A malformed target tenant is *invalid tenant context*, not a lookup
   * failure: the answer never distinguishes "this tenant does not exist" from
   * "you do not belong to it".
   */
  authorize(request: AuthorizationRequest): Promise<Result<AuthorizationContextView, DomainError>>;

  /**
   * Whether an already-resolved context holds `permission`.
   *
   * Pure and synchronous: a caller that must re-check a capability while it
   * holds the context does not pay for another read, and the answer is derived
   * from the same evidence the decision used.
   */
  permits(context: AuthorizationContextView, permission: PermissionKey): boolean;
}

/** What a protected operation asks the authorization contract. */
export interface AuthorizationRequest {
  /** The authenticated subject, as the authentication boundary resolved it. */
  readonly principal: AuthenticatedPrincipalView;
  /** The capability the operation requires. */
  readonly requiredPermission: PermissionKey;
  /**
   * The tenant the operation targets. Present makes the requirement
   * tenant-scoped — the caller must have an active membership in it; absent
   * asks only the capability question, resolved across the caller's active
   * memberships.
   */
  readonly targetTenantId?: string;
}
