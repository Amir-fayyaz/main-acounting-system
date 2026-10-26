/**
 * Injection tokens for the accounting module (FIS-002, FIS-004).
 *
 * The use cases depend on these tokens and on the ports behind them, never on a
 * Drizzle or MySQL type, so the adapter can change without touching application
 * code (ADR-002 section 15). The use cases themselves are provided as classes,
 * which is how the presentation layer injects them.
 */

/** The fiscal year persistence boundary (`FiscalYearRepository`). */
export const FISCAL_YEAR_REPOSITORY = Symbol('FISCAL_YEAR_REPOSITORY');

/** The fiscal year outbox boundary (`FiscalYearEventRecorder`). */
export const FISCAL_YEAR_EVENT_RECORDER = Symbol('FISCAL_YEAR_EVENT_RECORDER');

/** The fiscal period persistence boundary (`FiscalPeriodRepository`). */
export const FISCAL_PERIOD_REPOSITORY = Symbol('FISCAL_PERIOD_REPOSITORY');

/** The active-period pointer boundary (`ActivePeriodRepository`). */
export const ACTIVE_PERIOD_REPOSITORY = Symbol('ACTIVE_PERIOD_REPOSITORY');

/** The fiscal period outbox boundary (`FiscalPeriodEventRecorder`). */
export const FISCAL_PERIOD_EVENT_RECORDER = Symbol('FISCAL_PERIOD_EVENT_RECORDER');
