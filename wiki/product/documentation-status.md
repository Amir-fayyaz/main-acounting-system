# Documentation Status

## Closed for MVP

The following decisions are approved: Accountant as an active Tenant role,
Tenant membership for employees, non-negative inventory, FIFO/LIFO at Tenant
level, immutable financial documents, InventoryMovement as source of truth,
PostgreSQL, Prisma, UUID v4, Argon2id, JWT with rotated refresh tokens,
BullMQ/Redis, idempotency, page-based pagination, and selective CQRS.

The detailed sources are `mvp-clarifications.md`,
`technical-decisions-mvp.md`, the accepted ADRs, and the relevant domain/API
documents.

The final implementation baseline is `mvp-decisions-final.md`. It supersedes
remaining MVP `TBD` markers in older exploratory documents. The executable
contracts are `api/mvp-api-implementation.md` and
`data/prisma-mvp-model.md`.

## Intentionally Deferred

OTP provider and exact OTP policy, SMS/email/file providers, online payment
gateway, VAT/tax, opening balances, fiscal periods, observability vendor,
retention durations, production RPO/RTO, and advanced accounting remain open.
They are not blockers for the core MVP domain implementation.

Membership shape, money representation, discount behavior, credit payment
rules, FIFO/LIFO layer behavior, return semantics, and MVP plan limits are now
closed by `mvp-decisions-final.md`.

## Source of Truth Rule

When an older document says `TBD` but a newer approved decision defines the
behavior, the newer decision wins. This document prevents stale drafts from
being treated as implementation requirements.

## Domain Addendum

Return is a new linked document using `document_links` with
`link_type=RETURN`; it is not a mutable update to the original invoice.
InventoryMovement is authoritative and InventoryBalance is rebuildable.
