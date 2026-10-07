import type { SessionTokenHash } from '../../domain/value-objects/session-token-hash.js';

/**
 * The bearer token adapter as the application sees it (IAM-005; ADR-010
 * section 11).
 *
 * A session is identified by a random token, never by a value derived from the
 * user or the clock: guessability is the whole attack surface of a bearer
 * credential, so the token adapter owns generation and the one-way digest.
 *
 * Two properties are part of the contract:
 *
 * - **`issue` returns the token once.** The application hands the token to the
 *   client in the sign-in response and stores only `hash`; nothing can ask the
 *   adapter to reproduce a token, so a token cannot be recovered from the
 *   system later.
 * - **`hash` is deterministic.** Resolving a presented token requires computing
 *   the same digest the sign-in stored, so the digest algorithm must not be
 *   salted with a per-call value. The token's unguessability supplies the
 *   entropy; the digest only keeps the stored form useless as a credential.
 */
export interface SessionTokenService {
  /** A fresh token and the digest a session stores for it. */
  issue(): IssuedSessionToken;

  /** The digest of a presented token, as it would have been stored at sign-in. */
  hash(token: string): SessionTokenHash;
}

/** A freshly issued token, paired with the digest its session stores. */
export interface IssuedSessionToken {
  /** The credential handed to the client exactly once. */
  readonly token: string;
  /** What is persisted instead of the token. */
  readonly hash: SessionTokenHash;
}
