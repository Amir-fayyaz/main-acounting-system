import { AggregateRoot, InvalidStateError, InvalidValueError } from '@accounting-saas/ddd-core';
import { UserRegistered } from '../events/user-registered.event';
import type { Email } from '../value-objects/email.vo';
import type { PasswordHash } from '../value-objects/password-hash.vo';

/** Lifecycle of a user account. */
export type UserStatus = 'ACTIVE' | 'DEACTIVATED';

/**
 * Strongly-typed identifier for users. The brand prevents accidental
 * cross-assignment of unrelated string identifiers (tenant ids, role ids,
 * etc.) without forcing a runtime wrapper.
 */
export type UserId = string & { readonly __brand: 'UserId' };

/** Factory helper for trusted call sites that already hold a validated id. */
export const userId = (value: string): UserId => value as UserId;

/**
 * Aggregate root for the user identity boundary. All state changes flow
 * through named methods so invariants and the resulting domain events stay
 * co-located.
 *
 * A user is always created through `register(...)` (which raises
 * `UserRegistered`); subsequent lifecycle is `changePassword`,
 * `deactivate`, and `activate`. Equality comes from the inherited
 * identity-based `Entity.equals`.
 */
export class User extends AggregateRoot<UserId> {
  private constructor(
    id: UserId,
    private readonly email: Email,
    private _displayName: string,
    private _passwordHash: PasswordHash,
    private _status: UserStatus,
  ) {
    super(id);
  }

  /**
   * Factory for a freshly-registered user. Validates the display name and
   * emits a `UserRegistered` event carrying the immutable identity
   * attributes captured at registration.
   */
  static register(args: { id: UserId; email: Email; displayName: string; passwordHash: PasswordHash }): User {
    const name = args.displayName.trim();
    if (name.length === 0) {
      throw new InvalidValueError('User display name must not be empty');
    }
    if (name.length > 120) {
      throw new InvalidValueError('User display name must not exceed 120 characters');
    }
    const user = new User(args.id, args.email, name, args.passwordHash, 'ACTIVE');
    user.addDomainEvent(new UserRegistered(args.id, args.email.value, name));
    return user;
  }

  /** Replace the current password hash. The plaintext never enters the domain. */
  changePassword(next: PasswordHash): void {
    if (this._status === 'DEACTIVATED') {
      throw new InvalidStateError('Cannot change password for a deactivated user');
    }
    if (next.equals(this._passwordHash)) {
      // No-op on identical hashes; avoids a redundant event.
      return;
    }
    this._passwordHash = next;
  }

  /**
   * Deactivate the account per BR-USER-003 — a deactivated user cannot
   * log in normally. Idempotent for already-deactivated users.
   */
  deactivate(): void {
    this._status = 'DEACTIVATED';
  }

  /** Reactivate a previously deactivated account. */
  activate(): void {
    this._status = 'ACTIVE';
  }

  get emailAddress(): Email {
    return this.email;
  }

  get displayName(): string {
    return this._displayName;
  }

  get passwordHash(): PasswordHash {
    return this._passwordHash;
  }

  get isActive(): boolean {
    return this._status === 'ACTIVE';
  }

  get userStatus(): UserStatus {
    return this._status;
  }
}
