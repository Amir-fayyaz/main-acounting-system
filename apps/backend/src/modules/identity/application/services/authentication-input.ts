import type { DomainError } from '../../../../shared/errors/domain-error.js';
import { Result } from '../../../../shared/errors/result.js';
import { InvalidPrimitiveError } from '../../../../shared/primitives/invalid-primitive-error.js';
import { PasswordPolicyViolationError } from '../../domain/errors/credential.errors.js';
import { PlainPassword } from '../../domain/value-objects/plain-password.js';
import {
  isSessionId,
  sessionIdFrom,
  type SessionId,
} from '../../domain/value-objects/session-id.js';

/**
 * Turns raw client input into validated authentication values (IAM-005).
 *
 * The HTTP boundary already rejects a malformed body as a *client* mistake
 * (FND-006), but these use cases are also called from tests, jobs and other
 * application code, so each one owns the same decision in business terms: an
 * unusable secret is an expected outcome and comes back as
 * `Result.fail(PasswordPolicyViolationError)`, not as a thrown primitive error a
 * caller would have to treat as a bug.
 *
 * A non-string reaching here is a programming error, not a business one, so it
 * keeps propagating as `InvalidPrimitiveError` rather than being softened —
 * which is also why a *malformed* identifier is handled by each use case as the
 * not-found/rejected outcome that matches its own contract.
 */

/** Validates a raw secret against the password policy. */
export function parsePlainPassword(raw: unknown): Result<PlainPassword, DomainError> {
  try {
    return Result.ok(PlainPassword.from(raw as string));
  } catch (error) {
    if (error instanceof InvalidPrimitiveError) {
      return Result.fail(new PasswordPolicyViolationError());
    }
    throw error;
  }
}

/** Whether `raw` is a well-formed session identity. */
export function isWellFormedSessionId(raw: unknown): raw is string {
  return typeof raw === 'string' && isSessionId(raw);
}

/** Wraps a session identity that {@link isWellFormedSessionId} accepted. */
export function parseSessionId(raw: string): SessionId {
  return sessionIdFrom(raw);
}
