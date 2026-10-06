import { describeValue } from '../../../../shared/primitives/assert.js';
import { InvalidPrimitiveError } from '../../../../shared/primitives/invalid-primitive-error.js';

/**
 * The lifecycle state of a Membership-Role assignment (IAM-004).
 *
 * Removing a role from a membership must not erase the fact that it was once
 * held — a role change is part of a tenant's access history (the issue's
 * historical-safety requirement). So "removal" is a *deactivation* of the
 * assignment, never a delete:
 *
 * ```text
 *              remove
 *   Active  ───────────────►  Inactive
 *          ◄───────────────
 *              assign again
 * ```
 *
 * Only active assignments contribute to a membership's effective permissions,
 * so deactivating one takes effect immediately while the record — and the fact
 * that the role was assigned — is preserved.
 *
 * The two states are singletons, so identity comparison is enough and a status
 * read from storage cannot drift from the one the domain knows.
 */
export const MEMBERSHIP_ROLE_STATUS_VALUES = ['active', 'inactive'] as const;

/** The string values an assignment status can take, as persisted and serialized. */
export type MembershipRoleStatusValue = (typeof MEMBERSHIP_ROLE_STATUS_VALUES)[number];

export class MembershipRoleStatus {
  /** The role is currently held through this assignment. The initial state. */
  public static readonly ACTIVE = new MembershipRoleStatus('active');

  /** The role was removed; the assignment is retained as history. */
  public static readonly INACTIVE = new MembershipRoleStatus('inactive');

  /** The persisted string value. */
  public readonly value: MembershipRoleStatusValue;

  private constructor(value: MembershipRoleStatusValue) {
    this.value = value;
  }

  /**
   * Wraps a stored or wire status.
   *
   * @throws InvalidPrimitiveError — an unknown status is a broken record or a
   * broken caller, rejected rather than coerced to a default.
   */
  public static from(value: MembershipRoleStatusValue): MembershipRoleStatus {
    if (value === MembershipRoleStatus.ACTIVE.value) {
      return MembershipRoleStatus.ACTIVE;
    }
    if (value === MembershipRoleStatus.INACTIVE.value) {
      return MembershipRoleStatus.INACTIVE;
    }
    throw new InvalidPrimitiveError(
      'MembershipRoleStatus',
      `value must be one of ${MEMBERSHIP_ROLE_STATUS_VALUES.join(', ')} but received ${describeValue(value)}`,
    );
  }

  /** Whether `value` is a status this primitive would accept. */
  public static is(value: unknown): value is MembershipRoleStatusValue {
    return (
      typeof value === 'string' &&
      (MEMBERSHIP_ROLE_STATUS_VALUES as readonly string[]).includes(value)
    );
  }

  /** Whether the role is currently held. */
  public isActive(): boolean {
    return this === MembershipRoleStatus.ACTIVE;
  }

  /** Whether the role was removed (the assignment remains as history). */
  public isInactive(): boolean {
    return this === MembershipRoleStatus.INACTIVE;
  }

  /** Value equality: the same state. */
  public equals(other: unknown): boolean {
    return other instanceof MembershipRoleStatus && other.value === this.value;
  }

  public toString(): string {
    return this.value;
  }

  /** Serializes as the lower-case status string (FND-006 enum convention). */
  public toJSON(): MembershipRoleStatusValue {
    return this.value;
  }
}
