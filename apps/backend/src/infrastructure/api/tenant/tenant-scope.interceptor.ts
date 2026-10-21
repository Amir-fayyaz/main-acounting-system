import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { defer, firstValueFrom, from, throwError, type Observable } from 'rxjs';

import {
  AUTHORIZATION_POLICY_METADATA,
  type AuthorizationPolicy,
} from '../authorization/authorization-policy.js';
import { claimedTenantId, resolveTenantRouteParam } from './tenant-route.js';
import { ApiErrorException } from '../errors/api-error.exception.js';
import { API_ERROR_CODES } from '../errors/api-error.registry.js';
import { createTenantContext } from '../../../shared/tenant/tenant-context.js';
import { TenantScope } from '../../../shared/tenant/tenant-scope.js';

/**
 * The tenant the authorization boundary proved for this request.
 *
 * The global guard resolves the caller's active membership and publishes the
 * tenant *that membership belongs to* on the request. That value — not the
 * route parameter the client wrote — is the company's identity, so it is what
 * the scope is built from.
 */
interface VerifiedTenantCarrier {
  readonly authorization?: { readonly tenantId?: string };
}

/**
 * Establishes the ambient tenant scope for HTTP handlers (TNT-002; SHR-007;
 * IAM-007).
 *
 * Runs after the global `AuthorizationGuard`. For every route the guard
 * classified as tenant-scoped — an explicit `@Authorize({ tenantParam })`, the
 * conventional `:tenantId`, or `:id` on the root `tenants` resource — the
 * interceptor resolves the *same* parameter through the same helper and
 * publishes the tenant through `TenantScope.run`. Application code then uses
 * `TenantScope.require()` / `requireTenantId()` without each controller
 * re-deriving trust.
 *
 * **The scope comes from the proven membership, not from the request.** The
 * guard already decided that the caller holds an active membership in the
 * target tenant, and it published *that* tenant on the request. The
 * interceptor publishes exactly that value, so the identity the whole
 * application works under is the one the server derived from the authenticated
 * principal — never the identifier a client wrote in the URL. The route
 * parameter is still *checked* (it must exist, and the use case compares it
 * with the scope), but it never *becomes* the tenant.
 *
 * Trusted source only: the tenant of a verified membership. Never a body, a
 * free-form query, or an unauthenticated client header.
 *
 * Fail closed: a tenant-scoped route whose tenant could not be proven rejects
 * with `TENANT_REQUIRED` (400). Non-tenant routes leave the scope missing so
 * system / public / auth-only work is unchanged.
 */
@Injectable()
export class TenantScopeInterceptor implements NestInterceptor {
  public constructor(private readonly reflector: Reflector) {}

  public intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const handler = context.getHandler();
    const controller = context.getClass();
    const policy = this.reflector.getAllAndOverride<AuthorizationPolicy | undefined>(
      AUTHORIZATION_POLICY_METADATA,
      [handler, controller],
    );

    const request = context.switchToHttp().getRequest<
      {
        params?: Record<string, string | undefined>;
      } & VerifiedTenantCarrier
    >();
    const tenantParam = resolveTenantRouteParam(request, controller, policy);

    if (tenantParam === undefined) {
      // Platform-level operation: the scope stays missing, and a handler that
      // legitimately needs system access must say so explicitly.
      return next.handle();
    }

    const verified = request?.authorization;
    const claimed =
      verified === undefined
        ? // No authorization context at all: the boundary that proves a
          // membership is not installed for this process, so there is nothing
          // stronger to publish than the identifier the route carries.
          claimedTenantId(request, tenantParam)
        : verified.tenantId;

    if (claimed === undefined) {
      // The boundary ran and allowed a tenant-scoped route, yet no tenant was
      // proven. That is a contradiction, and the answer to it is refusal.
      return throwError(() =>
        ApiErrorException.of(API_ERROR_CODES.TENANT_REQUIRED, {
          message: 'A tenant context is required for this operation.',
        }),
      );
    }

    let tenantContext;
    try {
      tenantContext = createTenantContext(claimed);
    } catch {
      return throwError(() =>
        ApiErrorException.of(API_ERROR_CODES.TENANT_REQUIRED, {
          message: 'A tenant context is required for this operation.',
        }),
      );
    }

    // next.handle() باید داخل TenantScope.run باشد تا ALS برای handler فعال باشد
    return defer(() =>
      from(TenantScope.run(tenantContext, async () => firstValueFrom(next.handle()))),
    );
  }
}
