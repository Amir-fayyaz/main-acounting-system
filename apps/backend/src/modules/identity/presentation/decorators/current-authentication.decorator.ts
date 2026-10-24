import { createParamDecorator, type ExecutionContext } from '@nestjs/common';

import { AuthenticationStateRejectedError } from '../../domain/errors/authentication.errors.js';
import type { AuthenticatedSessionView } from '../../application/views/authenticated-session.view.js';
import type { AuthenticatedRequest } from '../http/authenticated-request.js';

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
