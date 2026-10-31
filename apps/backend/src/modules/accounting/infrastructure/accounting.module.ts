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
  ACTIVE_PERIOD_REPOSITORY,
  FISCAL_PERIOD_EVENT_RECORDER,
  FISCAL_PERIOD_REPOSITORY,
  FISCAL_YEAR_EVENT_RECORDER,
  FISCAL_YEAR_REPOSITORY,
  PERIOD_GUARD,
} from '../application/accounting.tokens.js';
import type { FiscalPeriodEventRecorder } from '../application/ports/fiscal-period-event-recorder.port.js';
import type { FiscalYearEventRecorder } from '../application/ports/fiscal-year-event-recorder.port.js';
import { GenerateFiscalPeriodsUseCase } from '../application/use-cases/generate-fiscal-periods.use-case.js';
import { SelectActivePeriodUseCase } from '../application/use-cases/select-active-period.use-case.js';
import { CreateFiscalYearUseCase } from '../application/use-cases/create-fiscal-year.use-case.js';
import { DefaultPeriodGuard } from '../application/services/default-period-guard.service.js';
import type { PeriodGuard } from '../application/ports/period-guard.port.js';
import type { ActivePeriodRepository } from '../domain/repositories/active-period.repository.js';
import type { FiscalPeriodRepository } from '../domain/repositories/fiscal-period.repository.js';
import type { FiscalYearRepository } from '../domain/repositories/fiscal-year.repository.js';
import { DrizzleActivePeriodRepository } from './persistence/drizzle-active-period.repository.js';
import { DrizzleFiscalPeriodRepository } from './persistence/drizzle-fiscal-period.repository.js';
import { DrizzleFiscalYearRepository } from './persistence/drizzle-fiscal-year.repository.js';

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
      provide: FISCAL_PERIOD_REPOSITORY,
      useFactory: (database: Database): FiscalPeriodRepository =>
        new DrizzleFiscalPeriodRepository(database),
      inject: [DATABASE],
    },
    {
      provide: ACTIVE_PERIOD_REPOSITORY,
      useFactory: (database: Database): ActivePeriodRepository =>
        new DrizzleActivePeriodRepository(database),
      inject: [DATABASE],
    },
    {
      provide: FISCAL_YEAR_EVENT_RECORDER,
      useExisting: OUTBOX_RECORDER,
    },
    {
      provide: FISCAL_PERIOD_EVENT_RECORDER,
      useExisting: OUTBOX_RECORDER,
    },
    {
      provide: PERIOD_GUARD,
      useFactory: (periods: FiscalPeriodRepository): PeriodGuard => new DefaultPeriodGuard(periods),
      inject: [FISCAL_PERIOD_REPOSITORY],
    },
    {
      provide: GenerateFiscalPeriodsUseCase,
      useFactory: (
        fiscalYears: FiscalYearRepository,
        periods: FiscalPeriodRepository,
        activePeriods: ActivePeriodRepository,
        events: FiscalPeriodEventRecorder,
        boundary: TransactionBoundary,
      ) => new GenerateFiscalPeriodsUseCase(fiscalYears, periods, activePeriods, events, boundary),
      inject: [
        FISCAL_YEAR_REPOSITORY,
        FISCAL_PERIOD_REPOSITORY,
        ACTIVE_PERIOD_REPOSITORY,
        FISCAL_PERIOD_EVENT_RECORDER,
        TRANSACTION_BOUNDARY,
      ],
    },
    {
      provide: SelectActivePeriodUseCase,
      useFactory: (
        periods: FiscalPeriodRepository,
        activePeriods: ActivePeriodRepository,
        events: FiscalPeriodEventRecorder,
        boundary: TransactionBoundary,
      ) => new SelectActivePeriodUseCase(periods, activePeriods, events, boundary),
      inject: [
        FISCAL_PERIOD_REPOSITORY,
        ACTIVE_PERIOD_REPOSITORY,
        FISCAL_PERIOD_EVENT_RECORDER,
        TRANSACTION_BOUNDARY,
      ],
    },
    {
      provide: CreateFiscalYearUseCase,
      useFactory: (
        repository: FiscalYearRepository,
        events: FiscalYearEventRecorder,
        boundary: TransactionBoundary,
        generatePeriods: GenerateFiscalPeriodsUseCase,
      ) => new CreateFiscalYearUseCase(repository, events, boundary, generatePeriods),
      inject: [
        FISCAL_YEAR_REPOSITORY,
        FISCAL_YEAR_EVENT_RECORDER,
        TRANSACTION_BOUNDARY,
        GenerateFiscalPeriodsUseCase,
      ],
    },
  ],
  exports: [CreateFiscalYearUseCase, PERIOD_GUARD],
})
export class AccountingModule {}
