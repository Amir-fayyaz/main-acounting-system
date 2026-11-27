import { describe, expect, it } from 'vitest';
import { DateTime } from '../../shared/time/date-time.js';
import { EntityId } from '../../shared/id/entity-id.js';
import {
  ITEM_NOW,
  ITEM_TENANT,
  itemFixture,
  itemInput,
} from '../../../test/support/item-fixture.js';
import { Item } from './domain/aggregates/item.js';
import { ItemCode } from './domain/value-objects/item-code.js';
import { UnitOfMeasure } from './domain/value-objects/unit-of-measure.js';

const LATER = DateTime.parse('2026-11-02T08:00:00.000Z');

describe('Item', () => {
  it('creates an active tenant-owned item with injected identity and timestamps', () => {
    const id = EntityId.generate();
    const item = itemFixture({ id });
    expect(item.id).toBe(id);
    expect(item.tenantId.equals(ITEM_TENANT)).toBe(true);
    expect(item.code.value).toBe('ITM-001');
    expect(item.name.value).toBe('A4 Paper');
    expect(item.normalizedName).toBe('a4 paper');
    expect(item.unit.value).toBe('pack');
    expect(item.barcode?.value).toBe('001234567890');
    expect(item.description).toBe('Office supplies');
    expect(item.status).toBe('active');
    expect(item.createdAt).toBe(ITEM_NOW);
    expect(item.updatedAt).toBe(ITEM_NOW);
    expect(item.assertActive().isOk()).toBe(true);
  });

  it('allows omitted barcode and description and generates a stable id', () => {
    const item = itemFixture({ barcode: undefined, description: undefined });
    expect(EntityId.isValid(item.id.value)).toBe(true);
    expect(item.barcode).toBeUndefined();
    expect(item.description).toBeUndefined();
  });

  it('reports a possible duplicate without constructing an item', () => {
    const existing = itemFixture();
    const outcome = Item.create(
      itemInput({
        code: ItemCode.create('NEW').valueOrThrow(),
        barcode: undefined,
        existingItems: [existing],
      }),
    ).valueOrThrow();
    expect(outcome).toEqual({ kind: 'possibleDuplicate', matches: [existing] });
  });

  it('creates a name match only after explicit confirmation', () => {
    const existing = itemFixture();
    const item = itemFixture({
      code: ItemCode.create('NEW').valueOrThrow(),
      barcode: undefined,
      existingItems: [existing],
      confirmPossibleDuplicate: true,
    });
    expect(item.code.value).toBe('NEW');
    expect(item.normalizedName).toBe('a4 paper');
  });

  it.each([
    { code: 'ITM-001', expected: 'ITEM_CODE_DUPLICATE' },
    { code: 'NEW', expected: 'ITEM_BARCODE_DUPLICATE' },
  ])('confirmation cannot bypass $expected', ({ code, expected }) => {
    const result = Item.create(
      itemInput({
        code: ItemCode.create(code).valueOrThrow(),
        existingItems: [itemFixture()],
        confirmPossibleDuplicate: true,
      }),
    );
    expect(result.errorOrThrow().code).toBe(expected);
  });

  it('creates identical data for another tenant', () => {
    const tenantId = EntityId.generate();
    expect(itemFixture({ tenantId, existingItems: [itemFixture()] }).tenantId).toBe(tenantId);
  });

  it('cannot omit duplicate checking from creation', () => {
    const { existingItems: _existing, ...input } = itemInput();
    // @ts-expect-error - existingItems is mandatory in the creation contract
    expect(() => Item.create(input)).toThrow(/existingItems/);
  });

  it('refuses a unit change without altering the item or timestamp', () => {
    const item = itemFixture();
    const result = item.assertUnitUnchanged(UnitOfMeasure.create('piece').valueOrThrow());
    expect(result.errorOrThrow().code).toBe('ITEM_UNIT_IMMUTABLE');
    expect(result.errorOrThrow().category).toBe('BUSINESS_RULE');
    expect(item.unit.value).toBe('pack');
    expect(item.updatedAt).toBe(ITEM_NOW);
  });

  it('accepts an unchanged unit without mutating the timestamp', () => {
    const item = itemFixture();
    expect(item.assertUnitUnchanged(UnitOfMeasure.create('pack').valueOrThrow()).isOk()).toBe(true);
    expect(item.updatedAt).toBe(ITEM_NOW);
  });

  it('deactivates while retaining identity and history, and refuses new operations', () => {
    const item = itemFixture();
    const id = item.id;
    expect(item.deactivate(LATER).isOk()).toBe(true);
    expect(item.status).toBe('inactive');
    expect(item.updatedAt).toBe(LATER);
    expect(item.createdAt).toBe(ITEM_NOW);
    expect(item.id).toBe(id);
    expect(item.name.value).toBe('A4 Paper');
    expect(item.assertActive().errorOrThrow().code).toBe('ITEM_INACTIVE');
  });

  it('reactivates with injected time and allows new operations again', () => {
    const item = itemFixture();
    item.deactivate(ITEM_NOW);
    expect(item.activate(LATER).isOk()).toBe(true);
    expect(item.status).toBe('active');
    expect(item.updatedAt).toBe(LATER);
    expect(item.assertActive().isOk()).toBe(true);
  });

  it.each(['active', 'inactive'] as const)(
    'refuses a repeated transition to %s without mutation',
    (status) => {
      const item = itemFixture();
      if (status === 'inactive') item.deactivate(ITEM_NOW);
      const result = status === 'active' ? item.activate(LATER) : item.deactivate(LATER);
      expect(result.errorOrThrow().code).toBe(
        status === 'active' ? 'ITEM_ALREADY_ACTIVE' : 'ITEM_ALREADY_INACTIVE',
      );
      expect(result.errorOrThrow().category).toBe('STATE_VIOLATION');
      expect(item.status).toBe(status);
      expect(item.updatedAt).toBe(ITEM_NOW);
    },
  );

  it('trims an optional description and refuses non-text values', () => {
    expect(itemFixture({ description: '  Details  ' }).description).toBe('Details');
    expect(itemFixture({ description: '  ' }).description).toBeUndefined();
    const result = Item.create(
      itemInput({
        // @ts-expect-error - non-text description at a runtime boundary
        description: 123,
      }),
    );
    expect(result.errorOrThrow().category).toBe('VALIDATION');
  });
});
