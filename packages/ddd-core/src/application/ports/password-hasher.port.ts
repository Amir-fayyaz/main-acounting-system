/** Injection token for the PasswordHasher port (framework-agnostic symbol). */
export const PASSWORD_HASHER = Symbol('PASSWORD_HASHER');

/**
 * Application-owned port for password hashing and verification. Domain and
 * application code depend on this contract only; the chosen algorithm
 * (bcrypt, argon2, scrypt, ...) lives in an infrastructure adapter.
 *
 * The hash format is opaque to callers — adapters may encode algorithm,
 * cost, and salt inline. Implementations must be constant-time for the
 * verify step and use a slow, salted KDF for the hash step.
 */
export interface PasswordHasher {
  /** Produce a salted, slow-hashed representation of a plaintext password. */
  hash(plain: string): Promise<string>;

  /**
   * Compare a plaintext candidate against a previously produced hash. Must
   * return `false` for any malformed or unsupported hash input rather than
   * throwing — verification is part of the login critical path.
   */
  verify(plain: string, hash: string): Promise<boolean>;
}
