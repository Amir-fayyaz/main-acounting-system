import { describeValue } from '../../../../shared/primitives/assert.js';
import { InvalidPrimitiveError } from '../../../../shared/primitives/invalid-primitive-error.js';

/**
 * The user lifecycle state (IAM-002; doc 04, doc 09-domain).
 *
 * The current product model requires distinguishing an *active* user from a
 * *non-active* one and nothing richer. This is therefore deliberately minimal:
 *
 * ```text
 *              deactivate
 *   Active  ───────────────►  Inactive
 *          ◄───────────────
 *              activate
 * ```
 *
 * What is *not* here is as deliberate: there is no `Suspended`, no `Pending`,
 * no email-verification or invitation state and no deletion, because the domain
 * document requires none of them yet. A user is never removed — deactivation
 * keeps every historical record that points at them valid (ADR-003 section 10;
 * the issue's historical-safety requirement).
 *
 * The two states are singletons, so identity comparison is enough and a status
 * read from storage cannot drift from the one the domain knows.
 */
export const USER_STATUS_VALUES = ['active', 'inactive'] as const;

/** The string values a user status can take, as persisted and serialized. */
export type UserStatusValue = (typeof USER_STATUS_VALUES)[number];

export class UserStatus {
  /** The user is in use: their profile may be edited. The initial state. */
  public static readonly ACTIVE = new UserStatus('active');

  /** The user is out of use; their history is retained and they cannot mutate. */
  public static readonly INACTIVE = new UserStatus('inactive');

  /** The persisted string value. */
  public readonly value: UserStatusValue;

  private constructor(value: UserStatusValue) {
    this.value = value;
  }

  /**
   * Wraps a stored or wire status.
   *
   * @throws InvalidPrimitiveError — an unknown status is a broken record or a
   * broken caller, rejected rather than coerced to a default that would hide
   * the real state.
   */
  public static from(value: UserStatusValue): UserStatus {
    if (value === UserStatus.ACTIVE.value) {
      return UserStatus.ACTIVE;
    }
    if (value === UserStatus.INACTIVE.value) {
      return UserStatus.INACTIVE;
    }
    throw new InvalidPrimitiveError(
      'UserStatus',
      `value must be one of ${USER_STATUS_VALUES.join(', ')} but received ${describeValue(value)}`,
    );
  }

  /** Whether `value` is a status this primitive would accept. */
  public static is(value: unknown): value is UserStatusValue {
    return typeof value === 'string' && (USER_STATUS_VALUES as readonly string[]).includes(value);
  }

  /** Whether this is the usable state. */
  public isActive(): boolean {
    return this === UserStatus.ACTIVE;
  }

  /** Whether this is the "not currently usable" state. */
  public isInactive(): boolean {
    return this === UserStatus.INACTIVE;
  }

  /** Value equality: the same state. */
  public equals(other: unknown): boolean {
    return other instanceof UserStatus && other.value === this.value;
  }

  public toString(): string {
    return this.value;
  }

  /** Serializes as the lower-case status string (FND-006 enum convention). */
  public toJSON(): UserStatusValue {
    return this.value;
  }
}
