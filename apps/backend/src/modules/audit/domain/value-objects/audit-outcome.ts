import { describeValue } from '../../../../shared/primitives/assert.js';
import { InvalidPrimitiveError } from '../../../../shared/primitives/invalid-primitive-error.js';

/**
 * How an audited operation ended (AUD-001; ADR-010 sections 9 and 13).
 *
 * Three states, and deliberately no fourth:
 *
 * ```text
 * success   the operation was applied
 * failure   the operation was attempted and did not succeed
 * denied    the operation was refused before it ran (authentication or authorization)
 * ```
 *
 * `failure` and `denied` are kept apart because they answer different security
 * questions — "did it break?" versus "was it refused?" — and an operator
 * investigating access has to be able to ask the second one alone. There is no
 * `unknown`: an audit record states what happened, and a caller that cannot say
 * which of the three happened has not finished its own decision (fail closed —
 * ADR-010 section 13).
 *
 * The states are singletons, so identity comparison is enough and a state read
 * back from storage cannot drift from the one the domain knows.
 */
export const AUDIT_OUTCOME_VALUES = ['success', 'failure', 'denied'] as const;

/** The string values an outcome can take, as persisted and serialized. */
export type AuditOutcomeValue = (typeof AUDIT_OUTCOME_VALUES)[number];

export class AuditOutcome {
  /** The operation was applied. */
  public static readonly SUCCESS = new AuditOutcome('success');

  /** The operation was attempted and failed. */
  public static readonly FAILURE = new AuditOutcome('failure');

  /** The operation was refused before it ran. */
  public static readonly DENIED = new AuditOutcome('denied');

  /** The persisted string value. */
  public readonly value: AuditOutcomeValue;

  private constructor(value: AuditOutcomeValue) {
    this.value = value;
  }

  /**
   * Wraps a stored or wire outcome.
   *
   * @throws InvalidPrimitiveError — an unknown outcome is a broken record or a
   * broken caller, rejected rather than coerced to a default that would hide
   * what actually happened.
   */
  public static from(value: AuditOutcomeValue): AuditOutcome {
    switch (value) {
      case 'success':
        return AuditOutcome.SUCCESS;
      case 'failure':
        return AuditOutcome.FAILURE;
      case 'denied':
        return AuditOutcome.DENIED;
      default:
        throw new InvalidPrimitiveError(
          'AuditOutcome',
          `value must be one of ${AUDIT_OUTCOME_VALUES.join(', ')} but received ${describeValue(value)}`,
        );
    }
  }

  /**
   * Wraps an outcome arriving from outside the type system — a stored row, a
   * raw contract field — normalizing case and rejecting anything unknown.
   *
   * @throws InvalidPrimitiveError — the value is not one of the three outcomes.
   */
  public static parse(raw: string): AuditOutcome {
    if (typeof raw !== 'string') {
      throw new InvalidPrimitiveError(
        'AuditOutcome',
        `value must be one of ${AUDIT_OUTCOME_VALUES.join(', ')} but received ${describeValue(raw)}`,
      );
    }

    return AuditOutcome.from(raw.trim().toLowerCase() as AuditOutcomeValue);
  }

  /** Whether `value` is an outcome this primitive would accept. */
  public static is(value: unknown): value is AuditOutcomeValue {
    return typeof value === 'string' && (AUDIT_OUTCOME_VALUES as readonly string[]).includes(value);
  }

  public isSuccess(): boolean {
    return this === AuditOutcome.SUCCESS;
  }

  public isFailure(): boolean {
    return this === AuditOutcome.FAILURE;
  }

  public isDenied(): boolean {
    return this === AuditOutcome.DENIED;
  }

  /** Value equality: the same state. */
  public equals(other: unknown): boolean {
    return other instanceof AuditOutcome && other.value === this.value;
  }

  public toString(): string {
    return this.value;
  }

  /** Serializes as the lower-case outcome string. */
  public toJSON(): AuditOutcomeValue {
    return this.value;
  }
}
