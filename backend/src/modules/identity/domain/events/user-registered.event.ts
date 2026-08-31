import { DomainEvent } from '../../../../shared/domain/domain-event';
export class UserRegistered implements DomainEvent {
  readonly eventName = 'UserRegistered';
  readonly occurredAt = new Date();
  constructor(public readonly userId: string) {}
}

