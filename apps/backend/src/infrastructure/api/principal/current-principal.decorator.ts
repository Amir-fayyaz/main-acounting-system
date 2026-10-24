import { createParamDecorator, type ExecutionContext } from '@nestjs/common';

import { ApiErrorException } from '../errors/api-error.exception.js';
import { API_ERROR_CODES } from '../errors/api-error.registry.js';

/**
 * The authenticated identity a guarded request resolved (IAM-005).
 *
 * This is the API boundary's view of "who is acting", and it is deliberately
 * the minimum: a stable user id plus the user's own display attributes. It
 * carries no tenant, role or permission, so a handler cannot mistake
 * "authenticated" for "authorized" (ADR-010 section 4).
 */
export interface AuthenticatedPrincipal {
  /** The authenticated user's stable identity. */
  readonly userId: string;
  /** The user's current display name. */
  readonly displayName: string;
  /** The user's current primary contact email. */
  readonly email: string;
}

/** The request state the authentication guard publishes. */
interface PrincipalCarrier {
  readonly principal?: AuthenticatedPrincipal;
}

/**
 * Reads the authenticated principal the authentication boundary resolved.
 *
 * The endpoint declares the meaning — "this operation acts for whoever is
 * authenticated" — and the guard supplies it, so a controller never touches an
 * `Authorization` header, a token or a session record.
 *
 * It lives in the shared API infrastructure rather than in the module that owns
 * authentication because it is boundary vocabulary: any module's controller may
 * need the acting user, and no module may reach into another module's
 * presentation layer to get it (ADR-002 section 12).
 *
 * Using this decorator on an endpoint that did not declare the authentication
 * guard is a wiring mistake, not a client error, so it fails loudly with the
 * standard `401` instead of handing out `undefined` and letting the endpoint act
 * unauthenticated.
 */
export const CurrentPrincipal = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthenticatedPrincipal => {
    const request = context.switchToHttp().getRequest<PrincipalCarrier>();

    if (request.principal === undefined) {
      throw ApiErrorException.of(API_ERROR_CODES.UNAUTHORIZED);
    }

    return request.principal;
  },
);
