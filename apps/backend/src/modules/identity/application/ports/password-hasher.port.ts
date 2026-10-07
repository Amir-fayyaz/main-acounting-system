import type { PasswordHash } from '../../domain/value-objects/password-hash.js';
import type { PlainPassword } from '../../domain/value-objects/plain-password.js';

/**
 * The approved password-hashing mechanism as the application sees it (IAM-005;
 * TECH-006; 06-security-engineering).
 *
 * The application layer must not depend on `node:crypto` or on any hashing
 * library, so it depends on this two-method port. The *algorithm and its cost
 * parameters are the adapter's documented engineering decision* — the same rule
 * TECH-006 states, so the decision lives in one place
 * (`infrastructure/security/scrypt-password-hasher.ts`) instead of being
 * invented at each call site.
 *
 * Two requirements are part of the contract, not of one implementation:
 *
 * - **A stored value is never reversible.** `hash` returns a self-describing
 *   {@link PasswordHash} (algorithm, parameters, per-credential salt, derived
 *   key) and nothing in this contract can turn it back into the secret.
 * - **Comparison is not a string comparison.** `verify` must compare derived
 *   values in constant time (or through a library that does), so the time it
 *   takes cannot tell an attacker how much of a guess was right. Returning
 *   `false` is the only answer for a mismatch — it never throws, so a use case
 *   cannot turn "wrong password" into a distinguishable failure by accident.
 *
 * The port is asynchronous because the approved mechanisms are deliberately
 * expensive and asynchronous usage keeps a slow derivation from blocking the
 * event loop when a caller chooses to run it in a worker.
 */
export interface PasswordHasher {
  /** Derives a storable hash from a validated secret. */
  hash(password: PlainPassword): Promise<PasswordHash>;

  /** Whether `password` produced `hash`. Constant-time by contract; never throws on a mismatch. */
  verify(password: PlainPassword, hash: PasswordHash): Promise<boolean>;

  /**
   * Performs the key-derivation work of a verification, discarding the result.
   *
   * Used when a sign-in cannot be verified against a real credential — an
   * unknown email or a user without a credential. Without this, "no such user"
   * would answer markedly faster than "wrong password", which is exactly the
   * timing side channel that makes account enumeration possible. The cost
   * parameters are the adapter's, so this spends the same work a real
   * verification would.
   */
  verifyWithoutCredential(password: PlainPassword): Promise<void>;
}
