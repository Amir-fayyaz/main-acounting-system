# Accounting Module — Consumer Guide

## PeriodGuard (`FIS-006`)

Every financial module (Purchase, Sales, Expense, Inventory, etc.) must use `PeriodGuard` to ensure that financial operations are only posted into open, valid fiscal periods.

### Public Contracts

Other modules must import exclusively from the module's public entry point:

```typescript
import {
  PERIOD_GUARD,
  type PeriodGuard,
  type PostablePeriod,
  PeriodClosedError,
  PeriodNotDefinedError,
} from '../accounting/public-api.js';
```

### Usage in Use Cases

Inject `PERIOD_GUARD` and call `assertPostable` within your transaction boundary:

```typescript
export class PostInvoiceUseCase {
  public constructor(
    @Inject(PERIOD_GUARD) private readonly periodGuard: PeriodGuard,
    @Inject(TRANSACTION_BOUNDARY) private readonly boundary: TransactionBoundary,
    private readonly invoices: InvoiceRepository,
  ) {}

  public async execute(command: PostInvoice): Promise<Result<InvoiceView, DomainError>> {
    return this.boundary.execute(async () => {
      // 1. Assert postability with row-level locking (FOR SHARE)
      // Throws PeriodNotDefinedError (404) or PeriodClosedError (409) if invalid
      const postablePeriod = await this.periodGuard.assertPostable(
        command.tenantId,
        command.postingDate,
      );

      // 2. Attach period ID to the financial entity
      const invoice = Invoice.create({
        ...command,
        fiscalPeriodId: postablePeriod.id,
      });

      await this.invoices.add(invoice);
      return Result.ok(toInvoiceView(invoice));
    });
  }
}
```

### Concurrency & Race-Safety

`assertPostable` reads the fiscal period row with shared locking (`FOR SHARE`) inside MySQL. A concurrent period closing transaction (`CloseFiscalPeriodUseCase`) will serialize appropriately, guaranteeing that no posting is ever committed to a closed period.

---

## Testing with the Reusable Fiscal Fixture (`FIS-008`)

For unit and contract tests in modules adopting `PeriodGuard` (such as Purchase, Inventory, and Accounting), use the reusable test fixture from `test/support/fiscal-fixtures.ts`:

```typescript
import { createFiscalCompanyFixture } from '../../../../test/support/fiscal-fixtures.js';
import { PeriodClosedError, PeriodNotDefinedError } from '../accounting/public-api.js';

describe('Purchase Invoice Posting', () => {
  it('rejects booking an invoice into a closed period', async () => {
    // Generates a company with 1 closed period (Farvardin) and 1 open active period (Ordibehesht)
    const fixture = createFiscalCompanyFixture();

    await expect(
      purchaseService.bookInvoice(fixture.tenantId, invoice, fixture.dates.closedDate),
    ).rejects.toThrow(PeriodClosedError);
  });

  it('allows booking an invoice into an open period', async () => {
    const fixture = createFiscalCompanyFixture();

    const result = await purchaseService.bookInvoice(
      fixture.tenantId,
      invoice,
      fixture.dates.openDate,
    );
    expect(result.isOk()).toBe(true);
  });
});
```

### Fixture Capabilities:

- Sets up an isolated tenant company with a 12-month Jalali fiscal year (e.g. FY1405).
- Pre-seeds Period 1 as `closed` and Period 2 as `open` & `active`.
- Pre-populates ready-to-use dates (`closedDate`, `closedInstant`, `openDate`, `openInstant`, `outsideYearDate`).
- Provides pre-bound in-memory repositories and an active `DefaultPeriodGuard`.
- Includes `seedFiscalCompanyIntoAdapters` for database/persistence integration suites.
