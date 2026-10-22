import type {
  AvailableTenantContext,
  TenantContext,
} from '../../../shared/tenant/tenant-context.js';
import { TenantScope } from '../../../shared/tenant/tenant-scope.js';
import type { TenantContextAccessor } from '../application/ports/tenant-context.port.js';

/**
 * Adapter of the `TenantContextAccessor` contract over the shared ambient
 * `TenantScope` (SHR-007). Stateless: the scope travels on AsyncLocalStorage,
 * so a single instance is safe for every request.
 */
export class ScopedTenantContext implements TenantContextAccessor {
  public current(): TenantContext {
    return TenantScope.current();
  }

  public require(): AvailableTenantContext {
    return TenantScope.require();
  }

  public currentTenantId(): string | undefined {
    return TenantScope.currentTenantId();
  }

  public requireTenantId(): string {
    return TenantScope.requireTenantId();
  }
}