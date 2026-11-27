import { describe, expect, it } from 'vitest';
import { EntityId } from '../../shared/id/entity-id.js';
import { itemFixture, itemInput, itemDuplicatePolicy } from '../../../test/support/item-fixture.js';
import { ItemCode } from './domain/value-objects/item-code.js';
import { ItemName } from './domain/value-objects/item-name.js';
import { ItemBarcode } from './domain/value-objects/item-barcode.js';
import { ItemDuplicatePolicy } from './domain/policies/item-duplicate.policy.js';

describe('ItemDuplicatePolicy', () => {
  it('reports a code conflict before a barcode or name match, regardless of input order', () => {
    const nameMatch = itemFixture({
      code: ItemCode.create('OTHER').valueOrThrow(),
      barcode: undefined,
    });
    const barcodeMatch = itemFixture({ code: ItemCode.create('BARCODE').valueOrThrow() });
    const codeMatch = itemFixture({ barcode: undefined });
    const error = itemDuplicatePolicy
      .evaluate(itemInput(), [nameMatch, barcodeMatch, codeMatch])
      .errorOrThrow();
    expect(error.code).toBe('ITEM_CODE_DUPLICATE');
    expect(error.category).toBe('CONFLICT');
  });

  it('refuses a barcode match even when the code differs', () => {
    const existing = itemFixture();
    const result = itemDuplicatePolicy.evaluate(
      itemInput({ code: ItemCode.create('NEW').valueOrThrow() }),
      [existing],
    );
    expect(result.errorOrThrow().code).toBe('ITEM_BARCODE_DUPLICATE');
  });

  it('reports all exact normalized-name matches without including other tenants', () => {
    const first = itemFixture({ code: ItemCode.create('ONE').valueOrThrow(), barcode: undefined });
    const second = itemFixture({ code: ItemCode.create('TWO').valueOrThrow(), barcode: undefined });
    const foreign = itemFixture({ tenantId: EntityId.generate() });
    const result = itemDuplicatePolicy
      .evaluate(
        itemInput({
          code: ItemCode.create('NEW').valueOrThrow(),
          barcode: undefined,
          name: ItemName.create('  a4   PAPER ').valueOrThrow(),
        }),
        [first, foreign, second],
      )
      .valueOrThrow();
    expect(result.normalizedName).toBe('a4 paper');
    expect(result.decision).toEqual({ kind: 'possibleDuplicate', matches: [first, second] });
  });

  it('allows identical data in a different tenant', () => {
    const result = itemDuplicatePolicy.evaluate(itemInput({ tenantId: EntityId.generate() }), [
      itemFixture(),
    ]);
    expect(result.valueOrThrow().decision.kind).toBe('clear');
  });

  it('compares canonical tenant identity rather than UUID spelling', () => {
    const existing = itemFixture();
    const result = itemDuplicatePolicy.evaluate(
      itemInput({ tenantId: EntityId.from(existing.tenantId.value.toUpperCase()) }),
      [existing],
    );
    expect(result.errorOrThrow().code).toBe('ITEM_CODE_DUPLICATE');
  });

  it('does not treat absent barcodes as duplicates', () => {
    const existing = itemFixture({ barcode: undefined });
    const result = itemDuplicatePolicy.evaluate(
      itemInput({
        code: ItemCode.create('NEW').valueOrThrow(),
        name: ItemName.create('Different').valueOrThrow(),
        barcode: undefined,
      }),
      [existing],
    );
    expect(result.valueOrThrow().decision.kind).toBe('clear');
  });

  it('uses the injected normalized name for comparison and storage', () => {
    const policy = new ItemDuplicatePolicy(() => 'canonical supplied by PUR-001');
    const existing = itemFixture({ duplicatePolicy: policy });
    const result = policy.evaluate(
      itemInput({ code: ItemCode.create('NEW').valueOrThrow(), barcode: undefined }),
      [existing],
    );
    expect(result.valueOrThrow().normalizedName).toBe('canonical supplied by PUR-001');
    expect(result.valueOrThrow().decision.kind).toBe('possibleDuplicate');
  });

  it('refuses an empty normalizer output', () => {
    const result = new ItemDuplicatePolicy(() => ' ').evaluate(itemInput(), []);
    expect(result.errorOrThrow().category).toBe('VALIDATION');
  });

  it('requires an explicit existing-item collection at runtime', () => {
    // @ts-expect-error - callers must supply the existing items, even when empty
    expect(() => itemDuplicatePolicy.evaluate(itemInput())).toThrow(/existingItems/);
  });

  it('retains inactive items in duplicate checking', () => {
    const existing = itemFixture();
    existing.deactivate(existing.createdAt);
    expect(itemDuplicatePolicy.evaluate(itemInput(), [existing]).errorOrThrow().code).toBe(
      'ITEM_CODE_DUPLICATE',
    );
    const barcodeConflict = itemInput({ code: ItemCode.create('NEW').valueOrThrow() });
    expect(itemDuplicatePolicy.evaluate(barcodeConflict, [existing]).errorOrThrow().code).toBe(
      'ITEM_BARCODE_DUPLICATE',
    );
  });

  it('allows a distinct barcode instead of confusing leading zeroes', () => {
    const existing = itemFixture({ barcode: ItemBarcode.create('001').valueOrThrow() });
    const candidate = itemInput({
      code: ItemCode.create('NEW').valueOrThrow(),
      name: ItemName.create('Different').valueOrThrow(),
      barcode: ItemBarcode.create('1').valueOrThrow(),
    });
    expect(itemDuplicatePolicy.evaluate(candidate, [existing]).valueOrThrow().decision.kind).toBe(
      'clear',
    );
  });
});
