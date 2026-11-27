# Inventory Domain: Items (INV-001.1)

This sub-issue delivers the item domain only. Persistence, revisions, use cases,
audit, public lookup contracts, API and imports belong to the remaining INV-001
sub-issues. No legacy item implementation is used.

## Decisions

- V1 units are the seven codes explicitly proposed in INV-001: `piece`,
  `kilogram`, `gram`, `meter`, `liter`, `box`, `pack`. `ITEM_UNITS` in
  `domain/value-objects/unit-of-measure.ts` is the one extension point. There are
  no tenant-defined units, conversions, services or non-stock items.
- A unit is immutable from creation. There is no setter;
  `assertUnitUnchanged` returns `ITEM_UNIT_IMMUTABLE` for a different valid unit.
  Future update callers must run this guard before applying changes.
- Codes compare without case after trimming, following the supplier pattern.
  Barcodes are opaque, case-sensitive text after trimming, preserving leading
  zeroes. Code/name/barcode limits are 50/200/100 characters respectively.
- Creation requires `existingItems` and an `ItemDuplicatePolicy`. Callers must
  include active and inactive items. Same-tenant codes and present barcodes are
  hard conflicts. Exact normalized-name matches return a successful
  `{ kind: 'possibleDuplicate', matches }` outcome with no created item. Only
  `confirmPossibleDuplicate: true` permits a name match; confirmation never
  overrides a code or barcode conflict. Other tenants are ignored by the rule.
- `ItemNameNormalizer` is an injected function contract, matching PUR-001's
  domain pattern. PUR-001 S2 must supply the shared Persian implementation when
  application wiring is added. Only tests contain a simple normalization stub;
  inventory implements no normalization algorithm.
- Tenant identity is an explicit shared `EntityId`, so UUID spelling cannot
  bypass duplicate checking. Every timestamp is an injected `DateTime`.
- New items are active. Deactivation retains all data, and `assertActive`
  returns `ITEM_INACTIVE` for use in future operation/lookup boundaries.
  Repeated transitions return `ITEM_ALREADY_ACTIVE` or `ITEM_ALREADY_INACTIVE`
  without changing timestamps. No deletion operation exists.

Expected failures use `Result` and `DomainError`, including value validation.
Missing the mandatory existing-item array is a programming contract violation,
reported as `InvalidPrimitiveError`. Domain errors carry no HTTP dependency;
categories support the central error mapping in the later presentation issue.

## Tests

`test/support/item-fixture.ts` builds real domain objects for later purchase and
inventory tests. Aggregate/policy tests live at the inventory module root so
the reusable test fixture stays outside the production domain's import boundary.

```sh
pnpm --filter @accounting-saas/backend test src/modules/inventory
```
