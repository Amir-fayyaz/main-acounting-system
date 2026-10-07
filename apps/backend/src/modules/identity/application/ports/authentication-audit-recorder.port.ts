import type { DomainEvent } from '../../../../shared/messaging/domain-event.js';

/**
 * The approved audit boundary, as the authentication flow uses it (IAM-005;
 * ADR-003 section 21; ADR-010 section 9; ADR-015 section 6).
 *
 * The architecture gives audit a central, durable home: an audit record is
 * persistent security/business data and a log line is not a substitute
 * (ADR-015 section 6). The project's central Audit capability (AUD-001) is not
 * implemented yet, so this issue does **not** invent a private audit mechanism —
 * it publishes each authentication fact as a domain event through the one
 * durable cross-cutting boundary that already exists, the transactional outbox
 * (SHR-006), which is where the Audit capability will read them from.
 *
 * The port is intentionally identical in shape to the outbox boundary the
 * module already uses for its other events; what it adds is the *contract* that
 * makes the audit behaviour explicit:
 *
 * - **A failure is recorded even though nothing was written.** Sign-in failures
 *   and rejected authentication states change no state, so there is no
 *   transaction to commit. The adapter therefore records a fact in its own
 *   transaction when the caller has none open, and joins the caller's
 *   transaction when one is open — so a successful sign-in and its audit record
 *   commit together (they cannot drift apart), while a failed attempt is still
 *   recorded.
 * - **A record is written before the outcome is returned.** A use case states
 *   the fact, then answers; it never reports "the request failed" without the
 *   audit trail having been given the chance to say so.
 * - **An audit failure is not swallowed.** If the record cannot be written, the
 *   operation fails: silent loss of a security record is worse than a failed
 *   request (ADR-010 section 13, fail closed).
 */
export interface AuthenticationAuditRecorder {
  record(event: DomainEvent<unknown>): Promise<void>;
}
