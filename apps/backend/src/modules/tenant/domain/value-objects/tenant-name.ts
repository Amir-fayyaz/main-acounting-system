import { validateNonBlank } from '../../../../shared/primitives/assert.js';
import { InvalidPrimitiveError } from '../../../../shared/primitives/invalid-primitive-error.js';

/**
 * The tenant's display name (IAM-001).
 *
 * A value object, not a bare string, so the one rule the domain has about a
 * name — it is present and bounded — cannot be skipped by whichever code path
 * happens to build a tenant. Trimming happens here, once, so two spellings of
 * the same name compare equal and storage never keeps incidental whitespace.
 *
 * The bound is a storage-conscious ceiling (the column is `VARCHAR(200)`), not a
 * business policy: what a name must *contain* is not something this stage
 * decides, and a future rule would extend this type rather than a column.
 */
export class TenantName {
  /** Longest accepted name, matching the persistence column width. */
  public static readonly MAX_LENGTH = 200;

  /** The trimmed, non-blank name. */
  public readonly value: string;

  private constructor(value: string) {
    this.value = value;
  }

  /**
   * Wraps a raw name.
   *
   * @throws InvalidPrimitiveError — a non-string, blank, or over-long value is
   * a programming error at this layer: the HTTP boundary (FND-006) rejects it
   * as a client mistake before a use case ever constructs one, and any other
   * path constructing an invalid name has a bug rather than a business answer.
   */
  public static from(value: string): TenantName {
    const trimmed = validateNonBlank(value, 'TenantName', 'value');

    if (trimmed.length > TenantName.MAX_LENGTH) {
      throw new InvalidPrimitiveError(
        'TenantName',
        `value must be at most ${TenantName.MAX_LENGTH} characters but received ${trimmed.length}`,
      );
    }

    return new TenantName(trimmed);
  }

  /** Value equality: the same name text. */
  public equals(other: unknown): boolean {
    return other instanceof TenantName && other.value === this.value;
  }

  public toString(): string {
    return this.value;
  }

  /** Serializes as a bare string, the identifier/text wire format of FND-006. */
  public toJSON(): string {
    return this.value;
  }
}
