import { ValidationError } from '../../../../shared/errors/category-errors.js';
import { Result } from '../../../../shared/errors/result.js';

/** Opaque text: leading zeroes and case are significant; no barcode format is assumed. */
export class ItemBarcode {
  public static readonly MAX_LENGTH = 100;

  private constructor(public readonly value: string) {
    Object.freeze(this);
  }

  public static create(raw: unknown): Result<ItemBarcode, ValidationError> {
    if (
      typeof raw !== 'string' ||
      raw.trim() === '' ||
      raw.trim().length > ItemBarcode.MAX_LENGTH
    ) {
      return Result.fail(
        new ValidationError('Item barcode must contain 1 to 100 characters.', [
          {
            code: 'ITEM_BARCODE_INVALID',
            field: 'barcode',
            message: 'Provide a non-empty barcode of at most 100 characters, or omit it.',
          },
        ]),
      );
    }
    return Result.ok(new ItemBarcode(raw.trim()));
  }

  public equals(other: ItemBarcode): boolean {
    return this.value === other.value;
  }

  public toJSON(): string {
    return this.value;
  }
}
