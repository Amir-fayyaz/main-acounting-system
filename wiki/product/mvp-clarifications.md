# MVP Clarifications and Superseding Decisions

This document supersedes older ambiguous wording in source user stories and
early drafts. It is the implementation authority when documents conflict.

## Roles

Accountant is an active MVP Tenant employee role with full operational and
financial workflows. Stock Keeper is an active MVP role limited to inventory
operations. See `roles-and-permissions.md` for the complete matrix.

## Inventory

Negative inventory is forbidden and is not configurable in the MVP. A sale
with insufficient available stock fails with `INSUFFICIENT_STOCK`; the invoice,
payment, and movement are not committed.

## Payments

Mixed payment is implemented as multiple payment rows on one invoice. Each row
uses `CASH`, `CARD`, or `CREDIT`; `MIXED` is a conceptual invoice-level result,
not a payment-row method.

## Priority Authority

Detailed story priorities are authoritative over aggregate summary tables.
The Users/Shops MVP count is 7 Must and 2 Should stories as recorded in
`product/scope.md`.

## Legacy Paths

Current links must use paths under `wiki/`. References to `docs/01-product/`
or `docs/02-architecture/` are obsolete and must not be used.
