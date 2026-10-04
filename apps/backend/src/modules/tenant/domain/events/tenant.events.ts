import { DomainEvent } from '../../../../shared/messaging/domain-event.js';
import type { MessageOptions } from '../../../../shared/messaging/message-metadata.js';
import type { TenantStatusValue } from '../value-objects/tenant-status.js';

/**
 * The facts this module publishes (IAM-001; doc 09-domain/01-tenant-and-access,
 * "Domain Events": `TenantCreated`; ADR-005).
 *
 * Their bodies are plain, self-contained values — never the aggregate itself —
 * so the record of what happened cannot be edited after the fact and no
 * consumer receives a live object it might mutate. Each is raised by a use case
 * only after the state change actually happened, and travels through the outbox
 * in the same transaction (SHR-006).
 *
 * Names are past tense because an event is a fact; the kernel refuses anything
 * else.
 */

/** The information `TenantCreated` carries. */
export interface TenantCreatedData {
  readonly tenantId: string;
  readonly name: string;
  readonly status: TenantStatusValue;
}

/** A tenant was created at the root of a new tenant boundary. */
export class TenantCreated extends DomainEvent<TenantCreatedData> {
  public constructor(data: TenantCreatedData, options?: MessageOptions) {
    super('TenantCreated', data, options);
  }
}

/** The information `TenantProfileUpdated` carries. */
export interface TenantProfileUpdatedData {
  readonly tenantId: string;
  readonly name: string;
}

/** A tenant's mutable profile attribute (for now, its name) changed. */
export class TenantProfileUpdated extends DomainEvent<TenantProfileUpdatedData> {
  public constructor(data: TenantProfileUpdatedData, options?: MessageOptions) {
    super('TenantProfileUpdated', data, options);
  }
}

/** The information `TenantStatusChanged` carries. */
export interface TenantStatusChangedData {
  readonly tenantId: string;
  readonly from: TenantStatusValue;
  readonly to: TenantStatusValue;
}

/** A tenant's lifecycle state moved (activate / deactivate). */
export class TenantStatusChanged extends DomainEvent<TenantStatusChangedData> {
  public constructor(data: TenantStatusChangedData, options?: MessageOptions) {
    super('TenantStatusChanged', data, options);
  }
}
