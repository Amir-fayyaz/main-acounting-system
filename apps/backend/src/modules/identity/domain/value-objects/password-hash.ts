import { describeValue } from '../../../../shared/primitives/assert.js';
import { InvalidPrimitiveError } from '../../../../shared/primitives/invalid-primitive-error.js';

/**
 * The one stored form of a credential (IAM-005; TECH-006; ADR-010 section 6).
 *
 * A password is never stored, and this type is what makes "never stored" and
 * "verifiable" the same thing: the value holds a **self-describing** encoded
 * derivation — algorithm, its cost parameters, the per-credential random salt
 * and the derived key — so verification needs nothing that is not in the record
 * and no separate configuration row to interpret it.
 *
 * ```text
 * scrypt(n=131072,r=8,p=1)$<salt base64url>$<derived key base64url>
 * ```
 *
 * Three properties matter:
 *
 * - **Peer-verifiable and upgradeable.** The algorithm and its parameters travel
 *   with the value, so raising the cost later does not invalidate existing
 *   credentials, and the hashing adapter can report which algorithm a record
 *   uses without reading the password.
 * - **Salt per credential.** The salt is part of the encoded value and the
 *   adapter generates a fresh one for every credential, so two users who choose
 *   the same password do not share a digest.
 * - **Never disclosed.** `toString()` and `toJSON()` report only the algorithm,
 *   so logging or serializing this object cannot leak hash material. Storage
 *   adapters read {@link PasswordHash.encoded} explicitly, and no view or DTO
 *   carries the value at all.
 *
 * The exact algorithm and cost parameters are an engineering decision owned by
 * the hashing adapter, not invented here: this primitive judges *form* only — a
 * well-formed, bounded, parseable encoded hash — exactly like every other shared
 * primitive judges form and never business meaning.
 */

/** Longest encoded hash this primitive stores; matches the storage column. */
export const PASSWORD_HASH_MAX_LENGTH = 512;

const MAX_ALGORITHM_LENGTH = 32;
const MAX_PARAMETERS = 6;
const MIN_SALT_LENGTH = 8;
const MAX_SALT_LENGTH = 128;
const MIN_DIGEST_LENGTH = 16;
const MAX_DIGEST_LENGTH = 256;

/** `algorithm(key=value,key=value)$salt$derivedKey`, each part base64url-safe. */
const ENCODED_PATTERN =
  /^([a-z][a-z0-9-]{0,31})(?:\(([^()]{1,200})\))?\$([A-Za-z0-9_-]{8,128})\$([A-Za-z0-9_-]{16,256})$/;

const PARAMETER_PATTERN = /^([a-z][a-z0-9_]{0,23})=(\d{1,10})$/;

export class PasswordHash {
  /** The largest encoded value {@link PasswordHash.from} accepts. */
  public static readonly MAX_LENGTH = PASSWORD_HASH_MAX_LENGTH;

  /** The algorithm that produced the derivation, e.g. `scrypt`. */
  public readonly algorithm: string;

  /** The cost parameters the algorithm was run with, e.g. `{ n: 131072, r: 8, p: 1 }`. */
  public readonly parameters: Readonly<Record<string, number>>;

  /** The per-credential random salt, base64url encoded. */
  public readonly salt: string;

  /** The derived key, base64url encoded. */
  public readonly derivedKey: string;

  /** The exact text a storage adapter persists and a verifier re-reads. */
  public readonly encoded: string;

  private constructor(
    algorithm: string,
    parameters: Readonly<Record<string, number>>,
    salt: string,
    derivedKey: string,
    encoded: string,
  ) {
    this.algorithm = algorithm;
    this.parameters = Object.freeze({ ...parameters });
    this.salt = salt;
    this.derivedKey = derivedKey;
    this.encoded = encoded;
  }

