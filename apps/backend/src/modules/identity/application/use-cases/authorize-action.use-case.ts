import type { DomainError } from '../../../../shared/errors/domain-error.js';
import { Result } from '../../../../shared/errors/result.js';
import { createTenantContext } from '../../../../shared/tenant/tenant-context.js';
import { TenantScope } from '../../../../shared/tenant/tenant-scope.js';
import type { AuditRecorder } from '../../../audit/application/ports/audit-recorder.port.js';
import { AccountNotAuthenticatableError } from '../../domain/errors/authentication.errors.js';
import type { AuthorizationEvidence } from '../../domain/authorization/authorization-evidence.js';
import { decideAuthorization, permits } from '../../domain/authorization/authorization-policy.js';
import {
  permissionRequirement,
  tenantPermissionRequirement,
} from '../../domain/authorization/authorization-requirement.js';
import {
  AuthorizationContextInvalidError,
  TenantAccessDeniedError,
  TenantContextRequiredError,
  authorizationErrorFor,
} from '../../domain/errors/authorization.errors.js';
import type { MembershipRepository } from '../../domain/repositories/membership.repository.js';
import type { TenantMembership } from '../ports/tenant-membership.port.js';
import type { MembershipRoleRepository } from '../../domain/repositories/membership-role.repository.js';
import type { RoleRepository } from '../../domain/repositories/role.repository.js';
import type { UserRepository } from '../../domain/repositories/user.repository.js';
import type { PermissionKey } from '../../domain/value-objects/permission-key.js';
import {
  isTenantReference,
  tenantReferenceFrom,
} from '../../domain/value-objects/tenant-reference.js';
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
 *   ├─ membership in that tenant?    no → TENANT_ACCESS_DENIED (also a forged tenant)
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
 * - **Nothing business-related is written.** A decision changes no business
 *   state, raises no business event and touches no credential. The one thing a
 *   refusal does write is its own audit record (AUD-001): the denial is stated
 *   through the published audit contract, so "who was refused what, and why"
 *   survives as durable evidence — while the decision itself stays free of
 *   side effects and the audit module learns no authorization rule
 *   (ADR-002 section 12).
 */
export class AuthorizeActionUseCase implements Authorization {
  public constructor(
    private readonly users: UserRepository,
    private readonly memberships: MembershipRepository,
    private readonly tenantMembership: TenantMembership,
    private readonly assignments: MembershipRoleRepository,
    private readonly roles: RoleRepository,
    private readonly audit: AuditRecorder,
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

    const target = request.targetTenantId;

    // A conflicting secondary client claim is never used to choose a tenant;
    // it only makes the decision more restrictive. Handle it after resolving
    // the authenticated actor so the refusal can be attributed and correlated.
    if (request.tenantClaimConflict === true) {
      return this.deny(request, userId.value, new TenantAccessDeniedError());
    }

    // Evidence resolution is deliberately a **system-level** read: whether a
    // caller may enter a tenant is answered before that tenant's scope exists.
    // If a caller already runs inside a tenant, the work stays there (no
    // escalation), and the repository criterion must match it.
    const resolved =
      target === undefined
        ? await this.inSystemScope(() => this.resolvePlatformEvidence(userId))
        : await this.inSystemScope(() => this.resolveTenantEvidence(userId, target));

    if (resolved.isFail()) {
      return this.deny(request, userId.value, resolved.errorOrThrow());
    }

    const evidence = resolved.valueOrThrow();
    const decision = decideAuthorization(
      target === undefined
        ? permissionRequirement(request.requiredPermission)
        : tenantPermissionRequirement(request.requiredPermission),
      evidence,
    );

    if (!decision.allowed) {
      return this.deny(
        request,
        userId.value,
        authorizationErrorFor(decision.reason, request.requiredPermission.value),
      );
    }

    return Result.ok(this.toContext(userId.value, evidence, target !== undefined));
  }

  public permits(context: AuthorizationContextView, permission: PermissionKey): boolean {
    return permits(context.permissions, permission);
  }

