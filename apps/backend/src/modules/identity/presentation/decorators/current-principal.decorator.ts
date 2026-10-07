import { createParamDecorator, type ExecutionContext } from '@nestjs/common';

import { AuthenticationStateRejectedError } from '../../domain/errors/authentication.errors.js';
import type { AuthenticatedSessionView } from '../../application/views/authenticated-session.view.js';
import type { AuthenticatedPrincipalView } from '../../application/views/principal.view.js';
import type { AuthenticatedRequest } from '../http/authenticated-request.js';

/**
 * Reads the authenticated principal the boundary resolved (IAM-005).
 *
 * The endpoint declares the meaning — "this operation acts for whoever is
 * authenticated" — and the guard supplies it, so a controller never touches an
 * `Authorization` header, a token or a session record. The principal is
 * *identity only*: there is no tenant, role or permission to read from it, which
 * is what keeps an authenticated endpoint from silently becoming an authorized
 * one.
 *
 * Using this decorator on an endpoint that did not declare
 * `AuthenticationGuard` is a wiring mistake, not a client error, so it fails
 * loudly with the domain's rejection instead of handing out `undefined` and
 * letting the endpoint act unauthenticated.
 */
export const CurrentPrincipal = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthenticatedPrincipalView => {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();

    if (request.principal === undefined) {
      throw new AuthenticationStateRejectedError();
    }

    return request.principal;
  },
);

/**
 * Reads the validated authentication state, including the session metadata
 * (IAM-005).
 *
 * Used by the two endpoints whose subject *is* the session — reading the current
 * authentication state and invalidating it — so they act on the state the
 * boundary already validated rather than re-resolving the same token.
 */
export const CurrentAuthentication = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthenticatedSessionView => {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();

    if (request.authentication === undefined) {
      throw new AuthenticationStateRejectedError();
    }

    return request.authentication;
  },
);
