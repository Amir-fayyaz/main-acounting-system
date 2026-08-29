# ADR-001 — NestJS Modular Monolith

## Status

Accepted

## Context

The MVP needs fast delivery, strong Tenant isolation, and transactional
consistency. Future workloads may justify Go workers or independent services.

## Decision

Build the MVP as a NestJS Modular Monolith. Modules use domain, application,
infrastructure, and presentation boundaries. Cross-module access uses ports,
use cases, or versioned events; modules do not access each other's repositories
or ORM entities.

Future extraction to Go is allowed only after measured performance or scaling
needs justify the operational cost.

## Consequences

The MVP has one deployable application and one operational database, while
preserving clear extraction boundaries and asynchronous worker seams.
