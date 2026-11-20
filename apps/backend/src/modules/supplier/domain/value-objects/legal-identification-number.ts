import { validateNonBlank } from '../../../../shared/primitives/assert.js';
import { InvalidPrimitiveError } from '../../../../shared/primitives/invalid-primitive-error.js';
import { normalizePersianText } from '../../../../shared/normalization/persian-text-normalizer.js';

export const LEGAL_IDENTIFICATION_MAX_LENGTH = 50;

/**
 * National ID or Economic Code of the supplier (شناسه ملی / کد اقتصادی / کد ملی).
 * Uniqueness is enforced per tenant when present (PUR-BR-003).
 */
export class LegalIdentificationNumber {
  public readonly value: string;

  private constructor(value: string) {
    this.value = value;
  }

  public static from(raw: string): LegalIdentificationNumber {
    const trimmed = validateNonBlank(raw, 'LegalIdentificationNumber', 'value');
    if (trimmed.length > LEGAL_IDENTIFICATION_MAX_LENGTH) {
      throw new InvalidPrimitiveError(
        'LegalIdentificationNumber',
        `value must be at most ${LEGAL_IDENTIFICATION_MAX_LENGTH} characters but received ${trimmed.length}`,
      );
    }
    // Normalize Persian/Arabic digits to ASCII 0-9
    const normalized = normalizePersianText(trimmed);
    return new LegalIdentificationNumber(normalized);
  }

  public equals(other: unknown): boolean {
    return other instanceof LegalIdentificationNumber && other.value === this.value;
  }

  public toString(): string {
    return this.value;
  }
}
