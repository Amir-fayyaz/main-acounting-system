import type { DomainEvent } from '@shared/domain/domain-event';

/**
 * Emitted when a new user successfully completes registration. Carries the
 * immutable identity attributes captured at registration time — the
 * downstream read model can build the public profile from this without
 * needing to re-load the aggregate.
 *
 * Plaintext passwords never appear here (or anywhere else in the domain).
 */
export class UserRegistered implements DomainEvent {
  readonly eventName = 'UserRegistered';
  readonly occurredAt: Date;

  constructor(
    public readonly userId: string,
    public readonly email: string,
    public readonly displayName: string,
  ) {
    this.occurredAt = new Date();
  }
}
