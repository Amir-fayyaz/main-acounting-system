import { DomainEvent } from '../../../../shared/messaging/domain-event.js';
import type { MessageOptions } from '../../../../shared/messaging/message-metadata.js';

/**
 * The authentication facts this module publishes (IAM-005; ADR-010 section 9;
 * ADR-005).
 *
 * ADR-010 section 9 requires sign-in, sign-out, access denial and secret changes
 * to be auditable, and the architecture requires audit records to be *durable
 * data*, not a log line (ADR-015 section 6: "a log does not replace audit").
 * This module therefore does not invent an audit mechanism: it states each
 * authentication fact as an ordinary domain event and hands it to the same
 * transactional outbox every other module uses (SHR-006), which is where the
 * central Audit capability will read them from when it lands.
 *
 * Four rules make these events safe to record:
 *
 * - **No credential ever travels in one.** No password, no password hash, no
 *   bearer token and no token digest appears in any body below. An audit record
 *   that named a live token would be a credential store.
 * - **No tenant is attached.** Authentication is tenant-independent: the events
 *   carry no `tenantId`, so they cannot be read as granting or implying access
 *   to a tenant. Tenant-scoped facts arrive with the membership and
 *   authorization issues.
 * - **The failure reason is a closed, coarse vocabulary.** It distinguishes
 *   "the credentials did not match", "the account may not sign in", and the
 *   session-rejection causes; it never records which credential component was
 *   wrong, so an audit reader learns what an attacker learned, and the same
 *   operational signal is available without storing anything sensitive.
 * - **Names are past tense** because a fact is what happened; the kernel refuses
 *   anything else.
 */

/** Why a sign-in attempt failed, as recorded for audit — coarse on purpose. */
export const SIGN_IN_FAILURE_REASONS = [
  /** The email is unknown, or the user has no credential: one indistinguishable answer. */
  'UNKNOWN_CREDENTIAL',
  /** A credential exists but the supplied secret did not match. */
  'INVALID_SECRET',
  /** The secret matched but the account is not allowed to authenticate. */
  'ACCOUNT_NOT_AUTHENTICATABLE',
] as const;

export type SignInFailureReason = (typeof SIGN_IN_FAILURE_REASONS)[number];

/** Why a presented authentication state was not accepted, as recorded for audit. */
export const AUTHENTICATION_REJECTION_REASONS = [
  /** No token was presented, or the header could not be read as a bearer token. */
  'MISSING_TOKEN',
  /** No session matched the presented token. */
  'UNKNOWN_TOKEN',
  /** The session's lifetime had ended. */
  'EXPIRED',
  /** The session had been invalidated. */
  'REVOKED',
  /** The session referenced a user that no longer exists. */
  'USER_MISSING',
  /** The session's user is not currently allowed to authenticate. */
  'USER_NOT_AUTHENTICATABLE',
] as const;

export type AuthenticationRejectionReason = (typeof AUTHENTICATION_REJECTION_REASONS)[number];

/** The information `UserAuthenticated` carries. */
export interface UserAuthenticatedData {
  readonly userId: string;
  readonly sessionId: string;
  /** When the established session stops being accepted, ISO-8601 in UTC. */
  readonly expiresAt: string;
}

/**
 * A user authenticated successfully and an authentication state was established.
 *
 * This is the audit record of a successful sign-in. The session is named, so the
 * record can be tied to the later sign-out of the same session; the token is
 * not, because the record must never be usable as a credential.
 */
export class UserAuthenticated extends DomainEvent<UserAuthenticatedData> {
  public constructor(data: UserAuthenticatedData, options?: MessageOptions) {
    super('UserAuthenticated', data, options);
  }
}

/** The information `SignInFailed` carries. */
export interface SignInFailedData {
  /** The normalized email the attempt presented; the user may not exist. */
  readonly email: string;
  readonly reason: SignInFailureReason;
  /** The user, when the credential was resolved; omitted for an unknown email. */
  readonly userId?: string;
}

/**
 * A sign-in attempt was rejected.
 *
 * Recording the attempted email is deliberate: repeated failures for one address
 * are exactly the signal an operator needs (the later rate-limiting and
 * lockout work will consume it). The submitted secret is not recorded, in any
 * form.
 */
export class SignInFailed extends DomainEvent<SignInFailedData> {
  public constructor(data: SignInFailedData, options?: MessageOptions) {
    super('SignInFailed', data, options);
  }
}

/** The information `AuthenticationEnded` carries. */
export interface AuthenticationEndedData {
  readonly userId: string;
  readonly sessionId: string;
}

/**
 * A user explicitly invalidated the session they were using — a sign-out.
 *
 * The name states the outcome rather than the verb because an event is a fact
 * and the kernel requires a past-tense name; the audit trail reads
 * `UserAuthenticated` … `AuthenticationEnded`, which is exactly the story of a
 * session.
 */
export class AuthenticationEnded extends DomainEvent<AuthenticationEndedData> {
  public constructor(data: AuthenticationEndedData, options?: MessageOptions) {
    super('AuthenticationEnded', data, options);
  }
}

/** The information `AuthenticationStateRejected` carries. */
export interface AuthenticationStateRejectedData {
  readonly reason: AuthenticationRejectionReason;
  /** The session, when a record was matched for the presented token. */
  readonly sessionId?: string;
  /** The session's user, when a record was matched for the presented token. */
  readonly userId?: string;
}

/**
 * A request presented authentication state that was not accepted.
 *
 * This is the "access denial" half of the audit requirement: an expired or
 * invalidated session, an unknown token or a user that may no longer
 * authenticate is recorded as a rejection rather than silently ignored, and
 * never as a successful authentication.
 */
export class AuthenticationStateRejected extends DomainEvent<AuthenticationStateRejectedData> {
  public constructor(data: AuthenticationStateRejectedData, options?: MessageOptions) {
    super('AuthenticationStateRejected', data, options);
  }
}

/** The information `UserCredentialEstablished` carries. */
export interface UserCredentialEstablishedData {
  readonly userId: string;
  /** The algorithm of the stored derivation, e.g. `scrypt`; never the hash. */
  readonly algorithm: string;
  /** Whether an existing credential was replaced rather than created. */
  readonly replaced: boolean;
  /** How many active sessions the new secret invalidated. */
  readonly sessionsInvalidated: number;
}

/**
 * A credential was established or replaced.
 *
 * ADR-010 section 9 lists secret changes among the auditable security events.
 * The event states the algorithm and how many sessions the change invalidated —
 * enough to reconstruct what happened — and carries no hash material.
 */
export class UserCredentialEstablished extends DomainEvent<UserCredentialEstablishedData> {
  public constructor(data: UserCredentialEstablishedData, options?: MessageOptions) {
    super('UserCredentialEstablished', data, options);
  }
}
