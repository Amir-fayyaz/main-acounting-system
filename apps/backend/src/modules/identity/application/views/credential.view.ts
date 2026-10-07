/**
 * The result of establishing a credential (IAM-005).
 *
 * Establishing a credential is a security-sensitive mutation, so the caller is
 * told what changed without being handed anything that could verify or
 * authenticate a user: the owning identity, the algorithm that now stores the
 * secret, whether an existing credential was replaced, and how many sessions the
 * change invalidated.
 *
 * The hash is absent by design: no view of a credential exists that could carry
 * it, which is what makes "password hashes are never returned by the API" a
 * property of the shape rather than a rule someone has to remember.
 */
export interface CredentialView {
  /** The user whose credential was established. */
  readonly userId: string;
  /** The algorithm of the stored derivation, e.g. `scrypt`. */
  readonly algorithm: string;
  /** Whether an existing credential was replaced rather than created. */
  readonly replaced: boolean;
  /** How many active sessions the change invalidated. */
  readonly sessionsInvalidated: number;
  /** When the credential was established, ISO-8601 in UTC. */
  readonly updatedAt: string;
}
