import { createParamDecorator, type ExecutionContext } from '@nestjs/common';

import type { AuthorizationContextView } from '../../application/authorization/authorization-context.view.js';
import { AuthorizationContextInvalidError } from '../../domain/errors/authorization.errors.js';
import type { AuthenticatedRequest } from '../http/authenticated-request.js';

/**
 * Reads the authorization context the boundary resolved (IAM-006).
 *
 * An endpoint whose behaviour depends on *which* access it was granted — the
 * tenant it acts in, the capability set behind the decision — declares this
 * parameter and reads it, instead of resolving the tenant or the permissions
 * again (and instead of trusting a client-supplied identifier).
 *
 * Using it on an endpoint that declared no capability policy is a wiring
 * mistake, not a client error: it fails loudly with the authorization
 * vocabulary rather than handing the endpoint `undefined` and letting it
 * continue without an access context.
 */
export const CurrentAuthorization = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthorizationContextView => {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();

    if (request.authorization === undefined) {
      throw new AuthorizationContextInvalidError();
    }

    return request.authorization;
  },
);
