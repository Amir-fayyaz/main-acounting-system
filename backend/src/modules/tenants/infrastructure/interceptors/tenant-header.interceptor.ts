import { CallHandler, ExecutionContext, Inject, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import type { Request } from 'express';
import { TENANT_CONTEXT_PORT } from '@modules/tenants/application';
import type { TenantContextPort } from '@modules/tenants/application';
import { tenantId } from '@modules/tenants/domain';

/**
 * Bridges the `x-tenant-id` HTTP header into the application tenant context
 * (BR-TENANT-002). Strips surrounding whitespace, then runs the request
 * handler with the tenant bound. The context is cleared after the response
 * completes to prevent request bleeding across concurrent requests.
 */
@Injectable()
export class TenantHeaderInterceptor implements NestInterceptor {
  constructor(@Inject(TENANT_CONTEXT_PORT) private readonly context: TenantContextPort) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request>();
    const header = request.headers['x-tenant-id'];
    const tenantIdValue = this.parseTenantId(header);

    if (tenantIdValue !== null) {
      this.context.setTenantId(tenantId(tenantIdValue));
    }

    return next.handle().pipe(tap({ complete: () => this.context.clear() }));
  }

  private parseTenantId(header: string | string[] | undefined): string | null {
    if (typeof header !== 'string') {
      return null;
    }
    const value = header.trim();
    return value.length === 0 ? null : value;
  }
}
