import type { DomainEvent } from '../../../../shared/messaging/domain-event.js';

/**
 * How the authentication flow states a fact that must be audited (IAM-005;
 * AUD-001; ADR-003 section 21; ADR-010 section 9; ADR-015 section 6).
 *
 * The architecture gives audit a central, durable home: an audit record is
 * persistent security/business data and a log line is not a substitute for it
 * (ADR-015 section 6). Authentication therefore does **not** keep an audit
 * mechanism of its own. Its use cases state each security fact as an ordinary
 * domain event through this port, and the adapter behind it translates that
 * fact into the vocabulary of the central Audit capability
 * (`infrastructure/audit/audit-trail-authentication-audit-recorder.ts`),
 * which records it durably against the audit contract every other module uses.
 *
 * The port is shaped like the messaging boundary the module already speaks, and
 * what it adds is the *contract* that makes the audit behaviour explicit:
 *
 * - **A failure is recorded even though nothing was written.** Sign-in failures
 *   and rejected authentication states change no state, so there is no
 *   transaction to commit. The audit recorder therefore records a fact in its
 *   own transaction when the caller has none open, and joins the caller's
 *   transaction when one is open — so a successful sign-in and its audit record
 *   commit together (they cannot drift apart), while a failed attempt is still
 *   recorded.
 * - **A record is written before the outcome is returned.** A use case states
 *   the fact, then answers; it never reports "the request failed" without the
 *   audit trail having been given the chance to say so.
 * - **An audit failure is not swallowed.** If the record cannot be written, the
 *   operation fails: silent loss of a security record is worse than a failed
 *   request (ADR-010 section 13, fail closed).
 *
 * The port names no action, outcome or column: which authentication fact maps to
 * which audit action is the adapter's translation, and the audit module learns
 * nothing about authentication in return (ADR-002 section 12).
 */
export interface AuthenticationAuditRecorder {
  record(event: DomainEvent<unknown>): Promise<void>;
}
