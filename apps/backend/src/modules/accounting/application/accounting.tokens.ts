/**
 * Injection tokens for the accounting module (FIS-002).
 *
 * The use cases depend on these tokens and on the ports behind them, never on a
 * Drizzle or MySQL type, so the adapter can change without touching application
 * code (ADR-002 section 15). The use cases themselves are provided as classes,
 * which is how the presentation layer injects them.
 */

/** The fiscal year persistence boundary (`FiscalYearRepository`). */
export const FISCAL_YEAR_REPOSITORY = Symbol('FISCAL_YEAR_REPOSITORY');

/** The outbox boundary (`FiscalYearEventRecorder`). */
export const FISCAL_YEAR_EVENT_RECORDER = Symbol('FISCAL_YEAR_EVENT_RECORDER');
