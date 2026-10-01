# Shared (Shared Kernel)

Code that is genuinely domain-agnostic and reused across modules.

Allowed here (ADR-002, section 10):

- `Money`, `Currency`, identifier primitives, business-date primitives,
  `Result`/error primitives, company (tenant) context primitives, the base domain
  event contract.

That list is now implemented: `primitives/` + `id/` + `money/` + `quantity/` +
`time/` are SHR-001, and `errors/` (the `Result` and `DomainError` model) is
SHR-002.

Not allowed here:

- `Customer`, `Supplier`, `Product`, `Invoice`, `AccountingDocument`, `AgentPlan`,
  `Employee`, `TaxInvoice` — anything with business meaning belongs to its owning
  module even when several modules need it.
- Generic helpers (`utils`, `common`, `helpers`) that exist only to avoid a decision
  about ownership.

Every addition must be reviewed against the question: _is this truly independent of
our business domains, or does it merely look shared?_

## Rules

1. **No framework or infrastructure import.** A file here imports only `node:*`
   builtins and other files in this folder. No NestJS, Next.js, HTTP, ORM,
   Redis, MySQL or provider SDK. This is enforced mechanically by
   `framework-independence.spec.ts`, which fails the test run on a violation.
2. **No business rule.** These types describe form, never policy: `Quantity`
   refuses to mix `kg` with `g` but has no conversion table, and `BusinessDate`
   is a calendar day with no notion of a fiscal period. Which rule applies to a
   value is always the owning module's decision.
3. **Invalid states are rejected, never repaired.** Every constructor validates
   its input and throws `InvalidPrimitiveError` naming the primitive and the
   field, so a bad value fails loudly and identically everywhere.
4. **`DomainError` is for business failures only.** A rejected primitive is a
   programming error, not a client-facing one — that stays
   `InvalidPrimitiveError`. Throwing a `DomainError` means an _expected_ failure;
   anything unexpected keeps being a plain exception.
5. **Expected failures are returned, unexpected ones are thrown.** Use cases return
   `Result<T, DomainError>` for outcomes the business decided about, and let
   technical faults propagate. See `docs/product/v1/11-engineering/16-result-and-error-model.md`.

## Layout

```text
shared/
├── errors/
│   ├── domain-error.ts        business failure the API maps (FND-006)
│   ├── error-category.ts      VALIDATION | BUSINESS_RULE | CONFLICT | NOT_FOUND | STATE_VIOLATION
│   ├── error-detail.ts        structured, serializable reasons
│   ├── category-errors.ts     the five ready-made category failures
│   └── result.ts              generic Result<T, E>
├── id/entity-id.ts            the one identifier every module uses
├── money/currency.ts          ISO 4217 code + minor unit, registry-extended
├── money/money.ts             exact amount + currency value object
├── quantity/quantity.ts       counted amount + opaque unit code
├── time/business-date.ts      a calendar day: business/accounting dates
├── time/date-time.ts          a UTC instant: created-at/posted-at
└── primitives/                exact decimal, rounding, calendar, validation
```

`framework-independence.spec.ts` sits at the root of the folder and checks the
whole tree.

## Status

- `errors/domain-error.ts` — the base class for a business failure: an error
  primitive (ADR-002, section 10) that the domain/application layers throw
  without importing HTTP or NestJS, and that the API layer maps to the standard
  error contract (FND-006). Carries a stable upper-snake `code`, a shared
  `category`, structured `details` and a `toJSON()` snapshot; `cause` stays
  internal by design. Frozen on construction.
- `errors/result.ts` — `Result<T, E>`: `ok`/`fail`, safe `value()`/`error()`,
  `match`, `map`, `mapError`, `andThen`, `orElse`, `getOrElse`, and `Result.all`
  for composing many outcomes into one that reports every failure.
- `errors/category-errors.ts` — `ValidationError`, `BusinessRuleError`,
  `ConflictError`, `NotFoundError`, `StateViolationError`, plus
  `ValidationError.fromDetails(...)` for a multi-field rejection.
- `primitives/` — exact decimal arithmetic on `bigint` (no floating point), the
  six `RoundingMode`s, UTC calendar helpers and the validation rules every
  primitive applies to raw input.
- `id/entity-id.ts` — UUID-based `EntityId`, value-equal and serializing as a
  bare string.
- `money/` — `Currency` (IRR active, registry for future codes) and `Money`
  (amount stored as integer minor units; currency mismatch, excess precision and
  malformed amounts all rejected).
- `quantity/` — `Quantity`: exact decimal amount plus an opaque unit code, with
  no conversion or equivalence rules.
- `time/` — `BusinessDate` (`YYYY-MM-DD`, timezone-free) and `DateTime` (UTC
  instant). Together they keep the four domain roles — Business Date, Accounting
  Date, Created At, Posted At — from collapsing into one ambiguous type.

See `docs/product/v1/11-engineering/15-shared-kernel-primitives.md` for the
contract each primitive exposes and how a module is expected to use it, and
`docs/product/v1/11-engineering/16-result-and-error-model.md` for the Result and
error model.
