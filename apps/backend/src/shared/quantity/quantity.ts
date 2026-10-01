import { describeValue, validateNonBlank } from '../primitives/assert.js';
import {
  alignDecimals,
  compareDecimals,
  decimalsEqual,
  decimalFrom,
  divideWithRounding,
  formatDecimal,
  pow10,
  trimDecimal,
  MAX_DECIMAL_SCALE,
  type Decimal,
} from '../primitives/decimal.js';
import { InvalidPrimitiveError } from '../primitives/invalid-primitive-error.js';
import { RoundingMode } from '../primitives/rounding-mode.js';

/**
 * A counted amount with an optional unit of measure — the reusable form
 * inventory, purchasing and any other module needs to say "how many of what".
 *
 * The primitive stops well short of units *as a domain concept*: the unit is an
 * opaque code, there is no conversion table between `kg` and `g`, no notion of
 * a package versus each, no product and no warehouse. Those are rules that
 * belong to the module that owns them (ADR-002 section 11). What this type does
 * guarantee is that arithmetic is exact and unambiguous — a quantity in one
 * unit can never be silently added to one in another, and `0.1 + 0.2` is
 * exactly `0.3`.
 *
 * Negative and zero quantities are allowed on purpose. Whether stock may go
 * negative is a company policy (Product & Inventory domain, section 6), not a
 * property of numbers, so the primitive refuses to decide it here.
 */

/** The wire shape of a quantity. */
export interface QuantityWire {
  /** Decimal amount as a string, never a JSON number. */
  readonly amount: string;
  /** Unit code, or `null` when the quantity is a unitless count. */
  readonly unit: string | null;
}

/** Longest unit code accepted; a sanity bound against garbage, not a business rule. */
const MAX_UNIT_LENGTH = 64;

export class Quantity {
  /**
   * Builds a quantity of `amount`, optionally in `unit`.
   *
   * `unit` is trimmed and treated as an opaque code: blank is rejected, and
   * anything else is carried through unchanged for the owning domain to
   * interpret.
   */
  public static of(amount: string | number, unit?: string): Quantity {
    const parts = decimalFrom(amount, 'Quantity', 'amount');
    return new Quantity(trimDecimal(parts), normalizeUnit(unit));
  }

  /** An exact zero, useful as the start of a running total. */
  public static zero(unit?: string): Quantity {
    return new Quantity({ unscaled: 0n, scale: 0 }, normalizeUnit(unit));
  }

  /** The unit code, or `null` for a unitless quantity. */
  public readonly unit: string | null;

  private readonly parts: Decimal;

  private constructor(parts: Decimal, unit: string | null) {
    this.parts = parts;
    this.unit = unit;
  }

  public add(other: Quantity): Quantity {
    this.assertSameUnit(other);
    const [left, right] = alignDecimals(this.parts, other.parts);
    return new Quantity(
      trimDecimal({ unscaled: left.unscaled + right.unscaled, scale: left.scale }),
      this.unit,
    );
  }

  public subtract(other: Quantity): Quantity {
    this.assertSameUnit(other);
    const [left, right] = alignDecimals(this.parts, other.parts);
    return new Quantity(
      trimDecimal({ unscaled: left.unscaled - right.unscaled, scale: left.scale }),
      this.unit,
    );
  }

  /**
   * Scales the quantity. The result keeps every digit it can represent and
   * only rounds — under the mandatory `rounding` rule — if the product needs
   * more than {@link MAX_DECIMAL_SCALE} fractional digits.
   */
  public multiply(factor: string | number, rounding: RoundingMode): Quantity {
    const parsed = decimalFrom(factor, 'Quantity', 'factor');
    const totalScale = this.parts.scale + parsed.scale;
    const product = this.parts.unscaled * parsed.unscaled;
    if (totalScale <= MAX_DECIMAL_SCALE) {
      return new Quantity(trimDecimal({ unscaled: product, scale: totalScale }), this.unit);
    }
    return new Quantity(
      trimDecimal({
        unscaled: divideWithRounding(product, pow10(totalScale - MAX_DECIMAL_SCALE), rounding),
        scale: MAX_DECIMAL_SCALE,
      }),
      this.unit,
    );
  }

