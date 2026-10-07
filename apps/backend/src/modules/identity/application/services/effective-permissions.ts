import type { MembershipRoleRepository } from '../../domain/repositories/membership-role.repository.js';
import type { RoleRepository } from '../../domain/repositories/role.repository.js';
import type { MembershipId } from '../../domain/value-objects/membership-id.js';

/**
 * Resolves the effective capability keys of one or more memberships (IAM-004;
 * IAM-006).
 *
 * Effective permissions are the **union of the capabilities of the roles a
 * membership currently holds**, which three filters together decide:
 *
 * - the assignment must be **active** (a removed role is history, not access);
 * - the role must be **active** (a deactivated role confers nothing, even while
 *   its assignments remain as history);
 * - the capability is the role's own permission set.
 *
 * The resolution lives here, once, because two callers need exactly this rule
 * and neither may restate it: the effective-permissions read of a membership
 * and the authorization layer, which needs the same set (for one membership of
 * a tenant-scoped decision, or for the union of a subject's active memberships
 * when the capability is platform-level). A second implementation would be a
 * second definition of access.
 *
 * Roles are read through a per-call cache, so a membership holding several
 * assignments of the same role — or several memberships sharing one role —
 * triggers one read per distinct role, not per assignment.
 */
export async function resolveEffectivePermissionKeys(
  membershipIds: readonly MembershipId[],
  assignments: MembershipRoleRepository,
  roles: RoleRepository,
): Promise<ReadonlySet<string>> {
  const granted = new Set<string>();
  /** Each distinct role resolved once: its active capabilities, or `undefined`. */
  const resolvedRoles = new Map<string, readonly string[] | undefined>();

  for (const membershipId of membershipIds) {
    const loaded = await assignments.findByMembershipId(membershipId);

    for (const assignment of loaded) {
      if (!assignment.aggregate.isActive()) {
        continue;
      }

      const roleId = assignment.aggregate.roleId.value;

      if (!resolvedRoles.has(roleId)) {
        const role = await roles.get(assignment.aggregate.roleId);
        resolvedRoles.set(
          roleId,
          role !== undefined && role.aggregate.isActive()
            ? role.aggregate.permissions()
            : undefined,
        );
      }

      for (const key of resolvedRoles.get(roleId) ?? []) {
        granted.add(key);
      }
    }
  }

  return granted;
}
