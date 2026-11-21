# Accounting Module — Consumer Guide

The accounting module owns fiscal years, fiscal periods and the central
postability rule (FIS-001). Other modules never inspect period dates
themselves; they ask this module.

## PeriodGuard (`FIS-006`)

`PeriodGuard` answers one question — _may this company post on this date?_ — and
returns the period the operation belongs to. Every financial module (purchase,
sales, inventory, treasury, payroll, …) must call it before persisting a
financial fact.

### Public contracts

Import exclusively from the module's public entry point:

```ts
import {
  PERIOD_GUARD,
  type PeriodGuard,
  type PostablePeriod,
  PeriodClosedError,
  PeriodNotDefinedError,
} from '../../accounting/public-api.js';
```

`PeriodGuard` is framework-free. `PostablePeriod` carries the identity the
caller stores on the operation:

```ts
interface PostablePeriod {
  readonly id: string; // fiscal_periods.id
  readonly fiscalYearId: string;
  readonly sequence: number; // 1..12, Farvardin..Esfand
  readonly startDate: string; // inclusive Gregorian YYYY-MM-DD
  readonly endDate: string; // inclusive Gregorian YYYY-MM-DD
}
```

### Using it in a use case

Inject `PERIOD_GUARD` and call `assertPostable` **inside the same transaction
boundary** that writes the operation (FIS-BR-10):

```ts
export class PostInvoiceUseCase {
  public constructor(
    @Inject(PERIOD_GUARD) private readonly periodGuard: PeriodGuard,
    @Inject(TRANSACTION_BOUNDARY) private readonly boundary: TransactionBoundary,
    private readonly invoices: InvoiceRepository,
  ) {}

  public async execute(command: PostInvoice): Promise<Result<InvoiceView, DomainError>> {
    return this.boundary.execute(async () => {
      // Resolves (and locks) the period, or throws PeriodNotDefinedError /
      // PeriodClosedError before anything is written.
      const postable = await this.periodGuard.assertPostable(command.tenantId, command.postingDate);

      const invoice = Invoice.create({
        ...command,
        fiscalPeriodId: postable.id,
      });

      await this.invoices.add(invoice);
      return Result.ok(toInvoiceView(invoice));
    });
  }
}
```

