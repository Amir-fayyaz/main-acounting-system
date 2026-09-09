import { Command } from '@accounting-saas/ddd-core';
import type { TenantId } from '@modules/tenants/domain';
import type { InventoryValuationMethodValue } from '@modules/tenants/domain';

/**
 * Write intent for switching a tenant's inventory valuation policy between
 * FIFO and LIFO (BR-REPORT-002).
 */
export class ChangeValuationMethodCommand extends Command {
  constructor(
    public readonly tenantId: TenantId,
    public readonly method: InventoryValuationMethodValue,
  ) {
    super();
  }
}
