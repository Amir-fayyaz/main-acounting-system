/** Injection token for the TokenProvider port (framework-agnostic symbol). */
export const TOKEN_PROVIDER = Symbol('TOKEN_PROVIDER');

/**
 * Payload carried by an authentication token. Specific schemas (access
 * tokens, refresh tokens, password-reset tokens, ...) build on this base.
 * Adapter implementations decide how the payload is encoded (JWT claims,
 * opaque session ids, etc.).
 */
export interface TokenPayload {
  /** Subject — typically the user or principal identifier. */
  readonly sub: string;
  /** Token issuer — usually the platform or tenant context. */
  readonly iss?: string;
  /** Expiration as a Unix epoch in seconds. */
  readonly exp?: number;
  /** Issued-at as a Unix epoch in seconds. */
  readonly iat?: number;
  /** Free-form claims. Adapters ignore keys they do not understand. */
  readonly [claim: string]: unknown;
}

/**
 * Application-owned port for issuing and verifying authentication tokens.
 * Domain and application code depend on this contract only; the concrete
 * format (signed JWT, opaque session token, ...) lives in an infrastructure
 * adapter.
 *
 * Verify must throw a domain error (UnauthorizedError / ValidationError) on
 * malformed, expired, or otherwise invalid input rather than returning a
 * boolean, so the caller cannot accidentally treat a structurally-broken
 * token as a successful no-op verification.
 */
export interface TokenProvider {
  /** Issue a token for the given payload. */
  sign(payload: TokenPayload): Promise<string>;

  /** Verify and decode a previously-issued token. Throws on failure. */
  verify(token: string): Promise<TokenPayload>;
}
