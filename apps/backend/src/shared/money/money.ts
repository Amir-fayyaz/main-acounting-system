import { describeValue } from '../primitives/assert.js';
import {
  decimalFrom,
  divideWithRounding,
  formatDecimal,
  pow10,
  rescale,
  rescaleUp,
  type Decimal,
} from '../primitives/decimal.js';
import { InvalidPrimitiveError } from '../primitives/invalid-primitive-error.js';
import { RoundingMode } from '../primitives/rounding-mode.js';
import { Currency } from './currency.js';

/**
 * A monetary amount with its currency, as a value object (ADR-002 section 10;
 * domain map section 3: "amount is always modelled with currency and a
 * precision/rounding policy").
 *
 * Three properties are enforced by the type rather than left to callers:
 *
 * - **No floating point.** The amount is an integer number of the currency's
 *   minor units held in a `bigint`, so `0.1 + 0.2` is exactly `0.3` and a
 *   billion rial does not lose a rial to double rounding. Every operation goes
 *   through exact integer arithmetic with an explicit rounding rule.
 * - **Amount and currency cannot separate.** There is no way to construct a
 *   `Money` without a `Currency`, and mixing currencies is rejected rather than
 *   coerced, so an IRR figure can never be added to a USD one.
 * - **Invalid states are rejected.** More fractional digits than the currency
 *   stores, a non-finite input, a blank amount — all throw
 *   `InvalidPrimitiveError` instead of quietly rounding themselves.
 *
 * `Money` knows nothing about invoices, ledgers or tax: which rounding rule an
 * operation uses is the calling domain's decision, passed in per call.
 */

/** The wire shape of money, identical to `MoneyDto` (FND-006). */
export interface MoneyWire {
  /** Decimal amount as a string, never a JSON number. */
  readonly amount: string;
  /** ISO 4217 code. */
  readonly currency: string;
}

export class Money {
  /**
   * Builds an amount in `currency`.
   *
   * `rounding` is only consulted when the input carries more fractional digits
   * than `currency` stores. Leaving it out means "this amount must fit exactly"
   * — the safe default for a figure that came from a user or a document —
   * while passing a {@link RoundingMode} makes the loss of precision a stated
   * decision instead of an accident.
   */
  public static of(amount: string | number, currency: Currency, rounding?: RoundingMode): Money {
    assertCurrency(currency);
    const parts = decimalFrom(amount, 'Money', 'amount');
    if (parts.scale > currency.minorUnit) {
      if (rounding === undefined) {
        throw new InvalidPrimitiveError(
          'Money',
          `amount ${formatDecimal(parts)} has ${parts.scale} fractional digits but ${currency.code} stores ${currency.minorUnit}; pass a RoundingMode to round it explicitly`,
        );
      }
      return new Money(rescale(parts, currency.minorUnit, rounding), currency);
    }
    if (parts.scale < currency.minorUnit) {
      return new Money(rescaleUp(parts, currency.minorUnit), currency);
    }
    return new Money(parts, currency);
  }

  /** An exact amount of zero, e.g. for starting a running total. */
  public static zero(currency: Currency): Money {
    assertCurrency(currency);
    return new Money({ unscaled: 0n, scale: currency.minorUnit }, currency);
  }

  /**
   * Builds an amount from a raw integer count of minor units — the form a
   * database column or a ledger would hold. The caller still supplies the
   * currency so the amount and its unit stay associated.
   */
  public static fromMinorUnits(minorUnits: bigint, currency: Currency): Money {
    assertCurrency(currency);
    if (typeof minorUnits !== 'bigint') {
      throw new InvalidPrimitiveError(
        'Money',
        `minorUnits must be a bigint but received ${describeValue(minorUnits)}`,
      );
    }
    return new Money({ unscaled: minorUnits, scale: currency.minorUnit }, currency);
  }

  /** The currency this amount is denominated in; never absent. */
  public readonly currency: Currency;

  private readonly parts: Decimal;

  private constructor(parts: Decimal, currency: Currency) {
    this.parts = parts;
    this.currency = currency;
  }

  /** The exact amount as an integer number of minor units. */
  public get minorUnits(): bigint {
    return this.parts.unscaled;
  }

