import { TenantDomainEvent } from '@shared/domain/events/tenant-domain-event';

/**
 * Raised when a tenant lifecycle status changes (ACTIVE → SUSPENDED →
 * ARCHIVED and back, issue #22). Carries the transition context for
 * downstream lock-out / notification concerns.
 */
export class TenantStatusChangedDomainEvent extends TenantDomainEvent {
  readonly eventName = 'TenantStatusChanged';

  constructor(
    tenantId: string,
    public readonly previousStatus: string,
    public readonly newStatus: string,
    public readonly reason: string,
  ) {
    super(tenantId);
  }
}
