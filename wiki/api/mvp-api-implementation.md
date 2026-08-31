# MVP API Implementation Contract

This document supplements `mvp-api-contract.md` and is the implementation
contract. All IDs are UUID strings and all amounts are integer minor units.

## Request conventions

- `Authorization: Bearer <access-token>` is required except register/login.
- `X-Active-Tenant: <tenant-id>` selects a tenant. The server verifies
  membership; request-body tenant IDs are ignored for authorization.
- Mutations accept `Idempotency-Key` (16-128 characters). Reusing a key with a
  different request returns `409 IDEMPOTENCY_KEY_REUSED`.
- Lists return `{ data, page: { cursor, next_cursor, has_more } }` and use
  stable ordering by `created_at DESC, id DESC`.

## Authentication

- `POST /auth/register` → `201 { user, tenant, access_token, refresh_token }`.
- `POST /auth/login` → `200 { user, access_token, refresh_token }`.
- `POST /auth/refresh` rotates the refresh token and returns a new pair.
- `POST /auth/logout` revokes the presented refresh-token family.
- Credentials are normalized email or phone; passwords use Argon2id.

## Resource rules

- `POST /sales/invoices` atomically validates lines, discount, payments,
  customer, stock, invoice number, movements, and balances.
- `POST /sales/invoices/{id}/returns` accepts line quantities and creates a
  linked compensating document; returned quantity cannot exceed unreturned
  quantity.
- `POST /purchases/invoices` accepts supplier, lines, payments, and creates
  inbound movements atomically.
- `POST /inventory/adjustments` requires `product_id`, signed `quantity`, and
  `reason`.
- `POST /payments` is only for standalone customer/supplier settlement when
  later enabled; invoice payments are submitted with the invoice.

## Error catalogue

`VALIDATION_ERROR`, `UNAUTHENTICATED`, `FORBIDDEN`, `NOT_FOUND`,
`INSUFFICIENT_STOCK`, `PAYMENT_TOTAL_MISMATCH`, `CREDIT_CUSTOMER_REQUIRED`,
`IMMUTABLE_DOCUMENT`, `DUPLICATE_NUMBER`, `DUPLICATE_SKU`,
`IDEMPOTENCY_KEY_REUSED`, `CONCURRENT_MODIFICATION`, `TENANT_SUSPENDED`.

Every error includes `code`, safe `message`, optional field `details`, and
`request_id`; secrets and internal SQL errors are never returned.

