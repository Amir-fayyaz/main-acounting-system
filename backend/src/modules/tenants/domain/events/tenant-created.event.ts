import { TenantDomainEvent } from '@shared/domain/events/tenant-domain-event';

/**
 * Raised when a new tenant is registered with its legal & financial identity
 * (issue #22). Carries the immutable attributes captured at creation.
 */
export class TenantCreatedDomainEvent extends TenantDomainEvent {
  readonly eventName = 'TenantCreated';

  constructor(
    tenantId: string,
    public readonly legalName: string,
    public readonly baseCurrency: string,
    public readonly createdAt: Date,
  ) {
    super(tenantId);
  }
}
