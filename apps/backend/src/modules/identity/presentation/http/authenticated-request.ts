import type { AuthenticatedSessionView } from '../../application/views/authenticated-session.view.js';
import type { AuthenticatedPrincipalView } from '../../application/views/principal.view.js';

/**
 * The request state the authentication boundary attaches (IAM-005).
 *
 * The guard resolves the authentication state once and places both halves on the
 * request: the {@link AuthenticatedSessionView} (the session, for a sign-out or a
 * "who am I" read) and the {@link AuthenticatedPrincipalView} (the identity, for
 * anything that has to know who is acting). Controllers then read *this* rather
 * than the token, so a credential is handled exactly once per request, at the
 * boundary.
 *
 * The properties are optional because they exist only after the guard ran: a
 * decorator that finds them missing is a wiring mistake — an endpoint that
 * forgot to declare the guard — and says so instead of handing out an
 * unauthenticated request.
 */
export interface AuthenticatedRequest {
  readonly headers: Record<string, string | string[] | undefined>;
  authentication?: AuthenticatedSessionView;
  principal?: AuthenticatedPrincipalView;
}

/** The `Authorization` scheme this mechanism uses. */
const BEARER_SCHEME = /^Bearer\s+(.+)$/i;

/**
 * Reads the bearer token from an `Authorization` header.
 *
 * A missing header, a different scheme, an empty value or a non-string header
 * all answer `undefined`: the *reason* a request is unauthenticated is then
 * decided (and audited) in one place — the validation use case — instead of in
 * each transport primitive. Nothing here is trusted as an identity: the value
 * returned is only ever a lookup key, and it is discarded once it has been
 * digested.
 */
export function readBearerToken(header: string | string[] | undefined): string | undefined {
  const value = Array.isArray(header) ? header[0] : header;

  if (typeof value !== 'string') {
    return undefined;
  }

  const match = BEARER_SCHEME.exec(value.trim());
  const token = match?.[1]?.trim();

  return token === undefined || token === '' ? undefined : token;
}
