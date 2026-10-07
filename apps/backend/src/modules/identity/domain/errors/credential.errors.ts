import { DomainError } from '../../../../shared/errors/domain-error.js';
import { ErrorCategory } from '../../../../shared/errors/error-category.js';
import {
  PLAIN_PASSWORD_MAX_LENGTH,
  PLAIN_PASSWORD_MIN_LENGTH,
} from '../value-objects/plain-password.js';

/**
 * Identity-owned credential failures (IAM-005).
 *
 * One failure covers the whole policy, and its detail states the rule rather
 * than the submitted value: a reason that named the secret — or a fragment of
 * it — would put that secret into an error contract a client, a log and an audit
 * record all see. Rejecting a malformed secret is always safe here because the
 * value is validated *before* it is hashed, so a rejection cannot become an
 * oracle about stored credentials.
 */
export class PasswordPolicyViolationError extends DomainError {
  public constructor() {
    super('PASSWORD_POLICY_VIOLATION', 'The password does not meet the minimum requirements.', {
      category: ErrorCategory.VALIDATION,
      details: [
        {
          code: 'PASSWORD_POLICY_VIOLATION',
          field: 'password',
          message:
            `password must be a non-blank string of at least ${PLAIN_PASSWORD_MIN_LENGTH} ` +
            `and at most ${PLAIN_PASSWORD_MAX_LENGTH} characters`,
        },
      ],
    });
  }
}
