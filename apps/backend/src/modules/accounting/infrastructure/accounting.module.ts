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
  FISCAL_PERIOD_REPOSITORY,
  FISCAL_YEAR_EVENT_RECORDER,
  FISCAL_YEAR_REPOSITORY,
} from '../application/accounting.tokens.js';
import type { FiscalYearEventRecorder } from '../application/ports/fiscal-year-event-recorder.port.js';
import type { FiscalYearRepository } from '../domain/repositories/fiscal-year.repository.js';
import type { FiscalPeriodRepository } from '../domain/repositories/fiscal-period.repository.js';
import { CreateFiscalYearUseCase } from '../application/use-cases/create-fiscal-year.use-case.js';
import { GetFiscalYearUseCase } from '../application/use-cases/get-fiscal-year.use-case.js';
import { ListFiscalYearsUseCase } from '../application/use-cases/list-fiscal-years.use-case.js';
import { ListFiscalPeriodsUseCase } from '../application/use-cases/list-fiscal-periods.use-case.js';
import { SelectActivePeriodUseCase } from '../application/use-cases/select-active-period.use-case.js';
import { ClosePeriodUseCase } from '../application/use-cases/close-period.use-case.js';
import { ReopenPeriodUseCase } from '../application/use-cases/reopen-period.use-case.js';
import { DrizzleFiscalYearRepository } from './persistence/drizzle-fiscal-year.repository.js';
import { DrizzleFiscalPeriodRepository } from './persistence/drizzle-fiscal-period.repository.js';
import { FiscalYearController } from '../presentation/controllers/fiscal-year.controller.js';
import { FiscalPeriodController } from '../presentation/controllers/fiscal-period.controller.js';

@Module({
  imports: [DatabaseModule, OutboxModule],
  controllers: [FiscalYearController, FiscalPeriodController],
  providers: [
    {
      provide: FISCAL_YEAR_REPOSITORY,
      useFactory: (database: Database): FiscalYearRepository =>
        new DrizzleFiscalYearRepository(database),
      inject: [DATABASE],
    },
    {
      provide: FISCAL_PERIOD_REPOSITORY,
      useFactory: (database: Database): FiscalPeriodRepository =>
        new DrizzleFiscalPeriodRepository(database),
      inject: [DATABASE],
    },
    {
      provide: FISCAL_YEAR_EVENT_RECORDER,
      useExisting: OUTBOX_RECORDER,
    },
    {
      provide: CreateFiscalYearUseCase,
      useFactory: (
        repository: FiscalYearRepository,
        events: FiscalYearEventRecorder,
        boundary: TransactionBoundary,
        periodRepository: FiscalPeriodRepository,
      ) => new CreateFiscalYearUseCase(repository, events, boundary, periodRepository),
      inject: [
        FISCAL_YEAR_REPOSITORY,
        FISCAL_YEAR_EVENT_RECORDER,
        TRANSACTION_BOUNDARY,
        FISCAL_PERIOD_REPOSITORY,
      ],
    },
    {
      provide: GetFiscalYearUseCase,
      useFactory: (r: FiscalYearRepository) => new GetFiscalYearUseCase(r),
      inject: [FISCAL_YEAR_REPOSITORY],
    },
    {
      provide: ListFiscalYearsUseCase,
      useFactory: (r: FiscalYearRepository) => new ListFiscalYearsUseCase(r),
      inject: [FISCAL_YEAR_REPOSITORY],
    },
    {
      provide: ListFiscalPeriodsUseCase,
      useFactory: (pr: FiscalPeriodRepository) => new ListFiscalPeriodsUseCase(pr),
      inject: [FISCAL_PERIOD_REPOSITORY],
    },
    {
      provide: SelectActivePeriodUseCase,
      useFactory: (pr: FiscalPeriodRepository) => new SelectActivePeriodUseCase(pr),
      inject: [FISCAL_PERIOD_REPOSITORY],
    },
    {
      provide: ClosePeriodUseCase,
      useFactory: (pr: FiscalPeriodRepository) => new ClosePeriodUseCase(pr),
      inject: [FISCAL_PERIOD_REPOSITORY],
    },
    {
      provide: ReopenPeriodUseCase,
      useFactory: (pr: FiscalPeriodRepository) => new ReopenPeriodUseCase(pr),
      inject: [FISCAL_PERIOD_REPOSITORY],
    },
  ],
  exports: [FISCAL_YEAR_REPOSITORY, FISCAL_PERIOD_REPOSITORY],
})
export class AccountingModule {}
