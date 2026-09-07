import type { DomainEvent } from '../domain-event';

/**
 * Base class for events about tenant-owned data. Events must preserve tenant
 * context (wiki/architecture/application-architecture.md, section 11).
 */
export abstract class TenantDomainEvent implements DomainEvent {
  abstract readonly eventName: string;
  readonly occurredAt = new Date();

  constructor(readonly tenantId: string) {}
}
