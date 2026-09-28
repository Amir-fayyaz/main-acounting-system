# Packages

Shared, publishable code for the monorepo. `apps/*` may depend on `packages/*`;
`packages/*` must never depend on an app.

## What may live here

Per ADR-002 (section 10 — Shared Kernel) and TECH-013, a package is allowed only when
it holds something **truly domain-agnostic**:

- technical primitives with no business meaning,
- generated/stable cross-application contracts (for example a generated API client),
- build/tooling helpers that are not domain logic.

Anything that carries business meaning or a business rule belongs to the owning module
in `apps/backend/src/modules/<module>/`, even when more than one module needs it.

## What may not live here

- Domain entities or rules (`Customer`, `Invoice`, `AccountingDocument`, `AgentPlan`, …).
- Money/Currency/Date semantics that only make sense for this product's accounting
  rules — until they are explicitly accepted as shared kernel.
- A generic `utils`/`common` dump. A package is created only with a clear, named
  abstraction and an owner.

## Status

Empty by design. FND-001 establishes the workspace and its governance rules only; the
first real package is created together with the feature that needs it.
