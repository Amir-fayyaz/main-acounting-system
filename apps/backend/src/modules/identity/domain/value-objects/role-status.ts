import { describeValue } from '../../../../shared/primitives/assert.js';
import { InvalidPrimitiveError } from '../../../../shared/primitives/invalid-primitive-error.js';

/**
 * The role lifecycle state (IAM-004; doc 09-domain/01 section 4).
 *
 * The current product model requires distinguishing an *active* role — one whose
 * permissions a membership may exercise — from a *non-active* one, and nothing
 * richer. This is therefore deliberately minimal:
 *
 * ```text
 *              deactivate
 *   Active  ───────────────►  Inactive
 *          ◄───────────────
 *              activate
 * ```
 *
 * Deactivation is not deletion: the role row — and every assignment of it that
 * points at it — survives untouched, so a membership keeps its historical role
 * assignments and re-activating the role restores them (the issue's
 * historical-safety requirement; ADR-003 section 10).
 *
 * The two states are singletons, so identity comparison is enough and a status
 * read from storage cannot drift from the one the domain knows.
 */
export const ROLE_STATUS_VALUES = ['active', 'inactive'] as const;

/** The string values a role status can take, as persisted and serialized. */
export type RoleStatusValue = (typeof ROLE_STATUS_VALUES)[number];

export class RoleStatus {
  /** The role may be assigned and its permissions are effective. The initial state. */
  public static readonly ACTIVE = new RoleStatus('active');

  /** The role is out of use; its history is retained. */
  public static readonly INACTIVE = new RoleStatus('inactive');

  /** The persisted string value. */
  public readonly value: RoleStatusValue;

  private constructor(value: RoleStatusValue) {
    this.value = value;
  }

  /**
   * Wraps a stored or wire status.
   *
   * @throws InvalidPrimitiveError — an unknown status is a broken record or a
   * broken caller, rejected rather than coerced to a default.
   */
  public static from(value: RoleStatusValue): RoleStatus {
    if (value === RoleStatus.ACTIVE.value) {
      return RoleStatus.ACTIVE;
    }
    if (value === RoleStatus.INACTIVE.value) {
      return RoleStatus.INACTIVE;
    }
    throw new InvalidPrimitiveError(
      'RoleStatus',
      `value must be one of ${ROLE_STATUS_VALUES.join(', ')} but received ${describeValue(value)}`,
    );
  }

  /** Whether `value` is a status this primitive would accept. */
  public static is(value: unknown): value is RoleStatusValue {
    return typeof value === 'string' && (ROLE_STATUS_VALUES as readonly string[]).includes(value);
  }

  /** Whether this is the state in force. */
  public isActive(): boolean {
    return this === RoleStatus.ACTIVE;
  }

  /** Whether this is the "not in force" state. */
  public isInactive(): boolean {
    return this === RoleStatus.INACTIVE;
  }

  /** Value equality: the same state. */
  public equals(other: unknown): boolean {
    return other instanceof RoleStatus && other.value === this.value;
  }

  public toString(): string {
    return this.value;
  }

  /** Serializes as the lower-case status string (FND-006 enum convention). */
  public toJSON(): RoleStatusValue {
    return this.value;
  }
}
