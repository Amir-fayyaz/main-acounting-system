import type { DomainError } from '../../../../shared/errors/domain-error.js';
import { Result } from '../../../../shared/errors/result.js';
import { AccountNotAuthenticatableError } from '../../domain/errors/authentication.errors.js';
import type { Membership } from '../../domain/aggregates/membership.js';
import type { AuthorizationEvidence } from '../../domain/authorization/authorization-evidence.js';
import { decideAuthorization, permits } from '../../domain/authorization/authorization-policy.js';
import {
  permissionRequirement,
  tenantPermissionRequirement,
} from '../../domain/authorization/authorization-requirement.js';
import {
  AuthorizationContextInvalidError,
  TenantContextRequiredError,
  authorizationErrorFor,
} from '../../domain/errors/authorization.errors.js';
import type { MembershipRepository } from '../../domain/repositories/membership.repository.js';
import type { MembershipRoleRepository } from '../../domain/repositories/membership-role.repository.js';
import type { RoleRepository } from '../../domain/repositories/role.repository.js';
import type { UserRepository } from '../../domain/repositories/user.repository.js';
import type { PermissionKey } from '../../domain/value-objects/permission-key.js';
import { isTenantReference } from '../../domain/value-objects/tenant-reference.js';
import { isUserId, userIdFrom } from '../../domain/value-objects/user-id.js';
import type { AuthorizationContextView } from '../authorization/authorization-context.view.js';
import type { Authorization, AuthorizationRequest } from '../ports/authorization.port.js';
import { resolveEffectivePermissionKeys } from '../services/effective-permissions.js';

/**
 * Resolves an authorization context and decides one requirement (IAM-006;
 * ADR-010 sections 3, 4 and 13).
 *
 * It is the application-layer enforcement point behind the reusable
 * {@link Authorization} contract: the HTTP boundary applies it, and a use case,
 * a job or another module may call the very same implementation directly — so
 * authorization does not depend on a request having a guard, on a frontend, or
 * on HTTP existing at all.
 *
 * The flow is deliberately linear and fail-closed:
 *
 * ```text
 * subject resolves and is active?   no → not authenticatable (an authentication failure)
 * tenant-scoped?
 *   ├─ target tenant well-formed?    no → TENANT_CONTEXT_REQUIRED
 *   ├─ membership in that tenant?    no → MEMBERSHIP_REQUIRED   (also a forged tenant)
 *   └─ effective permissions of it
 * not tenant-scoped → union of the subject's active memberships
 * decision → allow, or DENIED with its reason
 * ```
 *
 * Three properties are the point:
 *
 * - **The subject is re-checked, not trusted.** Authentication proved who the
 *   caller is *earlier*; the account's current state is a property of now, so a
 *   user deactivated (or removed) after signing in stops passing here — the
 *   same rule the authentication boundary applies to sessions.
 * - **The tenant is derived, never accepted.** `targetTenantId` is only ever a
 *   claim compared against the subject's own membership; the context's tenant is
 *   the membership's tenant. A caller can therefore not grant itself a tenant by
 *   naming one, and a tenant it does not belong to is indistinguishable from one
 *   that does not exist.
 * - **Nothing is written.** A decision changes no state, raises no event and
 *   touches no credential; refusing an operation must not itself have side
 *   effects (the access-denial audit record, when the Audit capability arrives,
 *   is the boundary's concern, not a mutation this use case performs).
 */
export class AuthorizeActionUseCase implements Authorization {
  public constructor(
    private readonly users: UserRepository,
    private readonly memberships: MembershipRepository,
    private readonly assignments: MembershipRoleRepository,
    private readonly roles: RoleRepository,
  ) {}

