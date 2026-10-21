/**
 * Apply to authorization-error.mapper.ts:
 *
 * Add `'TENANT_ACCESS_DENIED'` to FORBIDDEN_CODES so select-active-company
 * denials surface as 403 with stable code TENANT_ACCESS_DENIED.
 *
 * ```ts
 * const FORBIDDEN_CODES: readonly string[] = [
 *   'AUTHORIZATION_DENIED',
 *   'TENANT_CONTEXT_REQUIRED',
 *   'MEMBERSHIP_REQUIRED',
 *   'MEMBERSHIP_INACTIVE',
 *   'AUTHORIZATION_CONTEXT_INVALID',
 *   'AUTHORIZATION_POLICY_MISSING',
 *   'TENANT_ACCESS_DENIED',
 * ];
 * ```
 */
export {};
