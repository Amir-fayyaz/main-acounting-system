import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { defer, firstValueFrom, from, throwError, type Observable } from 'rxjs';

import {
  AUTHORIZATION_POLICY_METADATA,
  type AuthorizationPolicy,
} from '../authorization/authorization-policy.js';
import { ApiErrorException } from '../errors/api-error.exception.js';
import { API_ERROR_CODES } from '../errors/api-error.registry.js';
import { createTenantContext } from '../../../shared/tenant/tenant-context.js';
import { TenantScope } from '../../../shared/tenant/tenant-scope.js';

/**
 * Establishes the ambient tenant scope for HTTP handlers (TNT-002; SHR-007).
 *
 * Runs after the global `AuthorizationGuard`. For routes that declare a
 * tenant-scoped `@Authorize({ tenantParam })` policy, the interceptor reads the
 * same route parameter the guard already verified as a membership claim and
 * publishes it through `TenantScope.run`. Application code then uses
 * `TenantScope.require()` / `requireTenantId()` without each controller
 * re-deriving trust.
 *
 * Trusted source only: the route param named by `tenantParam` after the guard
 * has already checked active membership. Never body, free-form query, or an
 * unauthenticated client header.
 *
 * Fail closed: a tenant-scoped route whose param is missing or malformed
 * rejects with `TENANT_REQUIRED` (400). Non-tenant routes leave the scope
 * missing so system / public / auth-only work is unchanged.
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

    if (policy?.tenantParam === undefined) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest<{
      params?: Record<string, string | undefined>;
    }>();
    const claimed = request?.params?.[policy.tenantParam];

    if (claimed === undefined || typeof claimed !== 'string' || claimed.trim() === '') {
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
