import type { Loaded } from '../../../../shared/persistence/repository-ports.js';
import type { MembershipRole } from '../../domain/aggregates/membership-role.js';
import type { Role } from '../../domain/aggregates/role.js';
import type { Permission } from '../../domain/permission.js';
import type { MembershipRoleView } from './membership-role.view.js';
import type { PermissionView } from './permission.view.js';
import type { RoleView } from './role.view.js';

/**
 * Maps loaded role state to the application views (IAM-004).
 *
 * The mapping is one-way and total: it reads the aggregates/catalog and the
 * revision and produces plain values. Nothing here can write back into an
 * aggregate.
 */
export function toRoleView(loaded: Loaded<Role>): RoleView {
  const { aggregate: role, revision } = loaded;

  return {
    id: role.id.value,
    tenantId: role.tenantId.value,
    name: role.name.value,
    status: role.status.value,
    permissions: role.permissions(),
    revision: revision.value,
    createdAt: role.createdAt.toIsoString(),
    updatedAt: role.updatedAt.toIsoString(),
  };
}

/** Maps a catalog permission to its view (the catalog has no revision). */
export function toPermissionView(permission: Permission): PermissionView {
  return {
    key: permission.key.value,
    description: permission.description,
  };
}

/**
 * Maps an assignment plus the role it points at into the assignment view.
 *
 * The role supplies its current name and state; keeping the two inputs explicit
 * is what makes it impossible to report a role's state as the assignment's, or
 * vice versa.
 */
export function toMembershipRoleView(
  loaded: Loaded<MembershipRole>,
  role: Role,
): MembershipRoleView {
  const { aggregate: assignment, revision } = loaded;

  return {
    id: assignment.id.value,
    membershipId: assignment.membershipId.value,
    roleId: assignment.roleId.value,
    roleName: role.name.value,
    roleStatus: role.status.value,
    status: assignment.status.value,
    revision: revision.value,
    createdAt: assignment.createdAt.toIsoString(),
    updatedAt: assignment.updatedAt.toIsoString(),
  };
}
