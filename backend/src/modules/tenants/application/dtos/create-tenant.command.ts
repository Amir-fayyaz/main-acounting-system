import { Command } from '@accounting-saas/ddd-core';
import type { SubscriptionPlanValue } from '@modules/tenants/domain';

/**
 * Write intent for registering a new tenant with its legal & financial
 * identity (issue #22). `subscriptionPlan` is optional and defaults to FREE
 * at the domain level.
 */
export class CreateTenantCommand extends Command {
  constructor(
    public readonly shopName: string,
    public readonly legalName: string,
    public readonly nationalId: string,
    public readonly baseCurrency: string,
    public readonly subscriptionPlan?: SubscriptionPlanValue,
  ) {
    super();
  }
}
