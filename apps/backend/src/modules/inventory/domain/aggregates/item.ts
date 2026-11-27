import { ValidationError } from '../../../../shared/errors/category-errors.js';
import type { DomainError } from '../../../../shared/errors/domain-error.js';
import { Result } from '../../../../shared/errors/result.js';
import { EntityId } from '../../../../shared/id/entity-id.js';
import type { DateTime } from '../../../../shared/time/date-time.js';
import {
  ItemAlreadyActiveError,
  ItemAlreadyInactiveError,
  ItemInactiveError,
  ItemUnitImmutableError,
} from '../errors/item.errors.js';
import type {
  ItemDuplicatePolicy,
  ItemDuplicateRecord,
} from '../policies/item-duplicate.policy.js';
import type { ItemCode } from '../value-objects/item-code.js';
import type { ItemName } from '../value-objects/item-name.js';
import type { ItemBarcode } from '../value-objects/item-barcode.js';
import type { UnitOfMeasure } from '../value-objects/unit-of-measure.js';

export type ItemStatus = 'active' | 'inactive';

export interface CreateItemInput {
  readonly id?: EntityId;
  readonly tenantId: EntityId;
  readonly code: ItemCode;
  readonly name: ItemName;
  readonly unit: UnitOfMeasure;
  readonly barcode?: ItemBarcode;
  readonly description?: string;
  readonly now: DateTime;
  /** Required even when empty; inactive records must be included. */
  readonly existingItems: readonly ItemDuplicateRecord[];
  readonly duplicatePolicy: ItemDuplicatePolicy;
  readonly confirmPossibleDuplicate?: boolean;
}

export type ItemCreationOutcome =
  | { readonly kind: 'created'; readonly item: Item }
  | { readonly kind: 'possibleDuplicate'; readonly matches: readonly ItemDuplicateRecord[] };

/** Tenant identity and time are explicit inputs. No deletion or unit setter exists. */
export class Item {
  private _status: ItemStatus = 'active';
  private _updatedAt: DateTime;

  private constructor(
    public readonly id: EntityId,
    public readonly tenantId: EntityId,
    public readonly code: ItemCode,
    public readonly name: ItemName,
    public readonly normalizedName: string,
    private readonly _unit: UnitOfMeasure,
    public readonly barcode: ItemBarcode | undefined,
    public readonly description: string | undefined,
    public readonly createdAt: DateTime,
  ) {
    this._updatedAt = createdAt;
  }

  public static create(input: CreateItemInput): Result<ItemCreationOutcome, DomainError> {
    if (input.description !== undefined && typeof input.description !== 'string') {
      return Result.fail(new ValidationError('Item description must be text.'));
    }
    const assessment = input.duplicatePolicy.evaluate(input, input.existingItems);
    if (assessment.isFail()) return Result.fail(assessment.errorOrThrow());
    const { normalizedName, decision } = assessment.valueOrThrow();
    if (decision.kind === 'possibleDuplicate' && input.confirmPossibleDuplicate !== true) {
      return Result.ok({ kind: 'possibleDuplicate', matches: decision.matches });
    }
    return Result.ok({
      kind: 'created',
      item: new Item(
        input.id ?? EntityId.generate(),
        input.tenantId,
        input.code,
        input.name,
        normalizedName,
        input.unit,
        input.barcode,
        input.description?.trim() || undefined,
        input.now,
      ),
    });
  }

  public get unit(): UnitOfMeasure {
    return this._unit;
  }

  public get status(): ItemStatus {
    return this._status;
  }

  public get updatedAt(): DateTime {
    return this._updatedAt;
  }

  /** Update callers use this guard before applying any other changes. */
  public assertUnitUnchanged(unit: UnitOfMeasure): Result<void, ItemUnitImmutableError> {
    return unit.value === this._unit.value
      ? Result.ok(undefined)
      : Result.fail(new ItemUnitImmutableError());
  }

  public assertActive(): Result<void, ItemInactiveError> {
    return this._status === 'active' ? Result.ok(undefined) : Result.fail(new ItemInactiveError());
  }

  public deactivate(now: DateTime): Result<void, ItemAlreadyInactiveError> {
    if (this._status === 'inactive') return Result.fail(new ItemAlreadyInactiveError());
    this._status = 'inactive';
    this._updatedAt = now;
    return Result.ok(undefined);
  }

  public activate(now: DateTime): Result<void, ItemAlreadyActiveError> {
    if (this._status === 'active') return Result.fail(new ItemAlreadyActiveError());
    this._status = 'active';
    this._updatedAt = now;
    return Result.ok(undefined);
  }
}
