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
  ACCOUNT_AUDIT_PORT,
  ACCOUNT_AUTHORIZATION_PORT,
  ACCOUNT_REPOSITORY,
  ACCOUNT_USAGE_PORT,
  ACTIVE_PERIOD_REPOSITORY,
  FISCAL_PERIOD_EVENT_RECORDER,
  FISCAL_PERIOD_REPOSITORY,
  FISCAL_YEAR_EVENT_RECORDER,
  FISCAL_YEAR_REPOSITORY,
  PERIOD_GUARD,
} from '../application/accounting.tokens.js';
import type { FiscalPeriodEventRecorder } from '../application/ports/fiscal-period-event-recorder.port.js';
import type { FiscalYearEventRecorder } from '../application/ports/fiscal-year-event-recorder.port.js';
import {
  AllowAllAccountantAuthorizationPort,
  AlwaysUnusedAccountUsagePort,
  NoopAccountAuditPort,
  type AccountAuditPort,
  type AccountAuthorizationPort,
  type AccountUsagePort,
} from '../application/ports/account.ports.js';
import { GenerateFiscalPeriodsUseCase } from '../application/use-cases/generate-fiscal-periods.use-case.js';
import { SelectActivePeriodUseCase } from '../application/use-cases/select-active-period.use-case.js';
import { CreateFiscalYearUseCase } from '../application/use-cases/create-fiscal-year.use-case.js';
import { CloseFiscalPeriodUseCase } from '../application/use-cases/close-fiscal-period.use-case.js';
import { ReopenFiscalPeriodUseCase } from '../application/use-cases/reopen-fiscal-period.use-case.js';
import { GetFiscalYearUseCase } from '../application/use-cases/get-fiscal-year.use-case.js';
import { ListFiscalYearsUseCase } from '../application/use-cases/list-fiscal-years.use-case.js';
import { ListFiscalPeriodsUseCase } from '../application/use-cases/list-fiscal-periods.use-case.js';
import {
  CreateAccountUseCase,
  UpdateAccountUseCase,
  DeactivateAccountUseCase,
  ReactivateAccountUseCase,
  DeleteAccountUseCase,
} from '../application/use-cases/account-management.use-case.js';
import { DefaultPeriodGuard } from '../application/services/default-period-guard.service.js';
import type { PeriodGuard } from '../application/ports/period-guard.port.js';
import type { ActivePeriodRepository } from '../domain/repositories/active-period.repository.js';
import type { AccountRepository } from '../domain/repositories/account.repository.js';
import type { FiscalPeriodRepository } from '../domain/repositories/fiscal-period.repository.js';
import type { FiscalYearRepository } from '../domain/repositories/fiscal-year.repository.js';
import { DrizzleAccountRepository } from './persistence/drizzle-account.repository.js';
import { DrizzleActivePeriodRepository } from './persistence/drizzle-active-period.repository.js';
import { DrizzleFiscalPeriodRepository } from './persistence/drizzle-fiscal-period.repository.js';
import { DrizzleFiscalYearRepository } from './persistence/drizzle-fiscal-year.repository.js';
import { FiscalYearsController } from '../presentation/controllers/fiscal-years.controller.js';
import { FiscalPeriodsController } from '../presentation/controllers/fiscal-periods.controller.js';
import { ACCOUNT_ROLE_REPOSITORY } from '../application/accounting.tokens.js';

import type { AccountRoleRepository } from '../domain/repositories/account-role.repository.js';

import { DrizzleAccountRoleRepository } from './persistence/drizzle-account-role.repository.js';

