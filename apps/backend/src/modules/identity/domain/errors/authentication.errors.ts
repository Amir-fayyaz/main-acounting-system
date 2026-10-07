import { DomainError } from '../../../../shared/errors/domain-error.js';
import { ErrorCategory } from '../../../../shared/errors/error-category.js';

/**
 * Identity-owned authentication failures (IAM-005; ADR-010 sections 2 and 13;
 * 06-security-engineering).
 *
 * Two rules shape this vocabulary:
 *
 * - **A failure says what the caller must do, never what they got wrong.** The
 *   codes below distinguish "the credentials did not match", "this account may
 *   not sign in", "the session expired" and "the session was invalidated" —
 *   and nothing finer. There is no code for "unknown email" or "wrong
 *   password", because a client that could tell those apart could enumerate
 *   accounts, and the security model forbids that.
 * - **No failure carries a credential.** No password, hash, token or token
 *   digest appears in a message or a detail; these errors are serialized to
 *   clients and recorded in the audit trail.
 *
 * None of them knows about HTTP: mapping an authentication failure to `401` (or
 * to anything else) is the presentation layer's decision (FND-006; ADR-013).
 */

/**
 * The supplied credentials did not authenticate a user.
 *
 * This is the single answer for every credential-level mismatch: an unknown
 * email, a missing credential and a wrong password are indistinguishable to the
 * caller by design. It is deliberately not named after a cause, so no future
 * caller can be tempted to expose one.
 */
export class InvalidCredentialsError extends DomainError {
  public constructor() {
    super('INVALID_CREDENTIALS', 'The email or password is incorrect.', {
      category: ErrorCategory.BUSINESS_RULE,
    });
  }
}

/**
 * The credentials matched, but this account may not sign in.
 *
 * Raised only *after* the secret has been verified, which is what keeps it from
 * becoming an account-enumeration oracle: reaching it already requires the
 * correct password. It exists so an operator can see why a valid password did
 * not produce a session, instead of the user being told their password is
 * wrong.
 */
export class AccountNotAuthenticatableError extends DomainError {
  public constructor() {
    super('ACCOUNT_NOT_AUTHENTICATABLE', 'This account cannot sign in. Contact an administrator.', {
      category: ErrorCategory.BUSINESS_RULE,
    });
  }
}

/**
 * The request carries no usable authentication.
 *
 * Raised when the authentication material is absent or malformed — no
 * `Authorization` header, a scheme other than `Bearer`, an empty token — so the
 * caller is told to authenticate rather than that something they sent was
 * *almost* right.
 */
export class AuthenticationRequiredError extends DomainError {
  public constructor() {
    super('AUTHENTICATION_REQUIRED', 'Authentication is required for this operation.', {
      category: ErrorCategory.BUSINESS_RULE,
    });
  }
}

/**
 * The presented authentication state is not known to this system.
 *
 * An unknown token is reported exactly like an expired or invalidated one to a
 * client — the *reason* is recorded for the audit trail, not disclosed to the
 * caller.
 */
export class AuthenticationStateRejectedError extends DomainError {
  public constructor() {
    super('AUTHENTICATION_STATE_REJECTED', 'The authentication state is not valid.', {
      category: ErrorCategory.BUSINESS_RULE,
    });
  }
}

/**
 * The session existed but its lifetime has ended.
 *
 * Expiry is a property of the state, not an error in it: the record is kept and
 * can be examined, but it is no longer accepted as authentication.
 */
export class SessionExpiredError extends DomainError {
  public constructor() {
    super('SESSION_EXPIRED', 'The authentication session has expired. Sign in again.', {
      category: ErrorCategory.BUSINESS_RULE,
    });
  }
}

/**
 * The session was explicitly invalidated — signed out, or replaced when the
 * credential changed — and is no longer accepted.
 */
export class SessionRevokedError extends DomainError {
  public constructor() {
    super('SESSION_REVOKED', 'The authentication session is no longer valid.', {
      category: ErrorCategory.BUSINESS_RULE,
    });
  }
}

/**
 * An already-invalidated session was asked to invalidate itself again.
 *
 * Unlike the failures above this is a programming error, not a client outcome:
 * the domain exposes it so a second invalidation cannot pass silently as if it
 * had done something.
 */
export class SessionAlreadyRevokedError extends DomainError {
  public constructor() {
    super('SESSION_ALREADY_REVOKED', 'The authentication session was already invalidated.', {
      category: ErrorCategory.STATE_VIOLATION,
    });
  }
}
