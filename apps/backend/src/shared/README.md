# Shared (Shared Kernel)

Code that is genuinely domain-agnostic and reused across modules.

Allowed here (ADR-002, section 10):

- `Money`, `Currency`, identifier primitives, business-date primitives,
  `Result`/error primitives, company (tenant) context primitives, the base domain
  event contract.

Not allowed here:

- `Customer`, `Supplier`, `Product`, `Invoice`, `AccountingDocument`, `AgentPlan`,
  `Employee`, `TaxInvoice` — anything with business meaning belongs to its owning
  module even when several modules need it.
- Generic helpers (`utils`, `common`, `helpers`) that exist only to avoid a decision
  about ownership.

Every addition must be reviewed against the question: _is this truly independent of
our business domains, or does it merely look shared?_

## Status

- `errors/domain-error.ts` — the base class for a business failure: an error
  primitive (ADR-002, section 10) that the domain/application layers throw
  without importing HTTP or NestJS, and that the API layer maps to the standard
  error contract (FND-006).

Populated only with a real shared-kernel primitive; nothing else is here yet.
