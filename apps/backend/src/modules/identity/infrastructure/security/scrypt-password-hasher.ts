import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';

import { PasswordHash } from '../../domain/value-objects/password-hash.js';
import type { PlainPassword } from '../../domain/value-objects/plain-password.js';
import type { PasswordHasher } from '../../application/ports/password-hasher.port.js';

/**
 * The approved password-hashing mechanism (IAM-005; TECH-006;
 * 06-security-engineering; OWASP Password Storage Cheat Sheet).
 *
 * **Decision.** Credentials are hashed with **scrypt**, using the parameter set
 * OWASP documents for scrypt: `N = 2^17` (131072), `r = 8`, `p = 1`, a
 * 16-byte random salt per credential and a 64-byte derived key. scrypt is a
 * memory-hard key-derivation function, so the cost of a guessing attack is
 * dominated by memory as well as time; the parameters make one derivation both
 * slow and memory-hungry enough that offline guessing is impractical, while
 * staying comfortably under a second on ordinary hardware.
 *
 * **Why scrypt and not a new dependency.** TECH-006 delegates the algorithm and
 * its cost parameters to the implementation, on the condition that they are an
 * engineering decision rather than something invented at a call site, and
 * `package.json` gains no dependency here: `node:crypto` ships scrypt in every
 * supported Node release (`engines` requires >= 22), so the mechanism is audited
 * by the runtime, needs no native build in any environment, and cannot drift
 * from the platform. Argon2id is the other documented choice and would be
 * acceptable; it is deliberately *not* adopted in this issue, because it means
 * introducing a native package to every developer machine, the container image
 * and CI — a dependency decision with its own review (12-development-conventions)
 * — and the port below makes swapping the algorithm a one-file change:
 * `PasswordHash` already carries the algorithm name and its parameters, so
 * existing credentials stay verifiable and can be upgraded on their next
 * sign-in.
 *
 * **Verification.** The derivation is recomputed from the parameters *stored in
 * the record* and compared with `timingSafeEqual`, so the comparison does not
 * leak how much of a guessed secret matched. The salt and the expected key
 * length are read from the record too, which is what keeps a credential created
 * with different parameters verifiable instead of invalidated.
 *
 * **Hostile input.** A stored hash whose algorithm is not scrypt, whose
 * parameters are missing or absurd (a non-power-of-two `N`, a huge `r`/`p`, a
 * key longer than the contract allows) is answered with `false` rather than
 * being derived — an attacker who can write one row must not be able to make the
 * server spend unbounded CPU or memory on every sign-in attempt. A failure to
 * derive is also `false`: verification never throws, so a caller cannot turn
 * "cannot verify" into a distinguishable failure.
 */

/** The cost parameters of a freshly derived credential. */
export const SCRYPT_PARAMETERS = Object.freeze({
  /** CPU/memory cost: 2^17, the OWASP-documented scrypt setting. */
  cost: 131_072,
  /** Block size. */
  blockSize: 8,
  /** Parallelisation factor. */
  parallelization: 1,
  /** Length of the derived key, in bytes. */
  keyLength: 64,
  /** Length of the per-credential salt, in bytes. */
  saltLength: 16,
});

/** The algorithm name stored inside every encoded hash this adapter produces. */
export const SCRYPT_ALGORITHM = 'scrypt';

/** Largest accepted `N`, so a hostile record cannot demand unbounded memory. */
const MAX_COST = 1_048_576;

const MAX_BLOCK_SIZE = 32;
const MAX_PARALLELIZATION = 32;
const MIN_KEY_LENGTH = 16;
const MAX_KEY_LENGTH = 256;

export class ScryptPasswordHasher implements PasswordHasher {
  /**
   * Derives a fresh, salted hash of `password`.
   *
   * The salt is generated per call from the CSPRNG, so two users who choose the
   * same secret store different records and a precomputed table cannot be reused
   * against this database.
   *
   * @throws Error — a derivation failure here is a technical fault (the runtime
   * refusing the work), not a business outcome, so it propagates and the
   * operation fails rather than storing a credential nobody can verify.
   */
  public async hash(password: PlainPassword): Promise<PasswordHash> {
    const salt = randomBytes(SCRYPT_PARAMETERS.saltLength);
    const derivedKey = await derive(password.reveal(), salt, {
      cost: SCRYPT_PARAMETERS.cost,
      blockSize: SCRYPT_PARAMETERS.blockSize,
      parallelization: SCRYPT_PARAMETERS.parallelization,
      keyLength: SCRYPT_PARAMETERS.keyLength,
    });

    return PasswordHash.from(
      `${SCRYPT_ALGORITHM}(n=${SCRYPT_PARAMETERS.cost},r=${SCRYPT_PARAMETERS.blockSize},` +
        `p=${SCRYPT_PARAMETERS.parallelization})$${salt.toString('base64url')}` +
        `$${derivedKey.toString('base64url')}`,
    );
  }

