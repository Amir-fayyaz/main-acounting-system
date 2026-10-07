import { describeValue } from '../../../../shared/primitives/assert.js';
import { InvalidPrimitiveError } from '../../../../shared/primitives/invalid-primitive-error.js';

/**
 * The stored form of an authentication token (IAM-005; ADR-010 section 11).
 *
 * A bearer token is a credential: whoever holds it is treated as the user. So
 * the token itself is never stored — only a one-way digest of it, which is
 * exactly what this primitive holds. Sign-in hands the raw token to the client
 * once; every later request is resolved by digesting the presented token and
 * looking *that* up, so a database read cannot reveal a usable token.
 *
 * The digest is a fixed-width, lower-case hexadecimal value: a hex encoding is
 * stable across environments, safe in a URL, and makes a corrupted record
 * obvious at the boundary instead of at comparison time. The digest algorithm
 * belongs to the token adapter (infrastructure), while the *shape* of a stored
 * token reference is judged here, like every other form-only rule in the domain.
 *
 * Like `PasswordHash`, the value never renders itself: `toString()` and
 * `toJSON()` return a placeholder, so a session cannot leak its token reference
 * into a log line or a response.
 */

/** Length of a SHA-256 digest in lower-case hexadecimal characters. */
export const SESSION_TOKEN_HASH_LENGTH = 64;

const DIGEST_PATTERN = /^[0-9a-f]{64}$/;

export class SessionTokenHash {
  /** The number of characters a well-formed digest has. */
  public static readonly LENGTH = SESSION_TOKEN_HASH_LENGTH;

  /** The canonical lower-case hexadecimal digest. */
  public readonly value: string;

  private constructor(value: string) {
    this.value = value;
  }

  /**
   * Wraps a digest, e.g. one the token adapter produced or one read from storage.
   *
   * @throws InvalidPrimitiveError — a malformed digest is a broken record or a
   * broken adapter, rejected rather than compared against a real token.
   */
  public static from(value: string): SessionTokenHash {
    if (typeof value !== 'string') {
      throw new InvalidPrimitiveError(
        'SessionTokenHash',
        `value must be a hexadecimal digest but received ${describeValue(value)}`,
      );
    }

    const normalized = value.trim().toLowerCase();

    if (!DIGEST_PATTERN.test(normalized)) {
      throw new InvalidPrimitiveError(
        'SessionTokenHash',
        `value must be ${SESSION_TOKEN_HASH_LENGTH} lower-case hexadecimal characters`,
      );
    }

    return new SessionTokenHash(normalized);
  }

  /** Whether `value` is a digest this primitive would accept. */
  public static is(value: unknown): boolean {
    return typeof value === 'string' && DIGEST_PATTERN.test(value.trim().toLowerCase());
  }

  /**
   * Value equality by digest.
   *
   * Comparing digests is not a secret comparison: the digest cannot be turned
   * back into a token, so this is an ordinary identity comparison — the
   * security-sensitive comparison is the derived password key, which the
   * hashing adapter performs in constant time.
   */
  public equals(other: unknown): boolean {
    return other instanceof SessionTokenHash && other.value === this.value;
  }

  public toString(): string {
    return 'SessionTokenHash(***)';
  }

  /** Serializing a token reference never reveals it. */
  public toJSON(): string {
    return this.toString();
  }
}
