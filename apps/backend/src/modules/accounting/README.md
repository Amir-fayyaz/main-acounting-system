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
Usage in Use Cases
Inject PERIOD_GUARD and call assertPostable within your transaction boundary:
code
TypeScript
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
Concurrency & Race-Safety
assertPostable reads the fiscal period row with shared locking (FOR SHARE) inside MySQL. A concurrent period closing transaction (CloseFiscalPeriodUseCase) will serialize appropriately, guaranteeing that no posting is ever committed to a closed period.
```

## Chart of Accounts (`ACC-001`)

### Standard chart template

A new company gets a complete, valid chart by activating the versioned standard
template. The definition lives as data in
`domain/templates/standard-chart.template.ts` (version `ir-standard-v1`) and uses
numeric hierarchical codes:

- one digit for the five roots: assets, liabilities, equity, revenue, expenses;
- two digits for a group, four for a general account and six for a postable detail.

`ActivateStandardChartUseCase` creates the whole tree parents-first in one
transaction and marks every account as `system`. A second activation for the same
tenant and template version is refused with `ACCOUNT_TEMPLATE_ALREADY_APPLIED`
and writes nothing. If any write fails, the transaction rolls back the entire
chart; there is no partial activation.

Template accounts behave like ordinary accounts afterwards: they can receive
children while non-postable, and can be used for postings when they are postable
leaves. Their `system` flag keeps them protected from structural changes and
deletion.
