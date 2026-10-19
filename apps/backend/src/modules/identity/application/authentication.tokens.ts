/**
 * The Identity module's authentication dependency-injection tokens (IAM-005).
 *
 * Each token names a port the authentication use cases depend on, so the wiring
 * can swap an adapter — a different password-hashing algorithm, a Redis-backed
 * session store — without touching a use case (ADR-002 section 15).
 */

/** The stored secrets of users (`CredentialRepository`). */
export const CREDENTIAL_REPOSITORY = 'CREDENTIAL_REPOSITORY';

/** The established authentication sessions (`AuthSessionRepository`). */
export const AUTH_SESSION_REPOSITORY = 'AUTH_SESSION_REPOSITORY';

/** The approved password-hashing mechanism (`PasswordHasher`). */
export const PASSWORD_HASHER = 'PASSWORD_HASHER';

/** The bearer-token adapter (`SessionTokenService`). */
export const SESSION_TOKEN_SERVICE = 'SESSION_TOKEN_SERVICE';

/** The approved audit boundary, as the authentication flow uses it (SHR-006). */
export const AUTHENTICATION_AUDIT_RECORDER = 'AUTHENTICATION_AUDIT_RECORDER';
