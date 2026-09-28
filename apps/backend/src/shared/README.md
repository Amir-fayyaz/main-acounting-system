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

Empty by design; it is populated only when a real shared-kernel primitive is
implemented.
