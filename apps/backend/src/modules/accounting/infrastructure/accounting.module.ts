import { Module } from '@nestjs/common';

import { DatabaseModule, type Database } from '../../../infrastructure/database/database.module.js';
import {
  DATABASE,
  TRANSACTION_BOUNDARY,
} from '../../../infrastructure/database/database.tokens.js';
import { OutboxModule } from '../../../infrastructure/outbox/outbox.module.js';
import { OUTBOX_RECORDER } from '../../../infrastructure/outbox/outbox.tokens.js';
import type { TransactionBoundary } from '../../../shared/transaction/transaction-boundary.js';
import {
  FISCAL_YEAR_EVENT_RECORDER,
  FISCAL_YEAR_REPOSITORY,
} from '../application/accounting.tokens.js';
import type { FiscalYearEventRecorder } from '../application/ports/fiscal-year-event-recorder.port.js';
import { CreateFiscalYearUseCase } from '../application/use-cases/create-fiscal-year.use-case.js';
import type { FiscalYearRepository } from '../domain/repositories/fiscal-year.repository.js';
import { DrizzleFiscalYearRepository } from './persistence/drizzle-fiscal-year.repository.js';

/**
 * The accounting module (FIS-002).
 *
 * It wires the module's own ports to their adapters and its use cases to the
 * shared infrastructure they need:
 *
 * - `FISCAL_YEAR_REPOSITORY` → `DrizzleFiscalYearRepository` (this module's
 *   table);
 * - `FISCAL_YEAR_EVENT_RECORDER` → the shared outbox recorder, so fiscal year
 *   events commit with the state change that raised them (SHR-006);
 * - `TRANSACTION_BOUNDARY` → the shared boundary the use cases open (SHR-005).
 *
 * The adapters stay behind their tokens, so the use cases never reach past a
 * port — and the module owns its persistence, exposing the Drizzle table and
 * adapter to no one else (ADR-002 sections 8 and 12).
 *
 * The module is deliberately **not** `@Global` and exports nothing: it
 * publishes no cross-module contract yet. Period generation (FIS-004) will
 * arrive in this same module, and any contract other modules eventually need
 * becomes an explicit export at that point. There is no controller either —
 * the ticket puts any API out of scope.
 */
@Module({
  imports: [DatabaseModule, OutboxModule],
  providers: [
    {
      provide: FISCAL_YEAR_REPOSITORY,
      useFactory: (database: Database): FiscalYearRepository =>
        new DrizzleFiscalYearRepository(database),
      inject: [DATABASE],
    },
    {
      // The outbox recorder already satisfies the application port structurally.
      provide: FISCAL_YEAR_EVENT_RECORDER,
      useExisting: OUTBOX_RECORDER,
    },
    {
      provide: CreateFiscalYearUseCase,
      useFactory: (
        repository: FiscalYearRepository,
        events: FiscalYearEventRecorder,
        boundary: TransactionBoundary,
      ) => new CreateFiscalYearUseCase(repository, events, boundary),
      inject: [FISCAL_YEAR_REPOSITORY, FISCAL_YEAR_EVENT_RECORDER, TRANSACTION_BOUNDARY],
    },
  ],
  exports: [],
})
export class AccountingModule {}