  public add(other: Money): Money {
    this.assertCompatible(other);
    return new Money(
      { unscaled: this.parts.unscaled + other.parts.unscaled, scale: this.parts.scale },
      this.currency,
    );
  }

  public subtract(other: Money): Money {
    this.assertCompatible(other);
    return new Money(
      { unscaled: this.parts.unscaled - other.parts.unscaled, scale: this.parts.scale },
      this.currency,
    );
  }

  /**
   * Scales the amount by a factor. `rounding` is required because a factor
   * such as `0.333` cannot be represented exactly in the currency's precision;
   * stating the rule keeps that choice visible at the call site.
   */
  public multiply(factor: string | number, rounding: RoundingMode): Money {
    const parsed = decimalFrom(factor, 'Money', 'factor');
    return new Money(
      {
        unscaled: divideWithRounding(
          this.parts.unscaled * parsed.unscaled,
          pow10(parsed.scale),
          rounding,
        ),
        scale: this.parts.scale,
      },
      this.currency,
    );
  }

  /**
   * Divides the amount by a divisor. As with {@link multiply}, the rounding
   * rule is mandatory: division is where precision is lost, and losing it
   * silently is never acceptable for a financial figure.
   */
  public divide(divisor: string | number, rounding: RoundingMode): Money {
    const parsed = decimalFrom(divisor, 'Money', 'divisor');
    if (parsed.unscaled === 0n) {
      throw new InvalidPrimitiveError('Money', 'division by zero');
    }
    return new Money(
      {
        unscaled: divideWithRounding(
          this.parts.unscaled * pow10(parsed.scale),
          parsed.unscaled,
          rounding,
        ),
        scale: this.parts.scale,
      },
      this.currency,
    );
  }

  /** The same amount with the opposite sign, e.g. to mirror a debit and a credit. */
  public negate(): Money {
    return new Money({ unscaled: -this.parts.unscaled, scale: this.parts.scale }, this.currency);
  }

  /** The same magnitude without the sign. */
  public abs(): Money {
    const magnitude = this.parts.unscaled < 0n ? -this.parts.unscaled : this.parts.unscaled;
    return new Money({ unscaled: magnitude, scale: this.parts.scale }, this.currency);
  }

  /** Total order within one currency; `-1`, `0` or `1`. */
  public compareTo(other: Money): number {
    this.assertCompatible(other);
    if (this.parts.unscaled === other.parts.unscaled) {
      return 0;
    }
    return this.parts.unscaled < other.parts.unscaled ? -1 : 1;
  }

  /** Value equality: same currency and same amount, regardless of construction. */
  public equals(other: Money): boolean {
    return (
      other instanceof Money &&
      this.currency.code === other.currency.code &&
      this.parts.unscaled === other.parts.unscaled
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

  /**
   * The amount as a decimal string holding exactly the currency's fractional
   * digits — `IRR 125000` stays `125000`, while a 2-minor-unit currency yields
   * `125000.00`. String, not number: a JSON number cannot round-trip a
   * financial figure without risking precision (FND-006 serialization).
   */
  public toDecimalString(): string {
    return formatDecimal(this.parts);
  }

  public toString(): string {
    return `${this.currency.code} ${this.toDecimalString()}`;
  }

  public toJSON(): MoneyWire {
    return { amount: this.toDecimalString(), currency: this.currency.code };
  }

  /** Rejects arithmetic whose other operand is not the same currency. */
  private assertCompatible(other: Money): void {
    if (!(other instanceof Money)) {
      throw new InvalidPrimitiveError(
        'Money',
        `expected a Money but received ${describeValue(other)}`,
      );
    }
    if (this.currency.code !== other.currency.code) {
      throw new InvalidPrimitiveError(
        'Money',
        `cannot combine ${this.currency.code} with ${other.currency.code}; money only adds and subtracts within a single currency`,
      );
    }
  }
}

function assertCurrency(currency: Currency): void {
  if (!(currency instanceof Currency)) {
    throw new InvalidPrimitiveError(
      'Money',
      `currency must be a Currency but received ${describeValue(currency)}`,
    );
  }
}
