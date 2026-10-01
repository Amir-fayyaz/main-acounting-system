import { describeValue, validateIntegerInRange } from './assert.js';
import { InvalidPrimitiveError } from './invalid-primitive-error.js';
import { isRoundingMode, RoundingMode } from './rounding-mode.js';

/**
 * Exact decimal arithmetic shared by `Money` and `Quantity`.
 *
 * Every value is a pair of an integer `unscaled` mantissa and a decimal
 * `scale`: the real number is `unscaled / 10 ** scale`. Nothing in this module
 * performs arithmetic on a JavaScript `number`, because binary floating point
 * cannot represent 0.1 and would corrupt a financial amount. Numeric input is
 * converted through its shortest decimal representation (`String(0.1) ===
 * '0.1'`) and then parsed as text, so `0.1 + 0.2` stays exactly `0.3`.
 *
 * `scale` is bounded by {@link MAX_DECIMAL_SCALE} so a malformed or hostile
 * input cannot allocate an unbounded bigint.
 */
export interface Decimal {
  /** The integer mantissa; the value is `unscaled / 10 ** scale`. */
  readonly unscaled: bigint;
  /** Number of fractional digits, `0 <= scale <= MAX_DECIMAL_SCALE`. */
  readonly scale: number;
}

/**
 * Most fractional digits a single value may carry.
 *
 * A primitive safety limit, not a business rule: no currency in ISO 4217 needs
 * more than four, and intermediate quantities are rounded to it rather than
 * growing without bound.
 */
export const MAX_DECIMAL_SCALE = 18;

const DECIMAL_PATTERN = /^-?\d+(\.\d+)?$/;

/** `10 ** exponent` as a bigint, rejecting a nonsensical exponent. */
export function pow10(exponent: number): bigint {
  if (!Number.isInteger(exponent) || exponent < 0) {
    throw new InvalidPrimitiveError(
      'Decimal',
      `exponent must be a non-negative integer but received ${describeValue(exponent)}`,
    );
  }
  return 10n ** BigInt(exponent);
}

/**
 * Parses a plain decimal string such as `-1234.50`.
 *
 * Rejects whitespace, `+`, exponent notation, a lone `.` or `.5`-style input
 * and more than {@link MAX_DECIMAL_SCALE} fractional digits: an ambiguous
 * amount must never be guessed at.
 */
export function parseDecimal(value: string, primitive: string, field: string): Decimal {
  if (typeof value !== 'string' || !DECIMAL_PATTERN.test(value)) {
    throw new InvalidPrimitiveError(
      primitive,
      `${field} must be a plain decimal string such as "1234.50" but received ${describeValue(value)}`,
    );
  }
  const [whole, fraction = ''] = value.split('.');
  const negative = whole.startsWith('-');
  const digits = `${negative ? whole.slice(1) : whole}${fraction}`;
  const scale = fraction.length;
  if (scale > MAX_DECIMAL_SCALE) {
    throw new InvalidPrimitiveError(
      primitive,
      `${field} must not have more than ${MAX_DECIMAL_SCALE} fractional digits but received ${describeValue(value)}`,
    );
  }
  return { unscaled: BigInt(digits) * (negative ? -1n : 1n), scale };
}

/**
 * Reads a `number` through its shortest decimal representation.
 *
 * `String(0.1)` is `'0.1'`, so no binary rounding is carried into the result.
 * Non-finite values and values printed in exponent notation (which would need
 * an unbounded expansion) are rejected instead of being approximated.
 */
export function decimalFromNumber(value: number, primitive: string, field: string): Decimal {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new InvalidPrimitiveError(
      primitive,
      `${field} must be a finite number but received ${describeValue(value)}`,
    );
  }
  const text = String(value);
  if (/[eE]/.test(text)) {
    throw new InvalidPrimitiveError(
      primitive,
      `${field} must not use exponent notation; pass a decimal string instead of ${describeValue(text)}`,
    );
  }
  return parseDecimal(text, primitive, field);
}

/** Parses either accepted numeric form: a decimal string or a finite `number`. */
export function decimalFrom(value: string | number, primitive: string, field: string): Decimal {
  return typeof value === 'number'
    ? decimalFromNumber(value, primitive, field)
    : parseDecimal(value, primitive, field);
}

