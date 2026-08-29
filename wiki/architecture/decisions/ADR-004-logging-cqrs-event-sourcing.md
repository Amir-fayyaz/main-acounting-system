# ADR-004 — Logging, CQRS, and Event Sourcing for MVP

## Status

Accepted

## Decision

Use PostgreSQL as the operational source of truth, structured JSON logs for
operations, append-only audit/history for financial and inventory records, and
selective CQRS for reporting projections. Do not implement full Event
Sourcing or separate command/query services in the MVP.

## Rationale

The product requires financial traceability and future scale, but full Event
Sourcing would increase complexity before the domain and traffic patterns are
proven. Append-only business records and a transactional outbox preserve the
important guarantees while keeping development and operations manageable.

## Consequences

- Reports may become eventually consistent when using projections.
- Projections must be rebuildable and monitored.
- Events require versioned schemas and idempotent consumers.
- A bounded context may adopt Event Sourcing later after a measured need and a
  separate migration decision.