import {
  MapAccountRoleUseCase,
  ResolveAccountRoleUseCase,
  GetRoleCompletenessUseCase,
} from '../application/use-cases/account-role.use-case.js';

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
      provide: ACCOUNT_REPOSITORY,
      useFactory: (database: Database): AccountRepository => new DrizzleAccountRepository(database),
      inject: [DATABASE],
    },
    {
      provide: ACCOUNT_ROLE_REPOSITORY,
      useFactory: (database: Database): AccountRoleRepository =>
        new DrizzleAccountRoleRepository(database),
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
      provide: ACCOUNT_USAGE_PORT,
      useClass: AlwaysUnusedAccountUsagePort,
    },
    {
      provide: ACCOUNT_AUTHORIZATION_PORT,
      useClass: AllowAllAccountantAuthorizationPort,
    },
    {
      provide: ACCOUNT_AUDIT_PORT,
      useClass: NoopAccountAuditPort,
    },
    {
      provide: PERIOD_GUARD,
      useFactory: (periods: FiscalPeriodRepository): PeriodGuard => new DefaultPeriodGuard(periods),
      inject: [FISCAL_PERIOD_REPOSITORY],
    },
    {
      provide: CreateAccountUseCase,
      useFactory: (
        repository: AccountRepository,
        authorization: AccountAuthorizationPort,
        audit: AccountAuditPort,
        boundary: TransactionBoundary,
      ) => new CreateAccountUseCase(repository, authorization, audit, boundary),
      inject: [
        ACCOUNT_REPOSITORY,
        ACCOUNT_AUTHORIZATION_PORT,
        ACCOUNT_AUDIT_PORT,
        TRANSACTION_BOUNDARY,
      ],
    },
    {
      provide: UpdateAccountUseCase,
      useFactory: (
        repository: AccountRepository,
        usage: AccountUsagePort,
        authorization: AccountAuthorizationPort,
        audit: AccountAuditPort,
        boundary: TransactionBoundary,
        roles: AccountRoleRepository,
      ) => new UpdateAccountUseCase(repository, usage, authorization, audit, boundary, roles),
      inject: [
        ACCOUNT_REPOSITORY,
        ACCOUNT_USAGE_PORT,
        ACCOUNT_AUTHORIZATION_PORT,
        ACCOUNT_AUDIT_PORT,
        TRANSACTION_BOUNDARY,
        ACCOUNT_ROLE_REPOSITORY,
      ],
    },
    {
      provide: DeactivateAccountUseCase,
      useFactory: (
        repository: AccountRepository,
        usage: AccountUsagePort,
        authorization: AccountAuthorizationPort,
        audit: AccountAuditPort,
        boundary: TransactionBoundary,
        roles: AccountRoleRepository,
      ) => new DeactivateAccountUseCase(repository, usage, authorization, audit, boundary, roles),
      inject: [
        ACCOUNT_REPOSITORY,
        ACCOUNT_USAGE_PORT,
        ACCOUNT_AUTHORIZATION_PORT,
        ACCOUNT_AUDIT_PORT,
        TRANSACTION_BOUNDARY,
        ACCOUNT_ROLE_REPOSITORY,
      ],
    },
    {
      provide: ReactivateAccountUseCase,
      useFactory: (
        repository: AccountRepository,
        usage: AccountUsagePort,
        authorization: AccountAuthorizationPort,
        audit: AccountAuditPort,
        boundary: TransactionBoundary,
      ) => new ReactivateAccountUseCase(repository, usage, authorization, audit, boundary),
      inject: [
        ACCOUNT_REPOSITORY,
        ACCOUNT_USAGE_PORT,
        ACCOUNT_AUTHORIZATION_PORT,
        ACCOUNT_AUDIT_PORT,
        TRANSACTION_BOUNDARY,
      ],
    },
    {
      provide: DeleteAccountUseCase,
      useFactory: (
        repository: AccountRepository,
        usage: AccountUsagePort,
        authorization: AccountAuthorizationPort,
        audit: AccountAuditPort,
        boundary: TransactionBoundary,
      ) => new DeleteAccountUseCase(repository, usage, authorization, audit, boundary),
      inject: [
        ACCOUNT_REPOSITORY,
        ACCOUNT_USAGE_PORT,
        ACCOUNT_AUTHORIZATION_PORT,
        ACCOUNT_AUDIT_PORT,
        TRANSACTION_BOUNDARY,
      ],
    },
    {
      provide: MapAccountRoleUseCase,
      useFactory: (
        accounts: AccountRepository,
        roles: AccountRoleRepository,
        authorization: AccountAuthorizationPort,
        audit: AccountAuditPort,
        boundary: TransactionBoundary,
      ) => new MapAccountRoleUseCase(accounts, roles, authorization, audit, boundary),
      inject: [
        ACCOUNT_REPOSITORY,
        ACCOUNT_ROLE_REPOSITORY,
        ACCOUNT_AUTHORIZATION_PORT,
        ACCOUNT_AUDIT_PORT,
        TRANSACTION_BOUNDARY,
      ],
    },

    {
      provide: ResolveAccountRoleUseCase,
      useFactory: (roles: AccountRoleRepository, accounts: AccountRepository) =>
        new ResolveAccountRoleUseCase(roles, accounts),
      inject: [ACCOUNT_ROLE_REPOSITORY, ACCOUNT_REPOSITORY],
    },

    {
      provide: GetRoleCompletenessUseCase,
      useFactory: (roles: AccountRoleRepository, accounts: AccountRepository) =>
        new GetRoleCompletenessUseCase(roles, accounts),
      inject: [ACCOUNT_ROLE_REPOSITORY, ACCOUNT_REPOSITORY],
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
        new CloseFiscalPeriodUseCase(
          periods,
          activePeriods,
          events,
          audit,
          authorization,
          boundary,
        ),
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
      useFactory: (years: FiscalYearRepository, periods: FiscalPeriodRepository) =>
        new ListFiscalPeriodsUseCase(years, periods),
      inject: [FISCAL_YEAR_REPOSITORY, FISCAL_PERIOD_REPOSITORY],
    },
  ],
  exports: [
    CreateFiscalYearUseCase,
    CreateAccountUseCase,
    UpdateAccountUseCase,
    DeactivateAccountUseCase,
    ReactivateAccountUseCase,
    DeleteAccountUseCase,
    PERIOD_GUARD,
    MapAccountRoleUseCase,
    ResolveAccountRoleUseCase,
    GetRoleCompletenessUseCase,
  ],
})
export class AccountingModule {}
