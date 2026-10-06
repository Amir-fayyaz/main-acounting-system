import { EntityId } from '../../../../shared/id/entity-id.js';

/**
 * The identity of a Membership (IAM-003; ADR-002 section 10).
 *
 * A Membership is the *relationship* between one User and one Tenant, so its
 * identity is the shared {@link EntityId} rather than a value object of its
 * own: one UUID that every layer can compare, store and log without the shared
 * kernel knowing what a Membership is. The alias is nominal only — it makes a
 * `MembershipId` read as a membership at a call site without introducing a
 * second identity mechanism.
 *
 * The identifier is generated once, at creation, and is never changed: the
 * aggregate has no operation that rewrites it, and storage enforces the primary
 * key, so an id cannot be reused for another relationship (the acceptance
 * criteria require a stable, never-reused identifier).
 */
export type MembershipId = EntityId;

/** Generates a fresh, globally unique membership identity. */
export function generateMembershipId(): MembershipId {
  return EntityId.generate();
}

/** Wraps an existing membership identity, e.g. one read from storage. */
export function membershipIdFrom(value: string): MembershipId {
  return EntityId.from(value);
}

/** Whether `value` is a well-formed membership identity. */
export function isMembershipId(value: string): boolean {
  return EntityId.isValid(value);
}
