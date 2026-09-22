import { CallHandler, ExecutionContext, Inject, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { finalize } from 'rxjs/operators';
import type { Request } from 'express';
import { TENANT_CONTEXT_PORT } from '@modules/tenants/application';
import type { TenantContextPort } from '@modules/tenants/application';
import { tenantId } from '@modules/tenants/domain';

const UUID_V4_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

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

    this.context.clear();
    if (tenantIdValue !== null) {
      this.context.setTenantId(tenantId(tenantIdValue));
    }

    return next.handle().pipe(finalize(() => this.context.clear()));
  }

  private parseTenantId(header: string | string[] | undefined): string | null {
    if (typeof header !== 'string') {
      return null;
    }

    const value = header.trim().toLowerCase();
    return UUID_V4_PATTERN.test(value) ? value : null;
  }
}
