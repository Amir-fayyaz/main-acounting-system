import { AsyncLocalStorage } from 'node:async_hooks';
import { Injectable } from '@nestjs/common';
import type { TenantId } from '@modules/tenants/domain';
import type { TenantContextPort } from '../ports/tenant-context.port';

/**
 * Request-scoped tenant context implemented on AsyncLocalStorage so that
 * asynchronous continuation is preserved without leaking the tenant between
 * concurrent requests (BR-TENANT-002). The header interceptor runs the
 * handler inside `run()`, so every downstream call within the same async
 * context observes the bound tenant id.
 */
@Injectable()
export class TenantContextService implements TenantContextPort {
  private readonly storage = new AsyncLocalStorage<TenantId>();

  getTenantId(): TenantId | null {
    return this.storage.getStore() ?? null;
  }

  setTenantId(tenantId: TenantId): void {
    this.storage.enterWith(tenantId);
  }

  clear(): void {
    this.storage.disable();
  }
}
