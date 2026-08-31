# Final MVP Decisions

Status: Approved implementation baseline. These decisions close the remaining
MVP ambiguities. A later ADR is required to change any item.

## Identity and tenancy

- `Tenant` is the shop/business boundary. Every business row has `tenant_id`.
- A user may own many tenants and may be a member of many tenants.
- Membership has one role in MVP: `OWNER`, `ACCOUNTANT`, `CASHIER`, or
  `STOCK_KEEPER`. A user selects one active tenant per session.
- The owner is also an implicit active membership and cannot be removed.
- Membership changes apply immediately to new requests; suspended tenants and
  memberships cannot perform business operations.

## Money and dates

- Amounts use integer minor units (`bigint`), never floating point.
- Tenant currency is ISO-4217 and is immutable after the first financial
  document. MVP supports one currency per tenant.
- API timestamps are UTC ISO-8601. Reports use the tenant timezone.
- All financial calculations use decimal-safe integer arithmetic.

## Products, pricing, and discounts

- SKU and barcode are optional, but if present are unique within a tenant.
- Product and service prices are non-negative. A service never creates stock.
- A sale line stores the effective unit price; historical documents never read
  a current product price.
- MVP supports a document-level fixed discount in minor units. Discount cannot
  make the total negative. Percentage discounts are deferred.

## Sales, payments, and credit

- Sales are confirmed at creation; there is no editable draft in MVP.
- Payment rows use `CASH`, `CARD`, or `CREDIT`. Multiple rows are allowed.
- The sum of payment rows must equal the invoice total. `CREDIT` requires a
  customer and represents the unpaid portion.
- Cash and card rows require an active financial account; credit does not.
- A customer is optional for fully paid cash/card sales.
- Payments are owned by one invoice in MVP and cannot be reused.

## Inventory and valuation

- Negative inventory is forbidden.
- `InventoryMovement` is authoritative; `InventoryBalance` is rebuildable.
- FIFO is the default valuation method; LIFO is selectable per tenant.
- A stock layer records remaining quantity and unit cost. Sales consume layers
  in the tenant method order. Services create no movement.
- Returns restore quantity and use the original sale's recorded cost.
- Adjustments require a reason and an explicit positive or negative quantity.

## Corrections and accounting boundary

- Confirmed invoices, payments, movements, and audit events are immutable.
- Return, reversal, and correction are new linked documents.
- MVP provides operational balances and simple P&L; it does not post a
  double-entry ledger. Accounting entities remain a future bounded context.

## Plans and limits

- MVP has `FREE` and `PAID` plan labels only.
- Plan enforcement is limited to an optional monthly confirmed-invoice count;
  the default is unlimited during MVP development.
- Billing provider, VAT, tax, opening balances, fiscal periods, and online
  payments are explicitly out of scope.

