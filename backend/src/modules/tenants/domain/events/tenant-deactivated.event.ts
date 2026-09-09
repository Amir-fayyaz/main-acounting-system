import { TenantDomainEvent } from '@shared/domain/events/tenant-domain-event';

/**
 * Raised when a shop is deactivated (BR-USER-004). Downstream concern is
 * locking out tenant members; records are never physically deleted.
 */
export class TenantDeactivatedEvent extends TenantDomainEvent {
  readonly eventName = 'TenantDeactivated';

  constructor(tenantId: string) {
    super(tenantId);
  }
}
