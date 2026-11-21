/**
 * The public entry point other modules import from the Accounting module (FIS-006; ADR-002 section 12).
 * Internals remain private to this module.
 */
export {
  ACCOUNT_AUDIT_PORT,
  ACCOUNT_AUTHORIZATION_PORT,
  ACCOUNT_POSTING_GUARD,
  ACCOUNT_REPOSITORY,
  ACCOUNT_USAGE_PORT,
  PERIOD_GUARD,
} from './application/accounting.tokens.js';
export type { AccountPostingGuard } from './application/ports/account-posting-guard.port.js';
export { DefaultAccountPostingGuard } from './application/services/default-account-posting-guard.service.js';
export {
  AccountInactiveError,
  AccountNotFoundError,
  AccountNotPostableError,
  AccountPostingRejectedError,
} from './domain/errors/account.errors.js';
export type {
  AccountAuditPort,
  AccountAuthorizationPort,
  AccountUsagePort,
} from './application/ports/account.ports.js';
export {
  AllowAllAccountantAuthorizationPort,
  AlwaysUnusedAccountUsagePort,
  NoopAccountAuditPort,
} from './application/ports/account.ports.js';
export type { PeriodGuard, PostablePeriod } from './application/ports/period-guard.port.js';
export { DefaultPeriodGuard } from './application/services/default-period-guard.service.js';
export { PeriodClosedError, PeriodNotDefinedError } from './domain/errors/fiscal-period.errors.js';
export { ActivateStandardChartUseCase } from './application/use-cases/activate-standard-chart.use-case.js';
export type { StandardChartActivationView } from './application/use-cases/activate-standard-chart.use-case.js';
export { ActivateStandardChart } from './application/commands/activate-standard-chart.command.js';
export { AccountTemplateAlreadyAppliedError } from './domain/errors/account-template.errors.js';
export { AccountingModule } from './infrastructure/accounting.module.js';
