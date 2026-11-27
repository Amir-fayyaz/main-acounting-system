import { ValidationError } from '../../../../shared/errors/category-errors.js';
import { Result } from '../../../../shared/errors/result.js';

export class ItemName {
  public static readonly MAX_LENGTH = 200;

  private constructor(public readonly value: string) {
    Object.freeze(this);
  }

  public static create(raw: unknown): Result<ItemName, ValidationError> {
    if (typeof raw !== 'string' || raw.trim() === '' || raw.trim().length > ItemName.MAX_LENGTH) {
      return Result.fail(
        new ValidationError('Item name must contain 1 to 200 characters.', [
          {
            code: 'ITEM_NAME_INVALID',
            field: 'name',
            message: 'Provide a non-empty item name of at most 200 characters.',
          },
        ]),
      );
    }
    return Result.ok(new ItemName(raw.trim()));
  }

  public equals(other: ItemName): boolean {
    return this.value === other.value;
  }

  public toJSON(): string {
    return this.value;
  }
}
