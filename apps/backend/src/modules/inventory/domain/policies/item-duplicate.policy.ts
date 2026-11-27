import { ValidationError } from '../../../../shared/errors/category-errors.js';
import type { DomainError } from '../../../../shared/errors/domain-error.js';
import { Result } from '../../../../shared/errors/result.js';
import type { EntityId } from '../../../../shared/id/entity-id.js';
import { InvalidPrimitiveError } from '../../../../shared/primitives/invalid-primitive-error.js';
import { ItemBarcodeDuplicateError, ItemCodeDuplicateError } from '../errors/item.errors.js';
import type { ItemCode } from '../value-objects/item-code.js';
import type { ItemName } from '../value-objects/item-name.js';
import type { ItemBarcode } from '../value-objects/item-barcode.js';

/** Supply the PUR-001 shared normalizer here; normalization is not owned by inventory. */
export type ItemNameNormalizer = (name: string) => string;

export interface ItemDuplicateCandidate {
  readonly tenantId: EntityId;
  readonly code: ItemCode;
  readonly name: ItemName;
  readonly barcode?: ItemBarcode;
}

export interface ItemDuplicateRecord extends ItemDuplicateCandidate {
  readonly id: EntityId;
  readonly normalizedName: string;
}

export type ItemDuplicateDecision =
  | { readonly kind: 'clear' }
  | { readonly kind: 'possibleDuplicate'; readonly matches: readonly ItemDuplicateRecord[] };

export interface ItemDuplicateAssessment {
  readonly normalizedName: string;
  readonly decision: ItemDuplicateDecision;
}

export class ItemDuplicatePolicy {
  public constructor(private readonly normalize: ItemNameNormalizer) {}

  public evaluate(
    candidate: ItemDuplicateCandidate,
    existingItems: readonly ItemDuplicateRecord[],
  ): Result<ItemDuplicateAssessment, DomainError> {
    if (!Array.isArray(existingItems)) {
      throw new InvalidPrimitiveError('ItemDuplicatePolicy', 'existingItems must be an array');
    }

    const normalizedName = this.normalize(candidate.name.value);
    if (typeof normalizedName !== 'string' || normalizedName.trim() === '') {
      return Result.fail(new ValidationError('The normalized item name must not be empty.'));
    }
    const sameTenant = existingItems.filter((item) => item.tenantId.equals(candidate.tenantId));
    // Hard conflicts take priority over name warnings, independent of record order.
    if (sameTenant.some((item) => item.code.equals(candidate.code))) {
      return Result.fail(new ItemCodeDuplicateError());
    }
    const barcode = candidate.barcode;
    if (barcode !== undefined && sameTenant.some((item) => item.barcode?.equals(barcode))) {
      return Result.fail(new ItemBarcodeDuplicateError());
    }
    const matches = sameTenant.filter((item) => item.normalizedName === normalizedName);
    return Result.ok({
      normalizedName,
      decision: matches.length === 0 ? { kind: 'clear' } : { kind: 'possibleDuplicate', matches },
    });
  }
}
