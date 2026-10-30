import { describeValue } from '../../../../shared/primitives/assert.js';
import { InvalidPrimitiveError } from '../../../../shared/primitives/invalid-primitive-error.js';

/**
 * The fiscal period lifecycle state (FIS-004).
 *
 * The product defines exactly two period-level states for this ticket:
 *
 * - `OPEN` — the period is in use and is the only state that may be selected
 *   as the tenant's active period. The initial state.
 * - `CLOSED` — the period is finished (FIS-005). Its history is retained; a
 *   closed period can never be active again.
 *
 * The two states are singletons, so identity comparison is enough and a state
 * read from storage cannot drift from the one the domain knows.
 */
export const FISCAL_PERIOD_STATE_VALUES = ['open', 'closed'] as const;

/** The string values a fiscal period state can take, as persisted and serialized. */
export type FiscalPeriodStateValue = (typeof FISCAL_PERIOD_STATE_VALUES)[number];

export class FiscalPeriodState {
  /** The period is in use; the only state that may be the tenant's active one. */
  public static readonly OPEN = new FiscalPeriodState('open');

  /** The period is finished; it can never be selected as the active one. */
  public static readonly CLOSED = new FiscalPeriodState('closed');

  /** The persisted string value. */
  public readonly value: FiscalPeriodStateValue;

  private constructor(value: FiscalPeriodStateValue) {
    this.value = value;
  }

  /**
   * Wraps a stored or wire state.
   *
   * @throws InvalidPrimitiveError — an unknown state is a broken record or a
   * broken caller, rejected rather than coerced to a default that would hide
   * the real state.
   */
  public static from(value: FiscalPeriodStateValue): FiscalPeriodState {
    if (value === FiscalPeriodState.OPEN.value) {
      return FiscalPeriodState.OPEN;
    }
    if (value === FiscalPeriodState.CLOSED.value) {
      return FiscalPeriodState.CLOSED;
    }
    throw new InvalidPrimitiveError(
      'FiscalPeriodState',
      `value must be one of ${FISCAL_PERIOD_STATE_VALUES.join(', ')} but received ${describeValue(value)}`,
    );
  }

  public isOpen(): boolean {
    return this === FiscalPeriodState.OPEN;
  }

  public isClosed(): boolean {
    return this === FiscalPeriodState.CLOSED;
  }

  /** Value equality: the same state. */
  public equals(other: unknown): boolean {
    return other instanceof FiscalPeriodState && other.value === this.value;
  }

  public toString(): string {
    return this.value;
  }

  /** Serializes as the lower-case state string (FND-006 enum convention). */
  public toJSON(): FiscalPeriodStateValue {
    return this.value;
  }
}
