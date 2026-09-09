import { TenantDomainEvent } from '@shared/domain/events/tenant-domain-event';

/**
 * Raised when a new shop/tenant is registered (BR-TENANT-001). Carries the
 * immutable identity attributes captured at creation.
 */
export class TenantCreatedEvent extends TenantDomainEvent {
  readonly eventName = 'TenantCreated';

  constructor(
    tenantId: string,
    public readonly shopName: string,
    public readonly inventoryValuationMethod: string,
    public readonly subscriptionPlan: string,
  ) {
    super(tenantId);
  }
}
