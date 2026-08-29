# Logging, Storage, CQRS, and Event Sourcing Decisions

## 1. Decision Summary

The MVP uses PostgreSQL as the authoritative operational store, structured
application logs, append-only business history, and selective CQRS for read
models. Full Event Sourcing is explicitly deferred.

## 2. Operational Data Storage

PostgreSQL is the source of truth for Tenant, identity, catalog, sales,
purchases, payments, expenses, and inventory data.

Redis may be introduced for short-lived cache, rate limiting, and job
coordination. Redis is never authoritative for financial or inventory state.

Object storage is used for generated PDFs, uploaded assets, and exports. The
database stores metadata and a secured object key, not large binary content.

## 3. Logging

Application logs are structured JSON and include:

- timestamp, level, service, environment, and version
- request ID and correlation ID
- user ID and Tenant ID when available
- operation, outcome, duration, and error code

Logs must not contain passwords, tokens, raw personal secrets, or payment
credentials. Sensitive personal data is minimized or redacted.

Security logs and business audit events are separate:

- Security logs cover authentication failures, permission denials, and
  suspicious access.
- Business audit events cover changes to invoices, payments, inventory,
  memberships, roles, and Tenant settings.

Business audit events are append-only and retained according to the product's
retention policy. Logs are operational evidence and are not the financial
source of truth.

## 4. Event Bus vs. Event Sourcing

The system uses events to communicate committed changes and trigger
asynchronous work. This is event-driven integration, not Event Sourcing.

The current state remains in normal PostgreSQL tables. Events and outbox rows
are retained for integration, audit, and projection purposes.

Full Event Sourcing is deferred because it would add replay, schema evolution,
projection recovery, debugging, and operational complexity before the MVP has
demonstrated a need for it.

## 5. CQRS Decision

CQRS is applied selectively:

- Commands use application use cases and transactional writes.
- Queries use read-optimized repositories or projections.
- Reporting projections are rebuildable from operational records and events.
- Simple CRUD queries may use the same database without artificial separation.

There are no separate command and query services in the MVP. A future Go
reporting or analytics worker may consume versioned events and own a read
model.

## 6. Append-Only Business History

The following are append-only regardless of whether Event Sourcing is used:

- inventory movements
- payments and payment reversals
- confirmed financial documents
- corrections, returns, and reversals
- business audit events
- outbox events

Projections such as inventory balance and report summaries may be updated or
rebuilt, but they must not replace authoritative history.

## 7. Retention and Recovery

Operational records, audit events, outbox records, logs, and uploaded files
have separate retention policies. Financial and inventory history must be
covered by backup and restore procedures. Deleting operational logs must never
delete business records.

## 8. Future Migration Path

If Event Sourcing becomes necessary, it should begin with a bounded context
such as inventory or reporting, not the entire platform. Existing append-only
movements and immutable documents provide a practical migration starting point.
