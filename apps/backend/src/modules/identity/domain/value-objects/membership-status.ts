import { describeValue } from '../../../../shared/primitives/assert.js';
import { InvalidPrimitiveError } from '../../../../shared/primitives/invalid-primitive-error.js';

/**
 * The membership lifecycle state (IAM-003; doc 09-domain/01 section 4).
 *
 * The domain document sketches the full chain
 * (`Invited → Active → Suspended → Revoked`), but the current product model
 * requires only the distinction the issue states as the minimum: an *active*
 * membership versus a *non-active* one, with activate and deactivate as the
 * supported transitions. The invitation state belongs to invitations and email
 * delivery, which are explicitly out of scope for this issue, so it is not
 * modelled yet rather than modelled empty:
 *
 * ```text
 *              deactivate
 *   Active  ───────────────►  Inactive
 *          ◄───────────────
 *              activate
 * ```
 *
 * Deactivation is not deletion: the membership row — and every historical
 * record that points at it — survives a deactivation untouched (the issue's
 * historical-safety requirement; ADR-003 section 10).
 *
 * The two states are singletons, so identity comparison is enough and a status
 * read from storage cannot drift from the one the domain knows.
 */
export const MEMBERSHIP_STATUS_VALUES = ['active', 'inactive'] as const;

/** The string values a membership status can take, as persisted and serialized. */
export type MembershipStatusValue = (typeof MEMBERSHIP_STATUS_VALUES)[number];

export class MembershipStatus {
  /** The relationship is in force. The initial state. */
  public static readonly ACTIVE = new MembershipStatus('active');

  /** The relationship is not in force; the record and its history are kept. */
  public static readonly INACTIVE = new MembershipStatus('inactive');

  /** The persisted string value. */
  public readonly value: MembershipStatusValue;

  private constructor(value: MembershipStatusValue) {
    this.value = value;
  }

  /**
   * Wraps a stored or wire status.
   *
   * @throws InvalidPrimitiveError — an unknown status is a broken record or a
   * broken caller, rejected rather than coerced to a default that would hide
   * the real state.
   */
  public static from(value: MembershipStatusValue): MembershipStatus {
    if (value === MembershipStatus.ACTIVE.value) {
      return MembershipStatus.ACTIVE;
    }
    if (value === MembershipStatus.INACTIVE.value) {
      return MembershipStatus.INACTIVE;
    }
    throw new InvalidPrimitiveError(
      'MembershipStatus',
      `value must be one of ${MEMBERSHIP_STATUS_VALUES.join(', ')} but received ${describeValue(value)}`,
    );
  }

  /** Whether `value` is a status this primitive would accept. */
  public static is(value: unknown): value is MembershipStatusValue {
    return (
      typeof value === 'string' && (MEMBERSHIP_STATUS_VALUES as readonly string[]).includes(value)
    );
  }

  /** Whether this is the state in force. */
  public isActive(): boolean {
    return this === MembershipStatus.ACTIVE;
  }

  /** Whether this is the "not in force" state. */
  public isInactive(): boolean {
    return this === MembershipStatus.INACTIVE;
  }

  /** Value equality: the same state. */
  public equals(other: unknown): boolean {
    return other instanceof MembershipStatus && other.value === this.value;
  }

  public toString(): string {
    return this.value;
  }

  /** Serializes as the lower-case status string (FND-006 enum convention). */
  public toJSON(): MembershipStatusValue {
    return this.value;
  }
}