/** Integer division with an explicit rounding rule; `denominator` must not be zero. */
export function divideWithRounding(
  numerator: bigint,
  denominator: bigint,
  mode: RoundingMode,
): bigint {
  if (denominator === 0n) {
    throw new InvalidPrimitiveError('Decimal', 'division by zero');
  }
  if (!isRoundingMode(mode)) {
    throw new InvalidPrimitiveError(
      'Decimal',
      `rounding must be one of ${Object.values(RoundingMode).join(', ')} but received ${describeValue(mode)}`,
    );
  }

  const negative = numerator < 0n !== denominator < 0n;
  const magnitude = numerator < 0n ? -numerator : numerator;
  const divisor = denominator < 0n ? -denominator : denominator;

  const quotient = magnitude / divisor;
  const remainder = magnitude % divisor;
  if (remainder === 0n) {
    return negative ? -quotient : quotient;
  }

  const twiceRemainder = remainder * 2n;
  let rounded = quotient;
  switch (mode) {
    case RoundingMode.DOWN:
      break;
    case RoundingMode.UP:
      rounded = quotient + 1n;
      break;
    case RoundingMode.FLOOR:
      rounded = negative ? quotient + 1n : quotient;
      break;
    case RoundingMode.CEILING:
      rounded = negative ? quotient : quotient + 1n;
      break;
    case RoundingMode.HALF_UP:
      rounded = twiceRemainder >= divisor ? quotient + 1n : quotient;
      break;
    case RoundingMode.HALF_EVEN:
      if (twiceRemainder > divisor || (twiceRemainder === divisor && quotient % 2n === 1n)) {
        rounded = quotient + 1n;
      }
      break;
  }
  return negative ? -rounded : rounded;
}

/** Increases `scale`, which is always exact because it only adds zeroes. */
export function rescaleUp(value: Decimal, scale: number): Decimal {
  if (scale === value.scale) {
    return value;
  }
  if (scale < value.scale) {
    throw new InvalidPrimitiveError(
      'Decimal',
      `cannot raise a scale of ${value.scale} to the smaller scale ${scale}`,
    );
  }
  return { unscaled: value.unscaled * pow10(scale - value.scale), scale };
}

/** Changes `scale`, rounding away precision only when the target scale is smaller. */
export function rescale(value: Decimal, scale: number, mode: RoundingMode): Decimal {
  validateIntegerInRange(scale, 0, MAX_DECIMAL_SCALE, 'Decimal', 'scale');
  if (scale >= value.scale) {
    return rescaleUp(value, scale);
  }
  return { unscaled: divideWithRounding(value.unscaled, pow10(value.scale - scale), mode), scale };
}

/** Brings two values to their larger scale without losing a single digit. */
export function alignDecimals(a: Decimal, b: Decimal): [Decimal, Decimal] {
  const scale = Math.max(a.scale, b.scale);
  return [rescaleUp(a, scale), rescaleUp(b, scale)];
}

/** Total order over exact decimal values; never coerces through `number`. */
export function compareDecimals(a: Decimal, b: Decimal): number {
  const [left, right] = alignDecimals(a, b);
  if (left.unscaled < right.unscaled) {
    return -1;
  }
  return left.unscaled > right.unscaled ? 1 : 0;
}

/** Value equality: `1.50` and `1.5` are the same number. */
export function decimalsEqual(a: Decimal, b: Decimal): boolean {
  return compareDecimals(a, b) === 0;
}

/** Drops insignificant trailing zeroes so equal values share one representation. */
export function trimDecimal(value: Decimal): Decimal {
  let unscaled = value.unscaled;
  let scale = value.scale;
  while (scale > 0 && unscaled % 10n === 0n) {
    unscaled /= 10n;
    scale -= 1;
  }
  return { unscaled, scale };
}

/** `-1`, `0` or `1` according to the sign of the value. */
export function decimalSign(value: Decimal): -1 | 0 | 1 {
  if (value.unscaled === 0n) {
    return 0;
  }
  return value.unscaled > 0n ? 1 : -1;
}

/**
 * Renders a value as a plain decimal string, keeping exactly `scale` fractional
 * digits — `125000` stays `125000` rather than becoming `125000.0`, because
 * trailing zeroes are a currency's precision decision, not noise.
 */
export function formatDecimal(value: Decimal): string {
  const negative = value.unscaled < 0n;
  const magnitude = (negative ? -value.unscaled : value.unscaled)
    .toString()
    .padStart(value.scale + 1, '0');
  const cut = magnitude.length - value.scale;
  const whole = magnitude.slice(0, cut);
  const fraction = magnitude.slice(cut);
  const sign = negative ? '-' : '';
  return fraction === '' ? `${sign}${whole}` : `${sign}${whole}.${fraction}`;
}
