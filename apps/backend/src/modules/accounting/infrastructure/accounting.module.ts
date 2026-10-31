import { Module } from '@nestjs/common';

import { DatabaseModule, type Database } from '../../../infrastructure/database/database.module.js';
import {
  DATABASE,
  TRANSACTION_BOUNDARY,
} from '../../../infrastructure/database/database.tokens.js';
import { OutboxModule } from '../../../infrastructure/outbox/outbox.module.js';
import { OUTBOX_RECORDER } from '../../../infrastructure/outbox/outbox.tokens.js';
import type { TransactionBoundary } from '../../../shared/transaction/transaction-boundary.js';
import { AUDIT_RECORDER } from '../../audit/application/audit.tokens.js';
import type { AuditRecorder } from '../../audit/application/ports/audit-recorder.port.js';
import { AUTHORIZATION } from '../../identity/application/authorization/authorization.tokens.js';
import type { Authorization } from '../../identity/application/ports/authorization.port.js';
import {
  ACTIVE_PERIOD_REPOSITORY,
  FISCAL_PERIOD_EVENT_RECORDER,
  FISCAL_PERIOD_REPOSITORY,
  FISCAL_YEAR_EVENT_RECORDER,
  FISCAL_YEAR_REPOSITORY,
} from '../application/accounting.tokens.js';
import type { FiscalPeriodEventRecorder } from '../application/ports/fiscal-period-event-recorder.port.js';
import type { FiscalYearEventRecorder } from '../application/ports/fiscal-year-event-recorder.port.js';
import { GenerateFiscalPeriodsUseCase } from '../application/use-cases/generate-fiscal-periods.use-case.js';
import { SelectActivePeriodUseCase } from '../application/use-cases/select-active-period.use-case.js';
import { CreateFiscalYearUseCase } from '../application/use-cases/create-fiscal-year.use-case.js';
import { CloseFiscalPeriodUseCase } from '../application/use-cases/close-fiscal-period.use-case.js';
import { ReopenFiscalPeriodUseCase } from '../application/use-cases/reopen-fiscal-period.use-case.js';
import { GetFiscalYearUseCase } from '../application/use-cases/get-fiscal-year.use-case.js';
import { ListFiscalYearsUseCase } from '../application/use-cases/list-fiscal-years.use-case.js';
import { ListFiscalPeriodsUseCase } from '../application/use-cases/list-fiscal-periods.use-case.js';
import type { ActivePeriodRepository } from '../domain/repositories/active-period.repository.js';
import type { FiscalPeriodRepository } from '../domain/repositories/fiscal-period.repository.js';
import type { FiscalYearRepository } from '../domain/repositories/fiscal-year.repository.js';
import { FiscalYearsController } from '../presentation/controllers/fiscal-years.controller.js';
import { FiscalPeriodsController } from '../presentation/controllers/fiscal-periods.controller.js';
import { DrizzleActivePeriodRepository } from './persistence/drizzle-active-period.repository.js';
import { DrizzleFiscalPeriodRepository } from './persistence/drizzle-fiscal-period.repository.js';
import { DrizzleFiscalYearRepository } from './persistence/drizzle-fiscal-year.repository.js';

/**
 * The accounting module (FIS-002, FIS-004).
 *
 * It wires the module's own ports to their adapters and its use cases to the
 * shared infrastructure they need:
 *
 * - `FISCAL_YEAR_REPOSITORY` → `DrizzleFiscalYearRepository` (this module's table);
 * - `FISCAL_PERIOD_REPOSITORY` → `DrizzleFiscalPeriodRepository` (ditto);
 * - `ACTIVE_PERIOD_REPOSITORY` → `DrizzleActivePeriodRepository` — the
 *   per-tenant pointer row whose single upsert statement makes the
 *   exactly-one-active rule atomic;
 * - the event recorders → the shared outbox recorder, so the module's events
 *   commit with the state change that raised them (SHR-006);
 * - `TRANSACTION_BOUNDARY` → the shared boundary the use cases open (SHR-005).
 *
 * The adapters stay behind their tokens, so the use cases never reach past a
 * port — and the module owns its persistence, exposing the Drizzle tables and
 * adapters to no one else (ADR-002 sections 8 and 12).
 *
 * The fiscal year and period REST resources live in this module's
 * `presentation/` (ADR-013 section 2: endpoints belong to the module that owns
 * the domain). Close and reopen additionally wire the two *published* contracts
 * they need — `AUDIT_RECORDER` (AUD-001) and `AUTHORIZATION` (IAM-006) — both
 * provided application-wide by their owning modules, so this module sees the
 * contracts and never the tables or use cases behind them.
 *
 * The module is deliberately **not** `@Global` and exports only
 * `CreateFiscalYearUseCase`, for the development seeder (DEV-001): seeding
 * creates its fixture year through the same use case the API calls, so the
 * overlap rule, the generated periods, the audit entry and the active-period
 * pointer all apply.
 */
