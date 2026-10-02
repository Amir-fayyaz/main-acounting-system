import type { MessageOptions } from '../messaging/message-metadata.js';
import { TenantScope } from './tenant-scope.js';
import { TenantContextMissingError } from './tenant.errors.js';

/**
 * The bridge from the ambient tenant scope to a message being raised (SHR-007;
 * doc 17, section 8).
 *
 * Commands, Queries and Domain Events already carry `metadata.tenantId` — the
 * seven-field contract fixed that in SHR-003. What was missing is the approved
 * way to *fill* it: the application resolves the tenant once, establishes the
 * scope, and every message raised inside that scope is stamped from it, so no
 * business method copies a `tenantId` through unrelated parameters and no call
 * site can quietly forget one.
 *
 * ```ts
 * const command = new PostInvoice(payload, tenantScopedMessageOptions());
 * const event = new InvoicePosted(data, tenantScopedMessageOptions(causedBy(command)));
 * ```
 *
 * Precedence is deliberate, mirroring `causedBy(...)`:
 *
 * - An **explicit** `tenantId` / `correlationId` in `overrides` always wins —
 *   an effect inheriting its cause's tenant must not be re-pointed at whatever
 *   scope the handler happens to run under.
 * - Otherwise the **ambient scope** supplies it: the tenant the application
 *   resolved for this operation, and its correlation id when the flow has one.
 * - When neither exists — no explicit id and no available scope — the helper
 *   throws `TenantContextMissingError`. A tenant-scoped message raised outside
 *   a tenant is a broken invariant, not a message with a blank field.
 *
 * The helper stamps options only; deciding *which* messages are tenant-scoped
 * stays each module's contract, and the identity itself still comes from a
 * trusted boundary — this reads the scope, it never reads a client.
 */
export function tenantScopedMessageOptions(overrides: MessageOptions = {}): MessageOptions {
  const context = TenantScope.current();

  if (context.state !== 'available') {
    if (overrides.tenantId === undefined) {
      throw new TenantContextMissingError(context.state);
    }

    // The tenant is pinned explicitly (an effect inheriting its cause); with
    // no available scope there is nothing further to stamp.
    return overrides;
  }

  const tenantId = overrides.tenantId ?? context.tenantId;
  const correlationId = overrides.correlationId ?? context.correlationId;

  return correlationId === undefined
    ? { ...overrides, tenantId }
    : { ...overrides, tenantId, correlationId };
}
