import { validateNonBlank } from '../../../../shared/primitives/assert.js';
import { InvalidPrimitiveError } from '../../../../shared/primitives/invalid-primitive-error.js';

/**
 * The human label of a fiscal year — `FY2024`, `1403`, `Year to June` (FIS-002).
 *
 * A value object, not a bare string, so the rules the domain has about a label
 * — it is present and bounded — cannot be skipped by whichever code path
 * happens to build a year. Trimming happens here, once, so two spellings of
 * the same label compare equal and storage never keeps incidental whitespace
 * (`FY2024` and `FY2024 ` are one label, and the per-tenant uniqueness rule
 * sees them as one).
 *
 * The bound is a storage-conscious ceiling (the column is `VARCHAR(100)`), not
 * a business policy about what a label must *contain*.
 */
export class FiscalYearLabel {
  /** Longest accepted label, matching the persistence column width. */
  public static readonly MAX_LENGTH = 100;

  /** The trimmed, non-blank label. */
  public readonly value: string;

  private constructor(value: string) {
    this.value = value;
  }

  /**
   * Wraps a raw label.
   *
   * @throws InvalidPrimitiveError — a non-string, blank, or over-long value is
   * a programming error at this layer: the boundary rejects it as a client
   * mistake before a use case ever constructs one, and any other path
   * constructing an invalid label has a bug rather than a business answer.
   */
  public static from(value: string): FiscalYearLabel {
    const trimmed = validateNonBlank(value, 'FiscalYearLabel', 'value');

    if (trimmed.length > FiscalYearLabel.MAX_LENGTH) {
      throw new InvalidPrimitiveError(
        'FiscalYearLabel',
        `value must be at most ${FiscalYearLabel.MAX_LENGTH} characters but received ${trimmed.length}`,
      );
    }

    return new FiscalYearLabel(trimmed);
  }

  /** Value equality: the same label text. */
  public equals(other: unknown): boolean {
    return other instanceof FiscalYearLabel && other.value === this.value;
  }

  public toString(): string {
    return this.value;
  }

  /** Serializes as a bare string, the identifier/text wire format of FND-006. */
  public toJSON(): string {
    return this.value;
  }
}