The guard accepts either a `BusinessDate` (a civil day already resolved in the
company's timezone) or a JavaScript `Date` (an instant). A `Date` is resolved to
its **business date** — the day it falls on in `Asia/Tehran` by default — never
to its UTC day (DEC-04; FIS-BR-09). Pass the same `Date` to both the guard and
the stored accounting date so the two cannot disagree.

### Calendar rule

- Storage is **Gregorian** `DATE` / `YYYY-MM-DD`, always including both ends of
  the range.
- Jalali is a conversion and period-bounds helper (`shared/time/jalali-calendar.ts`),
  never a second storage format.
- Periods are the twelve Jalali months: months 1–6 have 31 days, 7–11 have 30,
  and Esfand has 29 or 30 depending on the leap year.
- A `Date` at `2026-04-20T20:29:59.999Z` is `1405-01-31` in Tehran (period 1);
  one millisecond later is `1405-02-01` (period 2).

### Concurrency and race-safety

`assertPostable` reads the period row with a shared lock (`SELECT … FOR SHARE`)
inside MySQL. Because the caller invokes it inside its own transaction boundary,
that lock is held until the posting commits. A concurrent `CloseFiscalPeriod`
(which updates the same row) waits for the posting to finish, and a posting
that starts after the close commits sees the closed state and is refused.
Neither side can accept a write into a period closed underneath it.

### Errors

Both are `DomainError`s with `category: BUSINESS_RULE`; the API mapper turns
that category into HTTP **422 Unprocessable Entity** while preserving the code
verbatim (FIS-001 §7):

| Code                 | HTTP | Meaning                                                                 |
| -------------------- | ---- | ----------------------------------------------------------------------- |
| `PERIOD_NOT_DEFINED` | 422  | The date falls outside every fiscal period of the company (FIS-BR-05).  |
| `PERIOD_CLOSED`      | 422  | The period exists but is closed and refuses new operations (FIS-BR-04). |

Callers must not catch these to "fall back" to another period: the correct
behavior is to surface the failure to the user.

## Account posting guard (`ACC-001.6`)

`AccountPostingGuard` is the **only** way another module may decide whether an
account can receive a journal line. Journal posting, Purchase and the Agent plan
import the contract and the token from the public entry point — never the
account aggregate, the repository or the HTTP controllers:

```ts
import {
  ACCOUNT_POSTING_GUARD,
  type AccountPostingGuard,
  AccountInactiveError,
  AccountNotFoundError,
  AccountNotPostableError,
  AccountPostingRejectedError,
} from '../../accounting/public-api.js';

export class PostInvoiceUseCase {
  public constructor(
    @Inject(ACCOUNT_POSTING_GUARD) private readonly accounts: AccountPostingGuard,
    @Inject(PERIOD_GUARD) private readonly periods: PeriodGuard,
    @Inject(TRANSACTION_BOUNDARY) private readonly boundary: TransactionBoundary,
  ) {}

  public async execute(command: PostInvoice): Promise<Result<Invoice, DomainError>> {
    return this.boundary.execute(async () => {
      // Same transaction as the write: an account deactivated concurrently
      // cannot slip a posting in between the check and the insert.
      await this.periods.assertPostable(command.tenantId, command.postingDate);
      await this.accounts.assertAllPostable([command.inventoryAccountId, command.payableAccountId]);

      // … persist the invoice and its journal lines
    });
  }
}
```

### What it checks

The account is resolved in the **current tenant scope**. There is no tenant
parameter and no way to name another company; the two repository layers (the
scoped read and the aggregate's `tenantId` comparison) both enforce it.

| Order | Condition                                          | Code                   | HTTP |
| ----- | -------------------------------------------------- | ---------------------- | ---- |
| 1     | Missing **or** owned by another tenant             | `ACCOUNT_NOT_FOUND`    | 404  |
| 2     | Exists but is inactive                             | `ACCOUNT_INACTIVE`     | 422  |
| 3     | Exists, active, but not postable (a grouping node) | `ACCOUNT_NOT_POSTABLE` | 422  |

A foreign-tenant id and a non-existent id produce the **same** code, message
and category: the guard never confirms that another company's account exists.

### Single and batch

- `assertPostable(accountId)` — one account, one reason.
- `assertAllPostable(accountIds)` — checks every id once and reports **all**
  failures in a single `AccountPostingRejectedError`. Its `code`/`category` are
  those of the first failure in the caller's order; each `details` entry carries
  the precise per-account code (`ACCOUNT_NOT_FOUND`, `ACCOUNT_INACTIVE` or
  `ACCOUNT_NOT_POSTABLE`) and the `accountId`, so the Agent plan can list every
  problem in one pass. An empty list is accepted. The shared 50-detail safety
  limit applies; the message always states the full failure count.

Both methods fail closed with `TenantContextMissingError` when no tenant scope
is established. They read only; they write nothing, raise no event and open no
transaction — the caller supplies the boundary.

Do not catch these errors to fall back to another account: surface them to the
user, exactly like a closed fiscal period.

### Fiscal API

The fiscal-year and fiscal-period endpoints live in
`presentation/controllers/fiscal-years.controller.ts` and
`presentation/controllers/fiscal-periods.controller.ts`. Their own codes are:

| Code                          | HTTP | Meaning                                                                                                          |
| ----------------------------- | ---- | ---------------------------------------------------------------------------------------------------------------- |
| `FISCAL_YEAR_OVERLAP`         | 409  | The requested year shares at least one day with an existing year.                                                |
| `FISCAL_YEAR_LABEL_DUPLICATE` | 409  | The label is already used by another year of the company.                                                        |
| `FISCAL_YEAR_INVALID_RANGE`   | 400  | Start is not strictly before end.                                                                                |
| `FISCAL_PERIOD_NOT_FOUND`     | 404  | The period id is not a period of the company.                                                                    |
| `FISCAL_YEAR_NOT_FOUND`       | 404  | The year id is not a year of the company.                                                                        |
| `FISCAL_PERIOD_NOT_OPEN`      | 422  | Only an open period can be selected as active.                                                                   |
| `PERIOD_STATE_INVALID`        | 409  | The requested transition is invalid (closing a closed period, reopening an open one, closing the active period). |
| `REOPEN_REASON_REQUIRED`      | 400  | A non-empty reason is required to reopen.                                                                        |
