import { EntityId } from '../../../../shared/id/entity-id.js';

/**
 * The identity of a Role (IAM-004; ADR-002 section 10).
 *
 * A Role is a tenant-owned named collection of permissions, so its identity is
 * the shared {@link EntityId} rather than a value object of its own: one UUID
 * that every layer can compare, store and log without the shared kernel knowing
 * what a Role is. The alias is nominal only — it makes a `RoleId` read as a role
 * at a call site without introducing a second identity mechanism.
 *
 * The identifier is generated once, at creation, and is never changed: the
 * aggregate has no operation that rewrites it, and storage enforces the primary
 * key, so an id can never be reused for another role.
 */
export type RoleId = EntityId;

/** Generates a fresh, globally unique role identity. */
export function generateRoleId(): RoleId {
  return EntityId.generate();
}

/** Wraps an existing role identity, e.g. one read from storage. */
export function roleIdFrom(value: string): RoleId {
  return EntityId.from(value);
}

/** Whether `value` is a well-formed role identity. */
export function isRoleId(value: string): boolean {
  return EntityId.isValid(value);
}
