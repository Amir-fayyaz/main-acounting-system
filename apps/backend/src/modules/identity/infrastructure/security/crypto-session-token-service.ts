import { createHash, randomBytes } from 'node:crypto';

import { SessionTokenHash } from '../../domain/value-objects/session-token-hash.js';
import type {
  IssuedSessionToken,
  SessionTokenService,
} from '../../application/ports/session-token-service.port.js';

/**
 * The bearer-token mechanism (IAM-005; ADR-010 section 11).
 *
 * **Token.** 256 bits from the CSPRNG, base64url encoded. The entropy is what
 * makes the credential unguessable; it is generated fresh for every session and
 * is unrelated to the user, the session id and the clock, so nothing about the
 * user can be derived from a token and two tokens can never collide by
 * construction.
 *
 * **Storage.** Only `sha256(token)` is stored, as the
 * {@link SessionTokenHash} the session aggregate holds. A plain hash — not a
 * password-style slow derivation — is the right tool here: the input is already
 * 256 random bits, so there is nothing to brute-force and no dictionary to try,
 * while the lookup on every authenticated request must stay cheap. The digest is
 * unsalted on purpose, so the same presented token always resolves to the same
 * stored record; the token's own entropy is what keeps the stored value useless
 * to someone who reads it.
 *
 * **Exposure.** A token is returned to the client exactly once, by the sign-in
 * use case, and this adapter exposes no way to reproduce it from a record.
 */
export const SESSION_TOKEN_BYTES = 32;

export class CryptoSessionTokenService implements SessionTokenService {
  /** A fresh token and the digest its session stores. */
  public issue(): IssuedSessionToken {
    const token = randomBytes(SESSION_TOKEN_BYTES).toString('base64url');
    return { token, hash: this.hash(token) };
  }

  /** The digest of a presented token, as it was computed at sign-in. */
  public hash(token: string): SessionTokenHash {
    return SessionTokenHash.from(createHash('sha256').update(token, 'utf8').digest('hex'));
  }
}
