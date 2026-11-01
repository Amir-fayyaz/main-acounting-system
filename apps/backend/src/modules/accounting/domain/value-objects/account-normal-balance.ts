import { validateNonBlank } from '../../../../shared/primitives/assert.js';
import { InvalidPrimitiveError } from '../../../../shared/primitives/invalid-primitive-error.js';

/**
 * The normal balance of an account — the side on which increases are recorded.
 *
 * Assets and expenses normally carry a debit balance; liabilities, equity and
 * revenue normally carry a credit balance. A child account inherits its parent's
 * normal balance unless the domain explicitly allows a contra-account exception
 * (none are currently defined).
 */
export class NormalBalance {
  /** Increases are recorded on the debit side. */
  public static readonly DEBIT: NormalBalance = new NormalBalance('debit');
  /** Increases are recorded on the credit side. */
  public static readonly CREDIT: NormalBalance = new NormalBalance('credit');

  /** All known normal-balance strings. */
  public static readonly VALUES: readonly NormalBalance[] = [NormalBalance.DEBIT, NormalBalance.CREDIT];

  /** The lowercase string identifier. */
  public readonly value: string;

  private constructor(value: string) {
    this.value = value;
  }

  /**
   * Looks up a normal balance by its string identifier (case-insensitive).
   *
   * @throws InvalidPrimitiveError — the value is not a known normal balance.
   */
  public static from(value: string): NormalBalance {
    const normalized = validateNonBlank(value, 'NormalBalance', 'value').toLowerCase();
    const found = NormalBalance.VALUES.find((b) => b.value === normalized);
    if (found === undefined) {
      throw new InvalidPrimitiveError(
        'NormalBalance',
        `value must be one of ${NormalBalance.VALUES.map((b) => b.value).join(', ')} but received ${value}`,
      );
    }
    return found;
  }

  /** Whether `value` is a known normal balance without throwing. */
  public static isKnown(value: string): boolean {
    return typeof value === 'string' && NormalBalance.VALUES.some((b) => b.value === value.toLowerCase());
  }

  /** Value equality: the same normal-balance identifier. */
  public equals(other: unknown): boolean {
    return other instanceof NormalBalance && other.value === this.value;
  }

  public toString(): string {
    return this.value;
  }

  /** Serializes as a bare string, the identifier/text wire format of FND-006. */
  public toJSON(): string {
    return this.value;
  }
}