import { ValueObject } from '@accounting-saas/ddd-core';
import { InvalidEmailError } from '../errors/invalid-email.error';

/**
 * RFC 5321-inspired local-part rules: alphanumerics plus the printable
 * characters commonly allowed in mailbox addresses, with no leading or
 * trailing dot and no consecutive dots. The domain part follows the same
 * rules split on `.` for each label.
 */
const EMAIL_PATTERN =
  /^(?!\.)(?!.*\.\.)[A-Za-z0-9._%+-]+(?<!\.)@[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)+$/;

/**
 * Email address value object. Stores the address normalised to lowercase
 * with surrounding whitespace trimmed. Structural validation rejects empty
 * strings, missing local/domain parts, and labels that violate RFC-style
 * rules; it intentionally does not verify that the address actually
 * delivers mail.
 */
export class Email extends ValueObject {
  private constructor(public readonly value: string) {
    super();
  }

  static of(candidate: string): Email {
    if (typeof candidate !== 'string') {
      throw new InvalidEmailError('Email must be a string');
    }
    const normalized = candidate.trim().toLowerCase();
    if (normalized.length === 0) {
      throw new InvalidEmailError('Email must not be empty');
    }
    if (normalized.length > 254) {
      // RFC 5321 caps the full address at 254 octets.
      throw new InvalidEmailError('Email exceeds the maximum length of 254 characters');
    }
    if (!EMAIL_PATTERN.test(normalized)) {
      throw new InvalidEmailError(`Invalid email address: ${candidate}`);
    }
    return new Email(normalized);
  }

  /** The local part (everything before the `@`). */
  get localPart(): string {
    return this.value.split('@')[0];
  }

  /** The domain part (everything after the `@`). */
  get domain(): string {
    return this.value.split('@')[1];
  }

  toString(): string {
    return this.value;
  }
}
