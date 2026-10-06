import { describe, expect, it } from 'vitest';
import { EntityId } from '../../../shared/id/entity-id.js';
import { InvalidPrimitiveError } from '../../../shared/primitives/invalid-primitive-error.js';
import { DateTime } from '../../../shared/time/date-time.js';
import { MembershipRole } from './aggregates/membership-role.js';
import { Role } from './aggregates/role.js';
import {
  DuplicateRolePermissionError,
  InactiveRoleError,
  InvalidRoleStatusTransitionError,
  RolePermissionNotFoundError,
} from './errors/role.errors.js';
import { InvalidRoleAssignmentTransitionError } from './errors/membership-role.errors.js';
import { findPermission, isKnownPermission, PERMISSION_CATALOG } from './permission.js';
import { membershipIdFrom } from './value-objects/membership-id.js';
import { MembershipRoleStatus } from './value-objects/membership-role-status.js';
import { PermissionKey, PERMISSION_KEY_MAX_LENGTH } from './value-objects/permission-key.js';
import { roleIdFrom, type RoleId } from './value-objects/role-id.js';
import { RoleName } from './value-objects/role-name.js';
import { RoleStatus } from './value-objects/role-status.js';
import { tenantReferenceFrom, type TenantReference } from './value-objects/tenant-reference.js';

const NOW = DateTime.parse('2026-10-05T08:00:00.000Z');
const LATER = DateTime.parse('2026-10-06T08:00:00.000Z');

function aTenantReference(): TenantReference {
  return tenantReferenceFrom(EntityId.generate().value);
}

function aRole(tenantId = aTenantReference(), name = 'Accountant'): Role {
  return Role.create({ tenantId, name: RoleName.from(name), now: NOW });
}

function anAssignment(
  membershipId = membershipIdFrom(EntityId.generate().value),
  roleId: RoleId = roleIdFrom(EntityId.generate().value),
  tenantId = aTenantReference(),
): MembershipRole {
  return MembershipRole.assign({ tenantId, membershipId, roleId, now: NOW });
}

