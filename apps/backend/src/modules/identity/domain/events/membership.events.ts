import { DomainEvent } from '../../../../shared/messaging/domain-event.js';
import type { MessageOptions } from '../../../../shared/messaging/message-metadata.js';
import type { MembershipStatusValue } from '../value-objects/membership-status.js';

/**
 * The membership facts this module publishes (IAM-003; ADR-005).
 *
 * A membership is an access relationship that belongs to exactly one tenant, so
 * — unlike the tenant-independent `User` events — these facts are tenant-scoped
 * and carry the `tenantId`. That is what lets a later authentication flow react
 * to "this user may enter this tenant" without re-reading the membership, and
 * it is stamped from the ambient tenant scope (`tenantScopedMessageOptions`)
 * rather than copied from a client field.
 *
 * Their bodies are plain, self-contained values — never the aggregate itself —
 * so the record of what happened cannot be edited after the fact and no consumer
 * receives a live object it might mutate. Each is raised by a use case only
 * after the state change actually happened, and travels through the outbox in the
 * same transaction (SHR-006).
 *
 * Names are past tense because an event is a fact; the kernel refuses anything
 * else.
 */

/** The information `MembershipCreated` carries. */
export interface MembershipCreatedData {
  readonly membershipId: string;
  readonly userId: string;
  readonly tenantId: string;
  readonly status: MembershipStatusValue;
}

/** A user was linked to a tenant through a new membership. */
export class MembershipCreated extends DomainEvent<MembershipCreatedData> {
  public constructor(data: MembershipCreatedData, options?: MessageOptions) {
    super('MembershipCreated', data, options);
  }
}

/** The information `MembershipStatusChanged` carries. */
export interface MembershipStatusChangedData {
  readonly membershipId: string;
  readonly userId: string;
  readonly tenantId: string;
  readonly from: MembershipStatusValue;
  readonly to: MembershipStatusValue;
}

/** A membership's lifecycle state moved (activate / deactivate). */
export class MembershipStatusChanged extends DomainEvent<MembershipStatusChangedData> {
  public constructor(data: MembershipStatusChangedData, options?: MessageOptions) {
    super('MembershipStatusChanged', data, options);
  }
}