  /**
   * Wraps an encoded hash, e.g. one the hashing adapter just produced or one
   * read from storage.
   *
   * @throws InvalidPrimitiveError — a malformed, truncated or unbounded value
   * is rejected rather than stored: a hash this primitive cannot parse is a
   * credential that could never be verified, and accepting it would lock a user
   * out silently. The message never echoes the digest.
   */
  public static from(encoded: string): PasswordHash {
    if (typeof encoded !== 'string') {
      throw new InvalidPrimitiveError(
        'PasswordHash',
        `value must be a string but received ${describeValue(encoded)}`,
      );
    }

    const value = encoded.trim();

    if (value.length === 0 || value.length > PASSWORD_HASH_MAX_LENGTH) {
      throw new InvalidPrimitiveError(
        'PasswordHash',
        `value must be between 1 and ${PASSWORD_HASH_MAX_LENGTH} characters but received ${value.length}`,
      );
    }

    const match = ENCODED_PATTERN.exec(value);

    if (match === null) {
      throw new InvalidPrimitiveError(
        'PasswordHash',
        'value must be an encoded hash shaped "<algorithm>(<params>)$<salt>$<derivedKey>"',
      );
    }

    const algorithm = match[1] as string;
    const parameters = parseParameters(match[2]);
    const salt = match[3] as string;
    const derivedKey = match[4] as string;

    if (salt.length < MIN_SALT_LENGTH || salt.length > MAX_SALT_LENGTH) {
      throw new InvalidPrimitiveError(
        'PasswordHash',
        `salt must be between ${MIN_SALT_LENGTH} and ${MAX_SALT_LENGTH} characters`,
      );
    }

    if (derivedKey.length < MIN_DIGEST_LENGTH || derivedKey.length > MAX_DIGEST_LENGTH) {
      throw new InvalidPrimitiveError(
        'PasswordHash',
        `derived key must be between ${MIN_DIGEST_LENGTH} and ${MAX_DIGEST_LENGTH} characters`,
      );
    }

    if (algorithm.length > MAX_ALGORITHM_LENGTH) {
      throw new InvalidPrimitiveError(
        'PasswordHash',
        `algorithm must be at most ${MAX_ALGORITHM_LENGTH} characters`,
      );
    }

    return new PasswordHash(algorithm, parameters, salt, derivedKey, value);
  }

  /** Whether `encoded` is a value this primitive would accept. */
  public static isEncoded(encoded: unknown): boolean {
    if (typeof encoded !== 'string') {
      return false;
    }

    try {
      PasswordHash.from(encoded);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Value equality by the encoded text.
   *
   * Comparing hashes is not a secret comparison: both sides are already derived
   * values that cannot be turned back into the password, and equality is only
   * used to detect an unchanged credential.
   */
  public equals(other: unknown): boolean {
    return other instanceof PasswordHash && other.encoded === this.encoded;
  }

  /** Reports the algorithm only; the digest never reaches a log line. */
  public toString(): string {
    return `PasswordHash(${this.algorithm})`;
  }

  /** Serializing a stored hash never reveals it. */
  public toJSON(): string {
    return this.toString();
  }
}

/** Parses `key=value,key=value`, rejecting anything that is not a bounded counter. */
function parseParameters(raw: string | undefined): Readonly<Record<string, number>> {
  if (raw === undefined || raw === '') {
    return {};
  }

  const parts = raw.split(',');

  if (parts.length > MAX_PARAMETERS) {
    throw new InvalidPrimitiveError(
      'PasswordHash',
      `value must declare at most ${MAX_PARAMETERS} cost parameters`,
    );
  }

  const parameters: Record<string, number> = {};

  for (const part of parts) {
    const match = PARAMETER_PATTERN.exec(part);

    if (match === null) {
      throw new InvalidPrimitiveError(
        'PasswordHash',
        'cost parameters must be written as "key=value" with a lower-case key and an integer value',
      );
    }

    const key = match[1] as string;
    const value = Number(match[2]);

    if (!Number.isSafeInteger(value)) {
      throw new InvalidPrimitiveError('PasswordHash', `cost parameter "${key}" is out of range`);
    }

    parameters[key] = value;
  }

  return parameters;
}
