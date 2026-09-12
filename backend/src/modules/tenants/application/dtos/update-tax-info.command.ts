import { Command } from '@accounting-saas/ddd-core';
import type { TenantId } from '@modules/tenants/domain';

/**
 * Write intent for updating a tenant's legal tax identity (issue #24).
 */
export class UpdateTaxInfoCommand extends Command {
  constructor(
    public readonly tenantId: TenantId,
    public readonly legalName: string,
    public readonly nationalId: string,
  ) {
    super();
  }
}
