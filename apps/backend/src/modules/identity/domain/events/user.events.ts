import { DomainEvent } from '../../../../shared/messaging/domain-event.js';
import type { MessageOptions } from '../../../../shared/messaging/message-metadata.js';
import type { UserStatusValue } from '../value-objects/user-status.js';

/**
 * The facts this module publishes (IAM-002; ADR-005).
 *
 * Their bodies are plain, self-contained values — never the aggregate itself —
 * so the record of what happened cannot be edited after the fact and no consumer
 * receives a live object it might mutate. Each is raised by a use case only
 * after the state change actually happened, and travels through the outbox in the
 * same transaction (SHR-006).
 *
 * A User is tenant-independent, so these events deliberately carry **no
 * tenantId**: the identity of a person is not scoped to a tenant, and stamping a
 * tenant here would smuggle membership into the identity model. Tenant-scoped
 * facts arrive with the membership relationship in a later issue.
 *
 * Names are past tense because an event is a fact; the kernel refuses anything
 * else.
 */

/** The information `UserCreated` carries. */
export interface UserCreatedData {
  readonly userId: string;
  readonly displayName: string;
  readonly email: string;
}

/** A new system identity was created. */
export class UserCreated extends DomainEvent<UserCreatedData> {
  public constructor(data: UserCreatedData, options?: MessageOptions) {
    super('UserCreated', data, options);
  }
}

/** The information `UserProfileUpdated` carries. */
export interface UserProfileUpdatedData {
  readonly userId: string;
  readonly displayName: string;
  readonly email: string;
}

/** A user's mutable profile attributes (display name and/or email) changed. */
export class UserProfileUpdated extends DomainEvent<UserProfileUpdatedData> {
  public constructor(data: UserProfileUpdatedData, options?: MessageOptions) {
    super('UserProfileUpdated', data, options);
  }
}

/** The information `UserStatusChanged` carries. */
export interface UserStatusChangedData {
  readonly userId: string;
  readonly from: UserStatusValue;
  readonly to: UserStatusValue;
}

/** A user's lifecycle state moved (activate / deactivate). */
export class UserStatusChanged extends DomainEvent<UserStatusChangedData> {
  public constructor(data: UserStatusChangedData, options?: MessageOptions) {
    super('UserStatusChanged', data, options);
  }
}