  /**
   * Records a refusal and answers with it (AUD-001; ADR-010 section 9).
   *
   * The event identifies the validated actor and request correlation only. It
   * deliberately omits the requested tenant identifier: an unverified claim
   * must not enter audit metadata, and the public response must not become an
   * existence oracle. A failed audit write propagates, preserving fail-closed
   * behaviour rather than pretending the denial was recorded.
   */
  private async deny(
    request: AuthorizationRequest,
    actorUserId: string,
    error: DomainError,
  ): Promise<Result<AuthorizationContextView, DomainError>> {
    const record = (): Promise<void> =>
      this.audit.record({
        action: 'authorization.denied',
        outcome: 'denied',
        actorUserId,
        ...(request.correlationId === undefined ? {} : { correlationId: request.correlationId }),
        metadata: {
          permission: request.requiredPermission.value,
          reason: error.code,
          tenantScoped: request.targetTenantId !== undefined,
          ...(request.tenantClaimConflict === true ? { tenantClaimConflict: true } : {}),
        },
      });

    // A denial raised inside a tenant stays tenant-scoped; one raised before a
    // scope exists is an explicit system fact. Never escalate a tenant scope.
    await (TenantScope.current().state === 'available'
      ? record()
      : TenantScope.runAsSystem(record));

    return Result.fail(error);
  }

  /**
   * Evidence for a tenant-scoped requirement: the membership in the target
   * tenant and the permissions it confers.
   *
   * The lookup is restricted to this user/tenant pair. The Identity membership
   * table is the only source consulted here: a missing row answers identically
   * whether the tenant is unknown or simply not joined by this user.
   */
  private async resolveTenantEvidence(
    userId: ReturnType<typeof userIdFrom>,
    targetTenantId: string,
  ): Promise<Result<AuthorizationEvidence, DomainError>> {
    if (!isTenantReference(targetTenantId)) {
      return Result.fail(new TenantContextRequiredError());
    }

    // The claim is resolved into the tenant's canonical identity before it
    // reaches the evidence, so the two spellings of one UUID are one tenant
    // and not two (IAM-007). The decision then compares two canonical values.
    const target = tenantReferenceFrom(targetTenantId).value;

    const membership = await this.tenantMembership.findActiveForUserAndTenant(
      userId,
      tenantReferenceFrom(target),
    );

    if (membership === undefined) {
      // Missing and inactive memberships have the same evidence shape and the
      // same public denial; neither case triggers a Tenant Directory lookup.
      return Result.ok({ targetTenantId: target, permissions: new Set<string>() });
    }

    // The membership's own tenant is now the scope of permission resolution:
    // assignment and role reads are tenant-filtered even on this pre-request
    // authorization path.
    const permissions = await TenantScope.run(createTenantContext(membership.tenantId.value), () =>
      resolveEffectivePermissionKeys([membership.membershipId], this.assignments, this.roles),
    );

    return Result.ok({
      targetTenantId: target,
      membership: {
        membershipId: membership.membershipId.value,
        tenantId: membership.tenantId.value,
        active: true,
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
    userId: ReturnType<typeof userIdFrom>,
  ): Promise<Result<AuthorizationEvidence, DomainError>> {
    // A person's memberships span tenants; only an explicit system operation
    // may ask that question, and the repository enforces it.
    const loaded = await this.memberships.findByUserId(userId);
    const active = loaded.filter((candidate) => candidate.aggregate.isActive());
    const permissions = new Set<string>();

    // Each membership's roles are read under **its own** tenant scope, so the
    // union is assembled without ever running a cross-tenant repository query.
    for (const candidate of active) {
      const granted = await TenantScope.run(
        createTenantContext(candidate.aggregate.tenantId.value),
        () =>
          resolveEffectivePermissionKeys([candidate.aggregate.id], this.assignments, this.roles),
      );

      for (const key of granted) {
        permissions.add(key);
      }
    }

    return Result.ok({ permissions });
  }

  /**
   * Runs trusted evidence resolution under an explicit system scope, unless a
   * tenant scope is already active — entering system from a tenant would be an
   * escalation, so that case keeps the narrower scope.
   */
  private inSystemScope<T>(work: () => Promise<T>): Promise<T> {
    return TenantScope.current().state === 'available' ? work() : TenantScope.runAsSystem(work);
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
