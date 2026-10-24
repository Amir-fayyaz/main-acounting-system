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

/** The outbox + audit boundary (`TenantEventRecorder`). */
export const TENANT_EVENT_RECORDER = Symbol('TENANT_EVENT_RECORDER');

/**
 * The owner-enrollment contract a new company needs (IAM-009). Implemented by
 * the Identity module, which owns memberships.
 */
export const TENANT_OWNER_ENROLLMENT = Symbol('TENANT_OWNER_ENROLLMENT');

/**
 * The published tenant-existence contract (`TenantDirectory`) other modules
 * depend on instead of reaching into tenant storage (IAM-003; ADR-002 §12).
 */
export const TENANT_DIRECTORY = Symbol('TENANT_DIRECTORY');
/**
 * The published ambient tenant-context contract (`TenantContextAccessor`) other
 * modules read the current company boundary through (TNT-004; SHR-007).
 */
export const TENANT_CONTEXT = Symbol('TENANT_CONTEXT');