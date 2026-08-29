# MVP Technical Decisions

## ORM and Database

Use PostgreSQL with Prisma migrations. Prisma is an infrastructure concern;
domain code must not depend on Prisma models. All schema changes are reviewed
and versioned migrations.

## Identifier Strategy

Use UUID v4 identifiers generated server-side. IDs are opaque API values and
never replace Tenant authorization. Human-readable invoice numbers are scoped
to a Tenant and generated transactionally.

## Authentication

Use Argon2id for password hashing. Access JWTs are short-lived (15 minutes).
Refresh tokens are stored hashed, rotated on use, revocable, and associated
with a User and session/device. JWT contains user ID, active Tenant ID when
selected, role snapshot, issued-at, expiry, and token ID. Membership is still
revalidated server-side for sensitive operations.

## Deletion Policy

Financial documents, payments, inventory movements, audit events, and outbox
events are never deleted through the application. Users, products, and
contacts use an `is_active` lifecycle in the MVP.

## Idempotency and Concurrency

Financial and inventory commands require `Idempotency-Key`. Store the key,
request hash, response, status, and expiry with a unique `(tenant_id, user_id,
key)` constraint. Initial retention is 24 hours. Use PostgreSQL transactions
and row-level locks on inventory balances; recheck stock inside the transaction.

## Queue and Outbox

Use BullMQ with Redis for MVP background jobs. The transactional outbox is
stored in PostgreSQL. Workers use bounded exponential retry, then a dead-letter
queue. Every job is Tenant-scoped and idempotent.

## Pagination and Errors

MVP list endpoints use page-based pagination: `page` starts at 1 and `limit` is
between 1 and 100. Error responses use stable machine-readable `error.code`
values and a `request_id`.
