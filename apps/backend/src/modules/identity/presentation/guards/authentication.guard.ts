import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';

import { GetAuthenticatedSession } from '../../application/queries/get-authenticated-session.query.js';
import { GetAuthenticatedSessionUseCase } from '../../application/use-cases/get-authenticated-session.use-case.js';
import { readBearerToken, type AuthenticatedRequest } from '../http/authenticated-request.js';
import { raiseAuthenticationFailure } from '../http/authentication-error.mapper.js';

/**
 * The authentication boundary of the HTTP API (IAM-005; ADR-010 section 2;
 * ADR-013 section 5).
 *
 * It does one thing: before the endpoint's logic runs, it resolves the presented
 * `Authorization: Bearer <token>` header into an authenticated principal, or
 * refuses the request. Three properties are the point of having it here rather
 * than in each controller:
 *
 * - **Authentication happens exactly once per request, before the endpoint.**
 *   The token is read, digested and validated at the boundary; the endpoint sees
 *   only a principal, so no business code ever handles a credential and an
 *   endpoint cannot accidentally skip validation (`fail closed`, ADR-010
 *   section 13).
 * - **It authenticates and nothing else.** The guard does not read a tenant, a
 *   role or a permission, and it does not establish a tenant scope: access to a
 *   tenant stays dependent on membership and on the authorization rules that
 *   follow (ADR-010 section 4). A successful pass through this guard means "this
 *   is user X" — never "user X may do this".
 * - **It is the extension point for those rules.** Later authorization enforcement
 *   consumes the same request state (`request.principal`, put there right here)
 *   instead of re-reading the token, so the authentication context is ready and
 *   the security pipeline does not have to be redesigned when it arrives.
 *
 * A failure is raised through the shared error contract with the module's own
 * stable code and `401`, and the *reason* is already recorded by the use case
 * that resolved it: the guard itself makes no audit decision.
 */
@Injectable()
export class AuthenticationGuard implements CanActivate {
  public constructor(private readonly getAuthenticatedSession: GetAuthenticatedSessionUseCase) {}

  public async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();

    const outcome = await this.getAuthenticatedSession.execute(
      new GetAuthenticatedSession({ token: readBearerToken(request.headers['authorization']) }),
    );

    return outcome.match<boolean>({
      ok: (session) => {
        request.authentication = session;
        request.principal = session.principal;
        return true;
      },
      fail: (error) => raiseAuthenticationFailure(error),
    });
  }
}