  public async authorize(
    request: AuthorizationRequest,
  ): Promise<Result<AuthorizationContextView, DomainError>> {
    const subject = request.principal.userId;

    if (!isUserId(subject)) {
      // The principal comes from the authentication boundary, so a malformed
      // identity means the context is broken, not that the caller erred.
      return Result.fail(new AuthorizationContextInvalidError());
    }

    const userId = userIdFrom(subject);
    const found = await this.users.get(userId);

    if (found === undefined || !found.aggregate.isActive()) {
      // Who the caller is, is no longer valid: an authentication failure, told
      // apart from an authorization one (IAM-005, IAM-006).
      return Result.fail(new AccountNotAuthenticatableError());
    }

    const loaded = await this.memberships.findByUserId(userId);
    const target = request.targetTenantId;

    const resolved =
      target === undefined
        ? await this.resolvePlatformEvidence(loaded)
        : await this.resolveTenantEvidence(loaded, target);

    if (resolved.isFail()) {
      return Result.fail(resolved.errorOrThrow());
    }

    const evidence = resolved.valueOrThrow();
    const decision = decideAuthorization(
      target === undefined
        ? permissionRequirement(request.requiredPermission)
        : tenantPermissionRequirement(request.requiredPermission),
      evidence,
    );

    if (!decision.allowed) {
      return Result.fail(authorizationErrorFor(decision.reason, request.requiredPermission.value));
    }

    return Result.ok(this.toContext(userId.value, evidence, target !== undefined));
  }

  public permits(context: AuthorizationContextView, permission: PermissionKey): boolean {
    return permits(context.permissions, permission);
  }

  /**
   * Evidence for a tenant-scoped requirement: the membership in the target
   * tenant and the permissions it confers.
   *
   * A malformed target is answered as *invalid tenant context*, and a missing or
   * inactive membership as an evidence set the policy denies — never as a
   * lookup that reveals whether the tenant exists.
   */
  private async resolveTenantEvidence(
    loaded: readonly { readonly aggregate: Membership }[],
    targetTenantId: string,
  ): Promise<Result<AuthorizationEvidence, DomainError>> {
    if (!isTenantReference(targetTenantId)) {
      return Result.fail(new TenantContextRequiredError());
    }

    const membership = loaded.find(
      (candidate) => candidate.aggregate.tenantId.value === targetTenantId,
    );

    if (membership === undefined) {
      return Result.ok({ targetTenantId, permissions: new Set<string>() });
    }

    const aggregate = membership.aggregate;
    const permissions = aggregate.isActive()
      ? await resolveEffectivePermissionKeys([aggregate.id], this.assignments, this.roles)
      : new Set<string>();

    return Result.ok({
      targetTenantId,
      membership: {
        membershipId: aggregate.id.value,
        tenantId: aggregate.tenantId.value,
        active: aggregate.isActive(),
      },
      permissions,
    });
  }

  /**
   * Evidence for a platform requirement (one that no single tenant owns): the
   * capability must be held in at least one of the subject's active
   * memberships.
   *
   * The product's MVP model gives a user one active company
   * (doc 09-domain/01, section 5), so this is the honest resolution of "does
   * the user hold this capability" today; when an explicit tenant selection
   * arrives, the same contract narrows to the selected membership without a
   * change of shape.
   */
  private async resolvePlatformEvidence(
    loaded: readonly { readonly aggregate: Membership }[],
  ): Promise<Result<AuthorizationEvidence, DomainError>> {
    const active = loaded.filter((candidate) => candidate.aggregate.isActive());
    const permissions = await resolveEffectivePermissionKeys(
      active.map((candidate) => candidate.aggregate.id),
      this.assignments,
      this.roles,
    );

    return Result.ok({ permissions });
  }

  /** The resolved context a permitted caller receives. */
  private toContext(
    userId: string,
    evidence: AuthorizationEvidence,
    tenantScoped: boolean,
  ): AuthorizationContextView {
    const membership = tenantScoped ? evidence.membership : undefined;

    return {
      userId,
      ...(membership === undefined
        ? {}
        : {
            tenantId: membership.tenantId,
            membershipId: membership.membershipId,
            membershipStatus: membership.active ? ('active' as const) : ('inactive' as const),
          }),
      permissions: [...evidence.permissions].sort(),
    };
  }
}
