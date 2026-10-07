import { EntityId } from '../../../../shared/id/entity-id.js';

/**
 * The identity of an authentication session (IAM-005; ADR-002 section 10).
 *
 * A session is a security record, not a business document: it is identified by
 * the shared {@link EntityId} under a nominal alias, exactly like `UserId`, so
 * every layer can compare, store and log it without the shared kernel learning
 * what a session is. It appears in audit records so a sign-out can name the
 * exact session it invalidated.
 *
 * The identifier is generated once, at sign-in, and is never reused: a fresh
 * session identity per authentication means two sign-ins never share a record,
 * so revoking one cannot revoke the other.
 */
export type SessionId = EntityId;

/** Generates a fresh, globally unique session identity. */
export function generateSessionId(): SessionId {
  return EntityId.generate();
}

/** Wraps an existing session identity, e.g. one read from storage. */
export function sessionIdFrom(value: string): SessionId {
  return EntityId.from(value);
}

/** Whether `value` is a well-formed session identity. */
export function isSessionId(value: string): boolean {
  return EntityId.isValid(value);
}
