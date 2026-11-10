/**
 * The public entry point other modules import from the Accounting module (FIS-006; ADR-002 section 12).
 * Internals remain private to this module.
 */
export {
  ACCOUNT_AUDIT_PORT,
  ACCOUNT_AUTHORIZATION_PORT,
  ACCOUNT_REPOSITORY,
  ACCOUNT_USAGE_PORT,
  PERIOD_GUARD,
} from './application/accounting.tokens.js';
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
export { AccountingModule } from './infrastructure/accounting.module.js';