describe('Permission catalog', () => {
  it('exposes only stable, dotted, lower-case keys', () => {
    for (const permission of PERMISSION_CATALOG) {
      expect(permission.key.value).toMatch(/^[a-z][a-z0-9]*(\.[a-z][a-z0-9]*)+$/);
      expect(permission.key.value.length).toBeLessThanOrEqual(PERMISSION_KEY_MAX_LENGTH);
    }
  });

  it('defines each capability exactly once', () => {
    const keys = PERMISSION_CATALOG.map((permission) => permission.key.value);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('describes every capability', () => {
    for (const permission of PERMISSION_CATALOG) {
      expect(permission.description.length).toBeGreaterThan(0);
    }
  });

  it('resolves a key to its definition, and only for known keys', () => {
    const known = PermissionKey.from('company.read');
    expect(findPermission(known)?.description).toBeTruthy();
    expect(isKnownPermission(known)).toBe(true);

    const unknown = PermissionKey.from('purchase.create');
    expect(findPermission(unknown)).toBeUndefined();
    expect(isKnownPermission(unknown)).toBe(false);
  });

  it('rejects a key that is not a dotted lower-case capability', () => {
    expect(() => PermissionKey.from('company')).toThrow(InvalidPrimitiveError);
    expect(() => PermissionKey.from('company..read')).toThrow(InvalidPrimitiveError);
    expect(() => PermissionKey.from('company read')).toThrow(InvalidPrimitiveError);
    expect(() => PermissionKey.from('company.')).toThrow(InvalidPrimitiveError);
    expect(() => PermissionKey.from('company.2read')).toThrow(InvalidPrimitiveError);
  });

  it('normalizes case and surrounding space, so one capability has one name', () => {
    expect(PermissionKey.from('  Company.Read  ').value).toBe('company.read');
    expect(PermissionKey.is(' COMPANY.READ ')).toBe(true);
  });
});

describe('Role aggregate', () => {
  describe('identity and references', () => {
    it('generates a stable, UUID-shaped identity that does not change', () => {
      const role = aRole();
      const id = role.id.value;

      expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
      expect(role.roleId()).toBe(id);

      role.grantPermission(PermissionKey.from('company.read'), LATER);
      role.deactivate(LATER);

      expect(role.roleId()).toBe(id);
    });

    it('never reuses an identity for another role', () => {
      const first = aRole();
      const second = aRole();

      expect(first.id.equals(second.id)).toBe(false);
      expect(first.equals(second)).toBe(false);
    });

    it('belongs to exactly one tenant and carries no user data', () => {
      const tenant = aTenantReference();
      const role = aRole(tenant);

      expect(role.tenantId.equals(tenant)).toBe(true);
      expect(role.tenantIdValue()).toBe(tenant.value);

      const keys = Object.keys(role.snapshot());
      expect([...keys].sort()).toEqual(
        ['createdAt', 'id', 'name', 'permissions', 'status', 'tenantId', 'updatedAt'].sort(),
      );
      for (const forbidden of ['userId', 'displayName', 'email', 'membershipId']) {
        expect(keys).not.toContain(forbidden);
      }
    });
  });

  describe('creation', () => {
    it('starts active, empty and with both timestamps at the creation instant', () => {
      const role = aRole();

      expect(role.status).toBe(RoleStatus.ACTIVE);
      expect(role.isActive()).toBe(true);
      expect(role.permissions()).toEqual([]);
      expect(role.permissionCount()).toBe(0);
      expect(role.createdAt.equals(NOW)).toBe(true);
      expect(role.updatedAt.equals(NOW)).toBe(true);
    });

    it('accepts initial permissions deterministically', () => {
      const role = Role.create({
        tenantId: aTenantReference(),
        name: RoleName.from('Auditor'),
        now: NOW,
        permissions: [PermissionKey.from('user.read'), PermissionKey.from('company.read')],
      });

      // Sorted, so the set is comparable across calls and storage.
      expect(role.permissions()).toEqual(['company.read', 'user.read']);
    });

    it('rehydrates stored state through the same value objects', () => {
      const role = aRole();
      role.grantPermission(PermissionKey.from('role.manage'), LATER);

      const rehydrated = Role.rehydrate(role.snapshot());
      expect(rehydrated.snapshot()).toEqual(role.snapshot());
    });

    it('rejects a stored state the value objects cannot accept', () => {
      const base = aRole().snapshot();

      expect(() => Role.rehydrate({ ...base, id: 'not-a-uuid' })).toThrow(InvalidPrimitiveError);
      expect(() => Role.rehydrate({ ...base, tenantId: 'not-a-uuid' })).toThrow(
        InvalidPrimitiveError,
      );
      expect(() => Role.rehydrate({ ...base, status: 'archived' as never })).toThrow(
        InvalidPrimitiveError,
      );
      expect(() => Role.rehydrate({ ...base, name: '   ' })).toThrow(InvalidPrimitiveError);
    });
  });

  describe('permission set', () => {
    it('adds a capability and advances the updated instant', () => {
      const role = aRole();

      role.grantPermission(PermissionKey.from('company.read'), LATER);

      expect(role.hasPermission(PermissionKey.from('company.read'))).toBe(true);
      expect(role.permissionCount()).toBe(1);
      expect(role.updatedAt.equals(LATER)).toBe(true);
    });

    it('refuses a duplicate grant instead of counting it twice', () => {
      const role = aRole();
      role.grantPermission(PermissionKey.from('company.read'), NOW);

      expect(() => role.grantPermission(PermissionKey.from('company.read'), LATER)).toThrow(
        DuplicateRolePermissionError,
      );
      expect(role.permissionCount()).toBe(1);
    });

    it('emits the permission set in a deterministic order', () => {
      const role = aRole();
      role.grantPermission(PermissionKey.from('user.manage'), NOW);
      role.grantPermission(PermissionKey.from('company.read'), NOW);
      role.grantPermission(PermissionKey.from('role.read'), NOW);

      expect(role.permissions()).toEqual(['company.read', 'role.read', 'user.manage']);
      expect(role.permissions()).toEqual(role.permissions());
    });

    it('removes a capability, and refuses to remove one it does not grant', () => {
      const role = aRole();
      role.grantPermission(PermissionKey.from('company.read'), NOW);

      role.revokePermission(PermissionKey.from('company.read'), LATER);
      expect(role.permissions()).toEqual([]);

      expect(() => role.revokePermission(PermissionKey.from('company.read'), LATER)).toThrow(
        RolePermissionNotFoundError,
      );
    });
  });

  describe('lifecycle', () => {
    it('moves between active and inactive', () => {
      const role = aRole();

      role.deactivate(LATER);
      expect(role.status).toBe(RoleStatus.INACTIVE);
      expect(role.isActive()).toBe(false);

      role.activate(LATER);
      expect(role.status).toBe(RoleStatus.ACTIVE);
    });

    it('refuses a transition that does not apply from the current state', () => {
      const role = aRole();
      expect(() => role.activate(LATER)).toThrow(InvalidRoleStatusTransitionError);

      role.deactivate(LATER);
      expect(() => role.deactivate(LATER)).toThrow(InvalidRoleStatusTransitionError);
    });

    it('refuses to change an inactive role', () => {
      const role = aRole();
      role.grantPermission(PermissionKey.from('company.read'), NOW);
      role.deactivate(LATER);

      expect(() => role.rename(RoleName.from('Renamed'), LATER)).toThrow(InactiveRoleError);
      expect(() => role.grantPermission(PermissionKey.from('user.read'), LATER)).toThrow(
        InactiveRoleError,
      );
      expect(() => role.revokePermission(PermissionKey.from('company.read'), LATER)).toThrow(
        InactiveRoleError,
      );
    });

    it('keeps the permission set across deactivation and reactivation', () => {
      const role = aRole();
      role.grantPermission(PermissionKey.from('company.read'), NOW);

      role.deactivate(LATER);
      role.activate(LATER);

      expect(role.permissions()).toEqual(['company.read']);
    });
  });

  describe('freeze', () => {
    it('hands out a copy that cannot reach back into the aggregate', () => {
      const role = aRole();
      role.grantPermission(PermissionKey.from('company.read'), NOW);

      const frozen = role.freeze();
      expect(Object.isFrozen(frozen)).toBe(true);
      expect(frozen.permissions).toEqual(['company.read']);
    });
  });
});

describe('MembershipRole aggregate', () => {
  it('starts active, linking exactly one membership and one role', () => {
    const membershipId = membershipIdFrom(EntityId.generate().value);
    const roleId = roleIdFrom(EntityId.generate().value);
    const tenant = aTenantReference();

    const assignment = anAssignment(membershipId, roleId, tenant);

    expect(assignment.status).toBe(MembershipRoleStatus.ACTIVE);
    expect(assignment.isActive()).toBe(true);
    expect(assignment.membershipId.equals(membershipId)).toBe(true);
    expect(assignment.roleId.equals(roleId)).toBe(true);
    expect(assignment.tenantId.equals(tenant)).toBe(true);
    expect(assignment.createdAt.equals(NOW)).toBe(true);
  });

  it('removes a role by deactivating the assignment, never deleting it', () => {
    const assignment = anAssignment();
    const id = assignment.assignmentId();

    assignment.deactivate(LATER);

    expect(assignment.isActive()).toBe(false);
    expect(assignment.status).toBe(MembershipRoleStatus.INACTIVE);
    expect(assignment.assignmentId()).toBe(id);
    expect(assignment.updatedAt.equals(LATER)).toBe(true);
  });

  it('reactivates the same record when the role is held again', () => {
    const assignment = anAssignment();
    assignment.deactivate(LATER);
    assignment.activate(LATER);

    expect(assignment.isActive()).toBe(true);
  });

  it('refuses a transition that does not apply from the current state', () => {
    const active = anAssignment();
    expect(() => active.activate(LATER)).toThrow(InvalidRoleAssignmentTransitionError);

    const inactive = anAssignment();
    inactive.deactivate(LATER);
    expect(() => inactive.deactivate(LATER)).toThrow(InvalidRoleAssignmentTransitionError);
  });

  it('rehydrates stored state and rejects a broken one', () => {
    const assignment = anAssignment();
    assignment.deactivate(LATER);

    expect(MembershipRole.rehydrate(assignment.snapshot()).snapshot()).toEqual(
      assignment.snapshot(),
    );

    const base = assignment.snapshot();
    expect(() => MembershipRole.rehydrate({ ...base, id: 'not-a-uuid' })).toThrow(
      InvalidPrimitiveError,
    );
    expect(() => MembershipRole.rehydrate({ ...base, status: 'removed' as never })).toThrow(
      InvalidPrimitiveError,
    );
  });
});
