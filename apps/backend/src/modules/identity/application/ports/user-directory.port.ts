/**
 * The published identity contract a caller uses to resolve a user by its
 * primary contact email (IAM-002).
 *
 * Email is the one natural key a user has, and the uniqueness the store
 * enforces on it is what makes a lookup by email unambiguous. Callers that
 * provision data from configuration (the Product Owner bootstrap, the
 * development seeder) must ask this question instead of importing the user
 * repository, a Drizzle table or the aggregate — cross-module persistence
 * access is exactly what the module boundary forbids (ADR-002 section 12).
 *
 * The contract deliberately answers only "which active identity owns this
 * address, if any": no credential, no hash, no lifecycle history. A malformed
 * address is answered `undefined`, because it can never name a user.
 */
export interface UserDirectory {
  /** The identity registered for `email`, or `undefined` when none is. */
  findByEmail(email: string): Promise<UserDirectoryEntry | undefined>;
}

/** What the directory may disclose about a user it resolved. */
export interface UserDirectoryEntry {
  /** The stable user identity. */
  readonly userId: string;
  /** The lifecycle state, as its lower-case string value. */
  readonly status: string;
}
