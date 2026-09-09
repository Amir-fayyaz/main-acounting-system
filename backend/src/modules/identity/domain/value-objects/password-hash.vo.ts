import { ValueObject } from '@accounting-saas/ddd-core';
import { InvalidPasswordError } from '../errors/invalid-password.error';

/**
 * Recognised password-hash algorithm prefixes, in the canonical PHC string
 * format (e.g. `$2b$...`, `$argon2id$...`). Stored alongside the hash so
 * adapters can pick the right verifier without re-encoding the input.
 */
const PHC_PREFIX = /^\$(2[abxy]|argon2(i|d|id)|scrypt|pbkdf2)\$/i;

/**
 * A persisted password hash. The aggregate never holds a plaintext
 * password — application code receives the hash from a PasswordHasherPort
 * adapter and wraps it in this value object before passing it to the
 * domain layer.
 *
 * The object is opaque from the domain's perspective: it guards shape
 * (non-empty, recognised prefix, sensible length) but does not verify the
 * hash against any plaintext — that is the hash port's job.
 */
export class PasswordHash extends ValueObject {
  private constructor(public readonly value: string) {
    super();
  }

  static of(candidate: string): PasswordHash {
    if (typeof candidate !== 'string') {
      throw new InvalidPasswordError('Password hash must be a string');
    }
    if (candidate.length === 0) {
      throw new InvalidPasswordError('Password hash must not be empty');
    }
    if (candidate.length < 20) {
      // All supported algorithms produce hashes at least 20 characters
      // long; anything shorter is almost certainly a placeholder.
      throw new InvalidPasswordError('Password hash is suspiciously short');
    }
    if (candidate.length > 1024) {
      // Reject pathological inputs; real-world hashes stay under a few
      // hundred characters even with embedded parameters.
      throw new InvalidPasswordError('Password hash exceeds the maximum length of 1024 characters');
    }
    if (!PHC_PREFIX.test(candidate)) {
      throw new InvalidPasswordError('Password hash must start with a recognised algorithm prefix');
    }
    return new PasswordHash(candidate);
  }

  toString(): string {
    return this.value;
  }
}