  /**
   * Divides the quantity, rounded to at most {@link MAX_DECIMAL_SCALE}
   * fractional digits under the mandatory `rounding` rule, then trimmed back to
   * the shortest exact representation.
   */
  public divide(divisor: string | number, rounding: RoundingMode): Quantity {
    const parsed = decimalFrom(divisor, 'Quantity', 'divisor');
    if (parsed.unscaled === 0n) {
      throw new InvalidPrimitiveError('Quantity', 'division by zero');
    }
    const numerator = this.parts.unscaled * pow10(parsed.scale) * pow10(MAX_DECIMAL_SCALE);
    const denominator = parsed.unscaled * pow10(this.parts.scale);
    return new Quantity(
      trimDecimal({
        unscaled: divideWithRounding(numerator, denominator, rounding),
        scale: MAX_DECIMAL_SCALE,
      }),
      this.unit,
    );
  }

  public negate(): Quantity {
    return new Quantity(
      trimDecimal({ unscaled: -this.parts.unscaled, scale: this.parts.scale }),
      this.unit,
    );
  }

  public abs(): Quantity {
    const magnitude = this.parts.unscaled < 0n ? -this.parts.unscaled : this.parts.unscaled;
    return new Quantity(trimDecimal({ unscaled: magnitude, scale: this.parts.scale }), this.unit);
  }

  /** Total order within one unit; `-1`, `0` or `1`. */
  public compareTo(other: Quantity): number {
    this.assertSameUnit(other);
    return compareDecimals(this.parts, other.parts);
  }

  /** Value equality: same unit and the same exact amount. */
  public equals(other: Quantity): boolean {
    return (
      other instanceof Quantity &&
      this.unit === other.unit &&
      decimalsEqual(this.parts, other.parts)
    );
  }

  public isZero(): boolean {
    return this.parts.unscaled === 0n;
  }

  public isPositive(): boolean {
    return this.parts.unscaled > 0n;
  }

  public isNegative(): boolean {
    return this.parts.unscaled < 0n;
  }

  /** The quantity as an exact decimal string with insignificant zeroes trimmed. */
  public toDecimalString(): string {
    return formatDecimal(this.parts);
  }

  public toString(): string {
    return this.unit === null ? this.toDecimalString() : `${this.toDecimalString()} ${this.unit}`;
  }

  public toJSON(): QuantityWire {
    return { amount: this.toDecimalString(), unit: this.unit };
  }

  /**
   * Rejects arithmetic across different units, so `1.5 kg` and `1500 g` are
   * never accidentally summed as `1501.5`. Unit equivalence itself is a domain
   * rule and is not attempted here.
   */
  private assertSameUnit(other: Quantity): void {
    if (!(other instanceof Quantity)) {
      throw new InvalidPrimitiveError(
        'Quantity',
        `expected a Quantity but received ${describeValue(other)}`,
      );
    }
    if (this.unit !== other.unit) {
      throw new InvalidPrimitiveError(
        'Quantity',
        `cannot combine unit ${describeValue(this.unit)} with ${describeValue(other.unit)}; quantities only add and subtract within a single unit`,
      );
    }
  }
}

function normalizeUnit(unit: string | undefined): string | null {
  if (unit === undefined) {
    return null;
  }
  const normalized = validateNonBlank(unit, 'Quantity', 'unit');
  if (normalized.length > MAX_UNIT_LENGTH) {
    throw new InvalidPrimitiveError(
      'Quantity',
      `unit must be at most ${MAX_UNIT_LENGTH} characters but received ${describeValue(unit)}`,
    );
  }
  return normalized;
}