@Module({
  imports: [DatabaseModule, OutboxModule],
  controllers: [FiscalYearsController, FiscalPeriodsController],
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
      // The outbox recorder already satisfies the application ports structurally.
      provide: FISCAL_YEAR_EVENT_RECORDER,
      useExisting: OUTBOX_RECORDER,
    },
    {
      provide: FISCAL_PERIOD_EVENT_RECORDER,
      useExisting: OUTBOX_RECORDER,
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
        audit: AuditRecorder,
      ) => new SelectActivePeriodUseCase(periods, activePeriods, events, boundary, audit),
      inject: [
        FISCAL_PERIOD_REPOSITORY,
        ACTIVE_PERIOD_REPOSITORY,
        FISCAL_PERIOD_EVENT_RECORDER,
        TRANSACTION_BOUNDARY,
        AUDIT_RECORDER,
      ],
    },
    {
      provide: CreateFiscalYearUseCase,
      useFactory: (
        repository: FiscalYearRepository,
        events: FiscalYearEventRecorder,
        boundary: TransactionBoundary,
        generatePeriods: GenerateFiscalPeriodsUseCase,
        audit: AuditRecorder,
      ) => new CreateFiscalYearUseCase(repository, events, boundary, generatePeriods, audit),
      inject: [
        FISCAL_YEAR_REPOSITORY,
        FISCAL_YEAR_EVENT_RECORDER,
        TRANSACTION_BOUNDARY,
        GenerateFiscalPeriodsUseCase,
        AUDIT_RECORDER,
      ],
    },
    {
      // FIS-005: closing a period is a guarded write — the capability the
      // endpoint declares is re-checked here through the published
      // Authorization contract, and the outcome (success or refusal) is
      // recorded in the central audit trail (AUD-001).
      provide: CloseFiscalPeriodUseCase,
      useFactory: (
        periods: FiscalPeriodRepository,
        activePeriods: ActivePeriodRepository,
        events: FiscalPeriodEventRecorder,
        audit: AuditRecorder,
        authorization: Authorization,
        boundary: TransactionBoundary,
      ) =>
        new CloseFiscalPeriodUseCase(periods, activePeriods, events, audit, authorization, boundary),
      inject: [
        FISCAL_PERIOD_REPOSITORY,
        ACTIVE_PERIOD_REPOSITORY,
        FISCAL_PERIOD_EVENT_RECORDER,
        AUDIT_RECORDER,
        AUTHORIZATION,
        TRANSACTION_BOUNDARY,
      ],
    },
    {
      provide: ReopenFiscalPeriodUseCase,
      useFactory: (
        periods: FiscalPeriodRepository,
        events: FiscalPeriodEventRecorder,
        audit: AuditRecorder,
        authorization: Authorization,
        boundary: TransactionBoundary,
      ) => new ReopenFiscalPeriodUseCase(periods, events, audit, authorization, boundary),
      inject: [
        FISCAL_PERIOD_REPOSITORY,
        FISCAL_PERIOD_EVENT_RECORDER,
        AUDIT_RECORDER,
        AUTHORIZATION,
        TRANSACTION_BOUNDARY,
      ],
    },
    {
      // Thin reads behind the HTTP resource: no transaction, no event, no
      // audit — they change nothing and answer from the tenant scope.
      provide: GetFiscalYearUseCase,
      useFactory: (repository: FiscalYearRepository) => new GetFiscalYearUseCase(repository),
      inject: [FISCAL_YEAR_REPOSITORY],
    },
    {
      provide: ListFiscalYearsUseCase,
      useFactory: (repository: FiscalYearRepository) => new ListFiscalYearsUseCase(repository),
      inject: [FISCAL_YEAR_REPOSITORY],
    },
    {
      provide: ListFiscalPeriodsUseCase,
      useFactory: (
        years: FiscalYearRepository,
        periods: FiscalPeriodRepository,
      ) => new ListFiscalPeriodsUseCase(years, periods),
      inject: [FISCAL_YEAR_REPOSITORY, FISCAL_PERIOD_REPOSITORY],
    },
  ],
  // Exported for the development seeder (DEV-001): a fixture fiscal year is
  // created through the same use case a later HTTP resource will call, so the
  // overlap rule, the generated periods and the active-period pointer all apply.
  exports: [CreateFiscalYearUseCase],
})
export class AccountingModule {}
