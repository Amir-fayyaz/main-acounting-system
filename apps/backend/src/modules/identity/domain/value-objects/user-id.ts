import { EntityId } from '../../../../shared/id/entity-id.js';

/**
 * The identity of a User (IAM-002; ADR-002 section 10).
 *
 * A User is a system identity, independent of any tenant, so its identity is
 * the *shared* {@link EntityId} rather than a value object of its own: one UUID
 * that every layer can compare, store and log without the shared kernel knowing
 * what a User is. The alias is nominal only — it makes a `UserId` read as a
 * user at a call site without introducing a second identity mechanism.
 *
 * The identifier is generated once, at creation, and is never changed: the
 * aggregate has no operation that rewrites it, and storage enforces the primary
 * key, so an id cannot be reused for another person (the acceptance criteria
 * require a stable, never-reused identity).
 */
export type UserId = EntityId;

/** Generates a fresh, globally unique user identity. */
export function generateUserId(): UserId {
  return EntityId.generate();
}

/** Wraps an existing user identity, e.g. one read from storage. */
export function userIdFrom(value: string): UserId {
  return EntityId.from(value);
}

/** Whether `value` is a well-formed user identity. */
export function isUserId(value: string): boolean {
  return EntityId.isValid(value);
}
