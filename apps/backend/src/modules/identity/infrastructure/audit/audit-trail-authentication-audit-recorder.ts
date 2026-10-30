import type {
  AuditEntry,
  AuditRecorder,
} from '../../../audit/application/ports/audit-recorder.port.js';
import type { DomainEvent } from '../../../../shared/messaging/domain-event.js';
import type { AuthenticationAuditRecorder } from '../../application/ports/authentication-audit-recorder.port.js';
import {
  AuthenticationEnded,
  AuthenticationStateRejected,
  SignInFailed,
  UserAuthenticated,
  UserCredentialEstablished,
  UserAccountLocked,
  LockedOutAccountTargeted,
  type AuthenticationStateRejectedData,
} from '../../domain/events/authentication.events.js';

/**
 * The adapter that turns authentication facts into audit records (IAM-005;
 * AUD-001; ADR-003 section 21; ADR-010 section 9).
 *
 * Authentication does not keep a private audit trail. Its use cases state each
 * security fact as an ordinary domain event through the port they already
 * depend on, and this adapter is the one place that translates such a fact into
 * the vocabulary of the central Audit capability — action name, outcome, actor,
 * target and context:
 *
 * ```text
 * UserAuthenticated              → user.signed_in          success
 * SignInFailed                   → user.sign_in_failed     failure
 * AuthenticationEnded            → user.signed_out         success
 * AuthenticationStateRejected    → authentication.denied   denied
 * UserCredentialEstablished      → user.credential_changed success
 * UserAccountLocked                  → user.locked_out          failure
 * LockedOutAccountTargeted           → user.locked_out_attempt  denied
 * ```
 *
 * Three properties are the point:
 *
 * - **The mapping lives in the module that owns the facts.** The audit module
 *   learns no authentication vocabulary — it stores an action name it does not
 *   interpret — and identity keeps its own event names, so a recorded fact and
 *   the event that describes it stay recognisably the same thing (ADR-002,
 *   section 12).
 * - **The actor is the resolved identity, and no secret is ever recorded.** The
 *   user id comes from the fact the authentication boundary already resolved; a
 *   failed attempt that never resolved a user is recorded as the *system*
 *   acting, which is an honest statement, not a missing field. No event carries
 *   a password, a token or a digest, so no audit record can either.
 * - **Nothing is dropped silently.** An event this adapter does not recognise
 *   fails loudly instead of being ignored: a *new* authentication fact wired
 *   through the port would otherwise disappear from the security trail, and an
 *   incomplete audit trail is worse than a failed request (ADR-010,
 *   section 13).
 *
 * The tenant is never stated here, and that is deliberate: authentication is
 * tenant-independent (a sign-in grants no company access), so these records are
 * written with no tenant — the recorder takes the tenant from the ambient
 * tenant scope, which is exactly right for the facts that are tenant-scoped and
 * exactly nothing for the ones that are not.
 */
export class AuditTrailAuthenticationAuditRecorder implements AuthenticationAuditRecorder {
  public constructor(private readonly audit: AuditRecorder) {}

  /**
   * Translates one authentication fact into an audit entry and records it.
   *
   * @throws Error — the event is not an authentication fact this adapter knows,
   * so nothing is recorded and the failure surfaces. Silently skipping it would
   * lose the security record the port exists to produce.
   */
  public async record(event: DomainEvent<unknown>): Promise<void> {
    await this.audit.record(toAuditEntry(event));
  }
}

/** The audit entry one authentication fact maps to. */
function toAuditEntry(event: DomainEvent<unknown>): AuditEntry {
  const correlation = {
    ...(event.metadata.correlationId === undefined
      ? {}
      : { correlationId: event.metadata.correlationId }),
    ...(event.metadata.causationId === undefined
      ? {}
      : { causationId: event.metadata.causationId }),
  };

  if (event instanceof UserAuthenticated) {
    return {
      action: 'user.signed_in',
      outcome: 'success',
      actorUserId: event.data.userId,
      target: { type: 'user', id: event.data.userId },
      metadata: { sessionId: event.data.sessionId, expiresAt: event.data.expiresAt },
      ...correlation,
    };
  }

  if (event instanceof SignInFailed) {
    return {
      action: 'user.sign_in_failed',
      outcome: 'failure',
      ...(event.data.userId === undefined ? {} : { actorUserId: event.data.userId }),
      ...(event.data.userId === undefined
        ? {}
        : { target: { type: 'user', id: event.data.userId } }),
      // The attempted email and the coarse reason are the operational signal an
      // operator needs; the submitted secret is not in the event at all.
      metadata: {
        reason: event.data.reason,
        ...(event.data.userId === undefined ? { attemptedEmail: event.data.email } : {}),
      },
      ...correlation,
    };
  }

  if (event instanceof UserAccountLocked) {
    // The transition itself, and nothing about how long it lasts: the record
    // states that the account is locked, not when it becomes usable again.
    return {
      action: 'user.locked_out',
      outcome: 'failure',
      actorUserId: event.data.userId,
      target: { type: 'user', id: event.data.userId },
      ...correlation,
    };
  }

  if (event instanceof LockedOutAccountTargeted) {
    return {
      action: 'user.locked_out_attempt',
      outcome: 'denied',
      actorUserId: event.data.userId,
      target: { type: 'user', id: event.data.userId },
      ...correlation,
    };
  }

  if (event instanceof AuthenticationEnded) {
    return {
      action: 'user.signed_out',
      outcome: 'success',
      actorUserId: event.data.userId,
      target: { type: 'user', id: event.data.userId },
      metadata: { sessionId: event.data.sessionId },
      ...correlation,
    };
  }

  if (event instanceof AuthenticationStateRejected) {
    return {
      action: 'authentication.denied',
      outcome: 'denied',
      ...(event.data.userId === undefined ? {} : { actorUserId: event.data.userId }),
      ...targetOfRejectedState(event.data),
      metadata: {
        reason: event.data.reason,
        ...(event.data.sessionId === undefined ? {} : { sessionId: event.data.sessionId }),
      },
      ...correlation,
    };
  }

  if (event instanceof UserCredentialEstablished) {
    return {
      action: 'user.credential_changed',
      outcome: 'success',
      actorUserId: event.data.userId,
      target: { type: 'user', id: event.data.userId },
      // The algorithm and the blast radius of the change — never the hash.
      metadata: {
        algorithm: event.data.algorithm,
        replaced: event.data.replaced,
        sessionsInvalidated: event.data.sessionsInvalidated,
      },
      ...correlation,
    };
  }

  throw new Error(
    `No audit entry is defined for the authentication fact "${event.name}"; ` +
      'add its mapping instead of recording it silently as something else.',
  );
}

/** The resource a rejected authentication state addressed, when one was resolved. */
function targetOfRejectedState(data: AuthenticationStateRejectedData): {
  readonly target?: { readonly type: string; readonly id: string };
} {
  if (data.sessionId !== undefined) {
    return { target: { type: 'session', id: data.sessionId } };
  }

  if (data.userId !== undefined) {
    return { target: { type: 'user', id: data.userId } };
  }

  // No token was presented at all: there is nothing to point at, and an invented
  // reference would be worse than an absent one.
  return {};
}
