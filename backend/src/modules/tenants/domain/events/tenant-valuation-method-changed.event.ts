import { TenantDomainEvent } from '@shared/domain/events/tenant-domain-event';

/**
 * Raised when a tenant switches inventory valuation between FIFO and LIFO
 * (BR-REPORT-002).
 */
export class TenantValuationMethodChangedEvent extends TenantDomainEvent {
  readonly eventName = 'TenantValuationMethodChanged';

  constructor(
    tenantId: string,
    public readonly previousMethod: string,
    public readonly nextMethod: string,
  ) {
    super(tenantId);
  }
}
