import type { DomainError } from '../../../../shared/errors/domain-error.js';
import { Result } from '../../../../shared/errors/result.js';
import { MembershipNotFoundError } from '../../domain/errors/membership.errors.js';
import { findPermission } from '../../domain/permission.js';
import type { MembershipRoleRepository } from '../../domain/repositories/membership-role.repository.js';
import type { MembershipRepository } from '../../domain/repositories/membership.repository.js';
import type { RoleRepository } from '../../domain/repositories/role.repository.js';
import { isMembershipId, membershipIdFrom } from '../../domain/value-objects/membership-id.js';
import { PermissionKey } from '../../domain/value-objects/permission-key.js';
import type { GetEffectivePermissions } from '../queries/effective-permissions.query.js';
import { resolveEffectivePermissionKeys } from '../services/effective-permissions.js';
import { resolveScopedTenant } from '../services/tenant-scope.js';
import { toPermissionView } from '../views/role.mapper.js';
import type { PermissionView } from '../views/permission.view.js';

/**
 * Resolves the effective permissions of a Membership (IAM-004).
 *
 * Effective permissions are the *union* of the capabilities of the roles the
 * membership **currently holds** — which means three filters together decide the
 * answer, and all of them are part of the definition rather than an accident of
 * storage:
 *
 * - the assignment must be **active** (a removed role is history, not access);
 * - the role must be **active** (a deactivated role confers nothing, even while
 *   its assignments remain as history);
 * - the capability is the role's own permission set.
 *
 * The result is a single, deterministic, sorted set of capability keys — the
 * stable shape a later authorization layer (IAM-006) will consult. This issue
 * only *resolves* the set; checking whether an action is permitted is out of
 * scope, and nothing here blocks or allows a request.
 *
 * The read is tenant-scoped and the membership must belong to the scoped tenant,
 * so it cannot resolve another tenant's access by supplying an id.
 */
export class ResolveEffectivePermissionsUseCase {
  public constructor(
    private readonly memberships: MembershipRepository,
    private readonly assignments: MembershipRoleRepository,
    private readonly roles: RoleRepository,
  ) {}

  public async execute(
    query: GetEffectivePermissions,
  ): Promise<Result<readonly PermissionView[], DomainError>> {
    const rawMembershipId = query.params.membershipId;
    if (!isMembershipId(rawMembershipId)) {
      return Result.fail(new MembershipNotFoundError());
    }

    const tenantId = resolveScopedTenant(query.params.tenantId);
    if (tenantId.isFail()) {
      return Result.fail(tenantId.errorOrThrow());
    }

    const membershipId = membershipIdFrom(rawMembershipId);
    const membership = await this.memberships.get(membershipId);
    if (
      membership === undefined ||
      membership.aggregate.tenantId.value !== tenantId.valueOrThrow().value
    ) {
      return Result.fail(new MembershipNotFoundError());
    }

    // The resolution is shared with the authorization layer, so "effective"
    // means exactly the same set in both (IAM-006): one definition of access.
    const granted = await resolveEffectivePermissionKeys(
      [membershipId],
      this.assignments,
      this.roles,
    );

    // Granting validates a key against the catalog, so every collected key is a
    // known capability; the guard is defensive, and skipping an unknown key is
    // safer than inventing a description for it.
    const views: PermissionView[] = [];
    for (const key of [...granted].sort()) {
      const permission = findPermission(PermissionKey.from(key));
      if (permission !== undefined) {
        views.push(toPermissionView(permission));
      }
    }

    return Result.ok(views);
  }
}