  /**
   * Whether `password` produced `hash`, in constant time.
   *
   * Returns `false` — never throws — for a record this mechanism does not
   * support or cannot derive, so every non-match looks the same to the caller.
   */
  public async verify(password: PlainPassword, hash: PasswordHash): Promise<boolean> {
    const parameters = supportedParameters(hash);

    if (parameters === undefined) {
      return false;
    }

    try {
      const salt = Buffer.from(hash.salt, 'base64url');
      const expected = Buffer.from(hash.derivedKey, 'base64url');
      const derivedKey = await derive(password.reveal(), salt, {
        ...parameters,
        keyLength: expected.length,
      });

      return derivedKey.length === expected.length && timingSafeEqual(derivedKey, expected);
    } catch {
      return false;
    }
  }

  /**
   * Spends the same derivation work a real verification would, on a fixed salt.
   *
   * Used when no credential can be verified, so an unknown email or a user
   * without a credential costs an attacker the same as a wrong password and
   * cannot be distinguished by response time.
   */
  public async verifyWithoutCredential(password: PlainPassword): Promise<void> {
    await derive(password.reveal(), Buffer.alloc(SCRYPT_PARAMETERS.saltLength), {
      cost: SCRYPT_PARAMETERS.cost,
      blockSize: SCRYPT_PARAMETERS.blockSize,
      parallelization: SCRYPT_PARAMETERS.parallelization,
      keyLength: SCRYPT_PARAMETERS.keyLength,
    });
  }
}

interface SupportedParameters {
  readonly cost: number;
  readonly blockSize: number;
  readonly parallelization: number;
}

/**
 * The cost parameters of a stored hash, or `undefined` when it does not
 * describe work this adapter is willing to perform.
 */
function supportedParameters(hash: PasswordHash): SupportedParameters | undefined {
  if (hash.algorithm !== SCRYPT_ALGORITHM) {
    return undefined;
  }

  const cost = hash.parameters['n'];
  const blockSize = hash.parameters['r'];
  const parallelization = hash.parameters['p'];

  if (
    cost === undefined ||
    blockSize === undefined ||
    parallelization === undefined ||
    !isPowerOfTwo(cost) ||
    cost < 2 ||
    cost > MAX_COST ||
    blockSize < 1 ||
    blockSize > MAX_BLOCK_SIZE ||
    parallelization < 1 ||
    parallelization > MAX_PARALLELIZATION
  ) {
    return undefined;
  }

  const derivedKeyLength = Buffer.from(hash.derivedKey, 'base64url').length;

  if (derivedKeyLength < MIN_KEY_LENGTH || derivedKeyLength > MAX_KEY_LENGTH) {
    return undefined;
  }

  return { cost, blockSize, parallelization };
}

function isPowerOfTwo(value: number): boolean {
  return Number.isInteger(value) && value > 0 && (value & (value - 1)) === 0;
}

/** The parameters one derivation runs with, in this adapter's own vocabulary. */
interface DerivationOptions {
  readonly cost: number;
  readonly blockSize: number;
  readonly parallelization: number;
  readonly keyLength: number;
}

/** One scrypt derivation, promisified with the options this adapter uses. */
function derive(password: string, salt: Buffer, options: DerivationOptions): Promise<Buffer> {
  // scrypt's memory use is 128 * N * r bytes; Node refuses a derivation whose
  // need exceeds `maxmem` (32 MiB by default), so it is raised to twice the
  // requirement — enough headroom for the largest parameter set above, and still
  // bounded, because unsupported parameters are refused before this point.
  const maxmem = 256 * options.cost * options.blockSize;

  return new Promise<Buffer>((resolve, reject) => {
    scrypt(
      password,
      salt,
      options.keyLength,
      {
        N: options.cost,
        r: options.blockSize,
        p: options.parallelization,
        maxmem,
      },
      (error, derivedKey) => {
        if (error !== null) {
          reject(error);
          return;
        }
        resolve(derivedKey);
      },
    );
  });
}
