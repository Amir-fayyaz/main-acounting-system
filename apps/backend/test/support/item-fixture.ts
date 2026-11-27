import { EntityId } from '../../src/shared/id/entity-id.js';
import { DateTime } from '../../src/shared/time/date-time.js';
import { Item, type CreateItemInput } from '../../src/modules/inventory/domain/aggregates/item.js';
import { ItemDuplicatePolicy } from '../../src/modules/inventory/domain/policies/item-duplicate.policy.js';
import { ItemCode } from '../../src/modules/inventory/domain/value-objects/item-code.js';
import { ItemName } from '../../src/modules/inventory/domain/value-objects/item-name.js';
import { ItemBarcode } from '../../src/modules/inventory/domain/value-objects/item-barcode.js';
import { UnitOfMeasure } from '../../src/modules/inventory/domain/value-objects/unit-of-measure.js';

export const ITEM_TENANT = EntityId.from('018f0d3c-6d0f-7a4b-9d4e-2b3c4d5e6f70');
export const ITEM_NOW = DateTime.parse('2026-11-01T08:00:00.000Z');

// Deliberately a stub: PUR-001 S2 owns Persian normalization.
export const itemDuplicatePolicy = new ItemDuplicatePolicy((name) =>
  name.trim().replace(/\s+/g, ' ').toLowerCase(),
);

export function itemInput(overrides: Partial<CreateItemInput> = {}): CreateItemInput {
  return {
    tenantId: ITEM_TENANT,
    code: ItemCode.create('ITM-001').valueOrThrow(),
    name: ItemName.create('A4 Paper').valueOrThrow(),
    unit: UnitOfMeasure.create('pack').valueOrThrow(),
    barcode: ItemBarcode.create('001234567890').valueOrThrow(),
    description: 'Office supplies',
    now: ITEM_NOW,
    existingItems: [],
    duplicatePolicy: itemDuplicatePolicy,
    ...overrides,
  };
}

export function itemFixture(overrides: Partial<CreateItemInput> = {}): Item {
  const outcome = Item.create(itemInput(overrides)).valueOrThrow();
  if (outcome.kind !== 'created') throw new Error('Expected a created item fixture.');
  return outcome.item;
}
