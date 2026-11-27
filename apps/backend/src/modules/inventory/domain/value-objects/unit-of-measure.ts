import { Result } from '../../../../shared/errors/result.js';
import { ItemUnitInvalidError } from '../errors/item.errors.js';

/** V1 system codes. Extend here; companies cannot define their own units. */
export const ITEM_UNITS = Object.freeze([
  'piece',
  'kilogram',
  'gram',
  'meter',
  'liter',
  'box',
  'pack',
] as const);

export type UnitOfMeasureCode = (typeof ITEM_UNITS)[number];

export class UnitOfMeasure {
  private constructor(public readonly value: UnitOfMeasureCode) {
    Object.freeze(this);
  }

  public static create(raw: unknown): Result<UnitOfMeasure, ItemUnitInvalidError> {
    const code = ITEM_UNITS.find((unit) => unit === raw);
    return code === undefined
      ? Result.fail(new ItemUnitInvalidError())
      : Result.ok(new UnitOfMeasure(code));
  }

  public toJSON(): string {
    return this.value;
  }
}
