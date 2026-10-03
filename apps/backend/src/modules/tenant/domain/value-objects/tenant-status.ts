import { describeValue } from '../../../../shared/primitives/assert.js';
import { InvalidPrimitiveError } from '../../../../shared/primitives/invalid-primitive-error.js';

/**
 * The tenant lifecycle state (IAM-001; doc 09-domain/01-tenant-and-access).
 *
 * The current product model defines no richer tenant lifecycle than "a tenant
 * exists and can be taken out of use without losing its history". This is
 * therefore deliberately minimal:
 *
 * ```text
 *              deactivate
 *   Active  ───────────────►  Inactive
 *          ◄───────────────
 *              activate
 * ```
 *
 * What is *not* here is as deliberate: there is no `Suspended`, no `Closed`, no
 * billing or subscription state and no deletion, because the domain document
 * requires none of them yet, and the issue forbids inventing a suspension or
 * billing workflow. A tenant is never removed — deactivation keeps every
 * historical record that points at it valid (ADR-003 section 10; the issue's
 * historical-safety requirement).
 *
 * The two states are singletons, so identity comparison is enough and a status
 * read from storage cannot drift from the one the domain knows.
 */
export const TENANT_STATUS_VALUES = ['active', 'inactive'] as const;

/** The string values a tenant status can take, as persisted and serialized. */
export type TenantStatusValue = (typeof TENANT_STATUS_VALUES)[number];

export class TenantStatus {
  /** The tenant is in use: its profile may be edited. The initial state. */
  public static readonly ACTIVE = new TenantStatus('active');

  /** The tenant is out of use; its history is retained and it cannot mutate. */
  public static readonly INACTIVE = new TenantStatus('inactive');

  /** The persisted string value. */
  public readonly value: TenantStatusValue;

  private constructor(value: TenantStatusValue) {
    this.value = value;
  }

  /**
   * Wraps a stored or wire status.
   *
   * @throws InvalidPrimitiveError — an unknown status is a broken record or a
   * broken caller, rejected rather than coerced to a default that would hide
   * the real state.
   */
  public static from(value: TenantStatusValue): TenantStatus {
    if (value === TenantStatus.ACTIVE.value) {
      return TenantStatus.ACTIVE;
    }
    if (value === TenantStatus.INACTIVE.value) {
      return TenantStatus.INACTIVE;
    }
    throw new InvalidPrimitiveError(
      'TenantStatus',
      `value must be one of ${TENANT_STATUS_VALUES.join(', ')} but received ${describeValue(value)}`,
    );
  }

  /** Whether `value` is a status this primitive would accept. */
  public static is(value: unknown): value is TenantStatusValue {
    return typeof value === 'string' && (TENANT_STATUS_VALUES as readonly string[]).includes(value);
  }

  public isActive(): boolean {
    return this === TenantStatus.ACTIVE;
  }

  public isInactive(): boolean {
    return this === TenantStatus.INACTIVE;
  }

  /** Value equality: the same state. */
  public equals(other: unknown): boolean {
    return other instanceof TenantStatus && other.value === this.value;
  }

  public toString(): string {
    return this.value;
  }

  /** Serializes as the lower-case status string (FND-006 enum convention). */
  public toJSON(): TenantStatusValue {
    return this.value;
  }
}
