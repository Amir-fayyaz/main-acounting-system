import { CanActivate, ExecutionContext, Inject, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import {
  AuthorizationPolicyMissingError,
  TenantContextRequiredError,
} from '../../domain/errors/authorization.errors.js';
import { PermissionKey } from '../../domain/value-objects/permission-key.js';
import { GetAuthenticatedSession } from '../../application/queries/get-authenticated-session.query.js';
import { GetAuthenticatedSessionUseCase } from '../../application/use-cases/get-authenticated-session.use-case.js';
import { AUTHORIZATION } from '../../application/authorization/authorization.tokens.js';
import type { Authorization } from '../../application/ports/authorization.port.js';
import {
  AUTHENTICATED_ENDPOINT_METADATA,
  AUTHORIZATION_POLICY_METADATA,
  PUBLIC_ENDPOINT_METADATA,
  type AuthorizationPolicy,
} from '../../../../infrastructure/api/authorization/authorization-policy.js';
import type { AuthenticatedRequest } from '../http/authenticated-request.js';
import { readBearerToken } from '../http/authenticated-request.js';
import { raiseAuthenticationFailure } from '../http/authentication-error.mapper.js';
import { raiseAuthorizationFailure } from '../http/authorization-error.mapper.js';

/**
 * The authorization boundary of the HTTP API (IAM-006; ADR-010 sections 2, 3, 4
 * and 13).
 *
 * It runs before any endpoint's logic and answers two questions in order: *who
 * is calling* (authentication, IAM-005) and *may they do this* (authorization,
 * this issue). Only when both are satisfied does the request reach the handler,
 * so a protected business action is never partially executed and an access
 * decision never depends on the handler remembering to check.
 *
 * The check is a **classification** of the operation, not a per-call guess:
 *
 * ```text
 * @Public()            → allowed, no identity required
 * @RequiresAuthentication() → authenticated only
 * @Authorize(policy)   → authenticated + capability (+ membership in the target tenant)
 * nothing declared     → DENIED  (fail closed)
 * ```
 *
 * Four properties are load-bearing:
 *
 * - **Deny by default.** An unclassified operation is refused, so adding a new
 *   endpoint cannot accidentally add an open one — the author must state what it
 *   requires.
 * - **The tenant is verified, never accepted.** The route's tenant identifier is
 *   read as a *claim* and checked against the caller's own membership through
 *   the reusable authorization contract; a forged identifier fails exactly like
 *   a tenant that does not exist. The `TenantScope` a handler later establishes
 *   therefore always rests on a membership that was proven here.
 * - **Fail closed in every branch.** An unknown token, a missing policy, an
 *   unsatisfiable requirement and an inconsistent context all end the request;
 *   none of them falls through to the handler.
 * - **It grants nothing of its own.** The decision comes from the application
 *   contract (`AUTHORIZATION`), which a use case, a job or another module can
 *   call without HTTP — this guard is an entry point into that decision, not a
 *   second implementation of it.
 */
@Injectable()
export class AuthorizationGuard implements CanActivate {
  public constructor(
    private readonly reflector: Reflector,
    private readonly getAuthenticatedSession: GetAuthenticatedSessionUseCase,
    @Inject(AUTHORIZATION) private readonly authorization: Authorization,
  ) {}

  public async canActivate(context: ExecutionContext): Promise<boolean> {
    const handler = context.getHandler();
    const controller = context.getClass();

    if (this.declared<boolean>(PUBLIC_ENDPOINT_METADATA, [handler, controller]) === true) {
      return true;
    }

    const policy = this.declared<AuthorizationPolicy>(AUTHORIZATION_POLICY_METADATA, [
      handler,
      controller,
    ]);
    const authenticatedOnly =
      this.declared<boolean>(AUTHENTICATED_ENDPOINT_METADATA, [handler, controller]) === true;

    if (policy === undefined && !authenticatedOnly) {
      // Deny by default: nothing declared what this operation requires.
      return raiseAuthorizationFailure(new AuthorizationPolicyMissingError());
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const principal = await this.resolvePrincipal(request);

    if (policy === undefined) {
      return true;
    }

    if (!PermissionKey.is(policy.permission)) {
      // A malformed declared capability is a wiring mistake, and the safe
      // answer to it is the same as to a missing one.
      return raiseAuthorizationFailure(new AuthorizationPolicyMissingError());
    }

    const targetTenantId = this.targetTenant(request, policy);

    const outcome = await this.authorization.authorize({
      principal,
      requiredPermission: PermissionKey.from(policy.permission),
      targetTenantId,
    });

    return outcome.match<boolean>({
      ok: (authorization) => {
        request.authorization = authorization;
        return true;
      },
      fail: (error) => raiseAuthorizationFailure(error),
    });
  }

  /**
   * Reads a declared value from the handler, falling back to the controller, so
   * a policy may be applied at whichever level reads most naturally.
   */
  private declared<T>(
    metadata: string,
    targets: Parameters<Reflector['getAllAndOverride']>[1],
  ): T | undefined {
    return this.reflector.getAllAndOverride<T | undefined>(metadata, targets);
  }

  /**
   * Resolves the authenticated principal, reusing the authentication boundary's
   * result when it already ran so a request is authenticated once.
   */
  private async resolvePrincipal(request: AuthenticatedRequest): Promise<{
    userId: string;
    displayName: string;
    email: string;
  }> {
    if (request.principal !== undefined) {
      return request.principal;
    }

    const outcome = await this.getAuthenticatedSession.execute(
      new GetAuthenticatedSession({ token: readBearerToken(request.headers['authorization']) }),
    );

    return outcome.match<{
      userId: string;
      displayName: string;
      email: string;
    }>({
      ok: (session) => {
        request.authentication = session;
        request.principal = session.principal;
        return session.principal;
      },
      fail: (error) => raiseAuthenticationFailure(error),
    });
  }

  /**
   * The tenant the operation targets: the route's parameter value as a claim.
   *
   * A tenant-scoped policy whose parameter is absent from the route is answered
   * as *invalid tenant context* rather than being silently treated as a
   * platform requirement — an endpoint must not become less protected because a
   * parameter name was mistyped.
   */
  private targetTenant(
    request: AuthenticatedRequest,
    policy: AuthorizationPolicy,
  ): string | undefined {
    if (policy.tenantParam === undefined) {
      return undefined;
    }

    const claimed = request.params?.[policy.tenantParam];

    if (claimed === undefined || claimed.trim() === '') {
      return raiseAuthorizationFailure(new TenantContextRequiredError());
    }

    return claimed;
  }
}
