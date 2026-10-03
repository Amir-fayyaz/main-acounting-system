/**
 * Injection tokens for the tenant module (IAM-001).
 *
 * The use cases depend on these tokens and on the ports behind them, never on a
 * Drizzle or MySQL type, so the adapter can change without touching application
 * code (ADR-002 section 15). The use cases themselves are provided as classes,
 * which is how the presentation layer injects them.
 */

/** The tenant persistence boundary (`TenantRepository`). */
export const TENANT_REPOSITORY = Symbol('TENANT_REPOSITORY');

/** The outbox boundary (`TenantEventRecorder`). */
export const TENANT_EVENT_RECORDER = Symbol('TENANT_EVENT_RECORDER');
