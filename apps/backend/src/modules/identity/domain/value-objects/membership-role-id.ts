import { EntityId } from '../../../../shared/id/entity-id.js';

/**
 * The identity of a Membership-Role assignment (IAM-004; ADR-002 section 10).
 *
 * An assignment is the *relationship* between one Membership and one Role, so
 * its identity is the shared {@link EntityId} rather than a value object of its
 * own. The alias is nominal only: it makes a `MembershipRoleId` read as an
 * assignment at a call site without introducing a second identity mechanism.
 *
 * The identifier is generated once, when the assignment is created, and never
 * changes — an assignment is deactivated, never deleted and never re-pointed at
 * another membership or role (storage enforces both).
 */
export type MembershipRoleId = EntityId;

/** Generates a fresh, globally unique assignment identity. */
export function generateMembershipRoleId(): MembershipRoleId {
  return EntityId.generate();
}

/** Wraps an existing assignment identity, e.g. one read from storage. */
export function membershipRoleIdFrom(value: string): MembershipRoleId {
  return EntityId.from(value);
}

/** Whether `value` is a well-formed assignment identity. */
export function isMembershipRoleId(value: string): boolean {
  return EntityId.isValid(value);
}
