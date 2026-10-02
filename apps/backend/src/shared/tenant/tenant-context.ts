import { validateMatches, validateNonBlank } from '../primitives/assert.js';

/**
 * The company boundary the current operation executes under (SHR-007;
 * ADR-001 section 13, ADR-003 section 24, ADR-010 section 4).
 *
 * Every business operation runs inside exactly one company's data, and no
 * internal path may bypass that scope — API, query, job, agent or report. The
 * context is how a layer that needs the scope asks for it without threading a
 * `tenantId` parameter through unrelated signatures and without learning
 * anything about HTTP, authentication or a database.
 *
 * Three states, distinguishable at any point of the execution:
 *
 * ```text
 * available   the operation runs under one company — tenantId (+ correlation)
 * system      explicitly no tenant: system-level work the architecture allows
 * missing     no scope was established — a tenant-scoped operation must refuse
 * ```
 *
 * Two rules keep the abstraction honest:
 *
 * - **Derived only from a trusted boundary.** The tenant id is resolved by the
 *   application from the authenticated principal — never from a request body,
 *   query parameter or any other client-supplied field. Authentication and
 *   authorization are later issues; the design only promises that when they
 *   arrive they establish this context instead of reshaping it (doc 17,
 *   section 8).
 * - **No business data.** This is the id of the boundary and, where a flow has
 *   one, the correlation id that ties its messages together. Company names,
 *   memberships, permissions and settings belong to the modules that own them
 *   (ADR-002, section 11) — the shared kernel carries no rule about any of
 *   them.
 *
 * Identifiers are opaque and short: the same shape message metadata already
 * accepts for `tenantId`, so a context can stamp a message without a second
 * validation rule ever disagreeing with the first.
 */

/**
 * Identifiers are opaque: letters, digits, `.`, `_`, `:` and `-`, at most 128
 * characters — the same shape `MessageMetadata` accepts, so the two contracts
 * can never disagree about what a tenant id is.
 */
const SAFE_IDENTIFIER = /^[A-Za-z0-9._:-]{1,128}$/;
const IDENTIFIER_EXPECTATION =
  'a short opaque identifier of at most 128 characters ' + '(letters, digits, ".", "_", ":", "-")';

/** The three states a tenant context can be in. */
export type TenantContextState = 'available' | 'system' | 'missing';

/** The operation runs under exactly one company's boundary. */
export interface AvailableTenantContext {
  readonly state: 'available';
  /** The company boundary, resolved from a trusted source. */
  readonly tenantId: string;
  /** The id tying this operation's messages together, when a flow has one. */
  readonly correlationId?: string;
}

/** The operation explicitly runs without a tenant: system-level work. */
export interface SystemTenantContext {
  readonly state: 'system';
}

/** No scope was established. Not an error by itself — a state to refuse. */
export interface MissingTenantContext {
  readonly state: 'missing';
}

/** The current tenant context: available, explicitly system, or missing. */
export type TenantContext = AvailableTenantContext | SystemTenantContext | MissingTenantContext;

/** What `TenantContext.current()` reports outside any established scope. */
export const MISSING_TENANT_CONTEXT: MissingTenantContext = Object.freeze({
  state: 'missing',
});

/** The scope an explicitly system-level operation runs under. */
export const SYSTEM_TENANT_CONTEXT: SystemTenantContext = Object.freeze({
  state: 'system',
});

/**
 * Builds an available tenant context from a tenant the application resolved.
 *
 * @throws InvalidPrimitiveError — a blank or non-opaque tenant id (or
 * correlation id) is a programming error: whoever created it did not take the
 * id from a trusted boundary, and the failure must surface where the mistake
 * was made, not three layers down.
 */
export function createTenantContext(
  tenantId: string,
  options?: { readonly correlationId?: string },
): AvailableTenantContext {
  const id = validateMatches(
    validateNonBlank(tenantId, 'TenantContext', 'tenantId'),
    SAFE_IDENTIFIER,
    'TenantContext',
    'tenantId',
    IDENTIFIER_EXPECTATION,
  );
  const correlationId =
    options?.correlationId === undefined
      ? undefined
      : validateMatches(
          validateNonBlank(options.correlationId, 'TenantContext', 'correlationId'),
          SAFE_IDENTIFIER,
          'TenantContext',
          'correlationId',
          IDENTIFIER_EXPECTATION,
        );

  return Object.freeze(
    correlationId === undefined
      ? { state: 'available', tenantId: id }
      : { state: 'available', tenantId: id, correlationId },
  );
}
