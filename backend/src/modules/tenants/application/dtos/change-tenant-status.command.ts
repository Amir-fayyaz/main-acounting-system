import { Command } from '@accounting-saas/ddd-core';
import type { TenantId, TenantStatusValue } from '@modules/tenants/domain';

/**
 * Write intent for changing a tenant's lifecycle status via suspend/reactivate
 * (issue #24). `reason` documents why the transition happened.
 */
export class ChangeTenantStatusCommand extends Command {
  constructor(
    public readonly tenantId: TenantId,
    public readonly status: Exclude<TenantStatusValue, 'DEACTIVATED'>,
    public readonly reason: string,
  ) {
    super();
  }
}
