import { ValidationError } from '../../../../shared/errors/category-errors.js';
import { Result } from '../../../../shared/errors/result.js';

export class ItemCode {
  public static readonly MAX_LENGTH = 50;

  private constructor(public readonly value: string) {
    Object.freeze(this);
  }

  public static create(raw: unknown): Result<ItemCode, ValidationError> {
    if (typeof raw !== 'string' || raw.trim() === '' || raw.trim().length > ItemCode.MAX_LENGTH) {
      return Result.fail(
        new ValidationError('Item code must contain 1 to 50 characters.', [
          {
            code: 'ITEM_CODE_INVALID',
            field: 'code',
            message: 'Provide a non-empty item code of at most 50 characters.',
          },
        ]),
      );
    }
    return Result.ok(new ItemCode(raw.trim()));
  }

  public equals(other: ItemCode): boolean {
    return this.value.toLowerCase() === other.value.toLowerCase();
  }

  public toJSON(): string {
    return this.value;
  }
}
