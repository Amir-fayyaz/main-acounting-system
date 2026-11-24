import { describeValue, validateNonBlank } from '../../../../shared/primitives/assert.js';
import { InvalidPrimitiveError } from '../../../../shared/primitives/invalid-primitive-error.js';

const PERSIAN_DIGITS = '۰۱۲۳۴۵۶۷۸۹';
const ARABIC_DIGITS = '٠١٢٣٤٥٦٧٨٩';

/**
 * A supplier's optional legal identification number (PUR-001).
 *
 * The field holds an economic code, a national identification number or a
 * similar registry number. It is optional at the aggregate level, but when it is
 * present it must be a digits-only identifier, bounded in length, and it
 * compares after Persian/Arabic digits are folded to ASCII. That folding is
 * deliberately local: it is *digit canonicalization*, not the Persian text
 * normalization owned by S2, so this value object does not depend on that work.
 */
export class SupplierIdentificationNumber {
  /** Largest identification number this primitive accepts. */
  public static readonly MAX_LENGTH = 50;

  /** The canonical digits-only text. */
  public readonly value: string;

  private constructor(value: string) {
    this.value = value;
  }

  /**
   * Normalizes and validates a raw identification number.
   *
   * @throws InvalidPrimitiveError - blank, non-string, longer than
   * {@link SupplierIdentificationNumber.MAX_LENGTH}, or containing anything
   * other than digits.
   */
  public static from(raw: string): SupplierIdentificationNumber {
    const trimmed = validateNonBlank(raw, 'SupplierIdentificationNumber', 'value');
    if (trimmed.length > SupplierIdentificationNumber.MAX_LENGTH) {
      throw new InvalidPrimitiveError(
        'SupplierIdentificationNumber',
        `value must be at most ${SupplierIdentificationNumber.MAX_LENGTH} characters but received ${trimmed.length}`,
      );
    }

    const canonical = toAsciiDigits(trimmed);
    if (!/^\d+$/.test(canonical)) {
      throw new InvalidPrimitiveError(
        'SupplierIdentificationNumber',
        `value must contain digits only but received ${describeValue(raw)}`,
      );
    }
    return new SupplierIdentificationNumber(canonical);
  }

  /** Value equality: the same canonical digits. */
  public equals(other: unknown): boolean {
    return other instanceof SupplierIdentificationNumber && other.value === this.value;
  }

  public toString(): string {
    return this.value;
  }

  /** Serializes as a bare digits string (FND-006). */
  public toJSON(): string {
    return this.value;
  }
}

/** Folds Persian (`۰-۹`) and Arabic (`٠-٩`) digits to ASCII `0-9`. */
function toAsciiDigits(value: string): string {
  let canonical = '';
  for (const character of value) {
    const persianIndex = PERSIAN_DIGITS.indexOf(character);
    if (persianIndex >= 0) {
      canonical += String(persianIndex);
      continue;
    }
    const arabicIndex = ARABIC_DIGITS.indexOf(character);
    if (arabicIndex >= 0) {
      canonical += String(arabicIndex);
      continue;
    }
    canonical += character;
  }
  return canonical;
}
