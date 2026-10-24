import { describeValue } from '../../../../shared/primitives/assert.js';
import { InvalidPrimitiveError } from '../../../../shared/primitives/invalid-primitive-error.js';

/**
 * The fiscal year lifecycle state (FIS-002; design section 4.2).
 *
 * The product defines exactly two year-level states:
 *
 * ```text
 *              close
 *   Open  ───────────────►  Closed
 * ```
 *
 * - `OPEN` — the year is in use. The initial state.
 * - `CLOSED` — the year is finished. Its history is retained and it still
 *   blocks an overlapping year: closure is a lifecycle state, not an exemption
 *   from the range rule.
 *
 * What is *not* here is as deliberate: there is no `IN_CLOSING` (the
 * year-level closing step is not described anywhere in the product docs, and
 * the period lifecycle carries the review/closing states where the work
 * actually happens), and there is no reopen — reopening a fiscal year is a
 * controlled act with its own policy (a permitted role and a reason), which
 * belongs to the period-closing tickets, not to this one.
 *
 * The two states are singletons, so identity comparison is enough and a status
 * read from storage cannot drift from the one the domain knows.
 */
export const FISCAL_YEAR_STATUS_VALUES = ['open', 'closed'] as const;

/** The string values a fiscal year status can take, as persisted and serialized. */
export type FiscalYearStatusValue = (typeof FISCAL_YEAR_STATUS_VALUES)[number];

export class FiscalYearStatus {
  /** The year is in use. The initial state. */
  public static readonly OPEN = new FiscalYearStatus('open');

  /** The year is finished; its history is retained and its range still blocks. */
  public static readonly CLOSED = new FiscalYearStatus('closed');

  /** The persisted string value. */
  public readonly value: FiscalYearStatusValue;

  private constructor(value: FiscalYearStatusValue) {
    this.value = value;
  }

  /**
   * Wraps a stored or wire status.
   *
   * @throws InvalidPrimitiveError — an unknown status is a broken record or a
   * broken caller, rejected rather than coerced to a default that would hide
   * the real state.
   */
  public static from(value: FiscalYearStatusValue): FiscalYearStatus {
    if (value === FiscalYearStatus.OPEN.value) {
      return FiscalYearStatus.OPEN;
    }
    if (value === FiscalYearStatus.CLOSED.value) {
      return FiscalYearStatus.CLOSED;
    }
    throw new InvalidPrimitiveError(
      'FiscalYearStatus',
      `value must be one of ${FISCAL_YEAR_STATUS_VALUES.join(', ')} but received ${describeValue(value)}`,
    );
  }

  /** Whether `value` is a status this primitive would accept. */
  public static is(value: unknown): value is FiscalYearStatusValue {
    return typeof value === 'string' && (FISCAL_YEAR_STATUS_VALUES as readonly string[]).includes(value);
  }

  public isOpen(): boolean {
    return this === FiscalYearStatus.OPEN;
  }

  public isClosed(): boolean {
    return this === FiscalYearStatus.CLOSED;
  }

  /** Value equality: the same state. */
  public equals(other: unknown): boolean {
    return other instanceof FiscalYearStatus && other.value === this.value;
  }

  public toString(): string {
    return this.value;
  }

  /** Serializes as the lower-case status string (FND-006 enum convention). */
  public toJSON(): FiscalYearStatusValue {
    return this.value;
  }
}
