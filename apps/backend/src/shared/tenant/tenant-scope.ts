import { AsyncLocalStorage } from 'node:async_hooks';

import type {
  AvailableTenantContext,
  SystemTenantContext,
  TenantContext,
} from './tenant-context.js';
import { MISSING_TENANT_CONTEXT, SYSTEM_TENANT_CONTEXT } from './tenant-context.js';
import { TenantContextMissingError } from './tenant.errors.js';

/**
 * The ambient tenant scope: how the current operation's company boundary
 * travels down the call stack (SHR-007; ADR-001 section 13).
 *
 * The context is established once, at the trusted entry point of an execution
 * — an authenticated request, a Worker restoring a job, a test — and every
 * layer below reads it through this one approved abstraction instead of
 * receiving a `tenantId` parameter it never asked for:
 *
 * ```ts
 * const tenant = TenantScope.require();      // throws when missing or system
 * ```
 *
 * Propagation follows the asynchronous call chain (`await` to `await`) on
 * `node:async_hooks`, the same mechanism the transaction boundary uses — no
 * HTTP middleware, no Redis key, no request-scoped container, no framework
 * type anywhere underneath. That keeps the context identical for an HTTP
 * request, a Command or Query running inside it, a background job, and an
 * event handler.
 *
 * Three rules keep the scope honest:
 *
 * - **Established only from a trusted boundary.** `run` takes a context the
 *   application resolved (from an authenticated principal, from a job
 *   envelope); nothing here reads a request body, header or query — an
 *   external client can never select a tenant by supplying an id (doc 17,
 *   section 8).
 * - **Fail closed.** Outside a scope `current()` reports `missing`, and
 *   `require()` throws `TenantContextMissingError`. A tenant-scoped operation
 *   refuses to execute rather than degrading to a wider scope.
 * - **Scopes nest and restore.** An inner scope is visible only inside its own
 *   `run`; when it returns, the caller's scope is exactly as it was — a nested
 *   operation can neither leak into its parent nor overwrite it afterwards.
 *
 * A scope is only as long as the work it wraps: fire-and-forget work started
 * inside a scope runs later, outside it, and must establish its own.
 */
export class TenantScope {
  private static readonly storage = new AsyncLocalStorage<
    AvailableTenantContext | SystemTenantContext
  >();

  private constructor() {}

  /**
   * The context of the call stack that asks: `available` inside `run`,
   * `system` inside `runAsSystem`, and `missing` outside any scope.
   *
   * `missing` is not an error — it is the honest answer of a stack that never
   * established a scope, which is exactly what the system process (or a
   * request before authentication) should see.
   */
  public static current(): TenantContext {
    return TenantScope.storage.getStore() ?? MISSING_TENANT_CONTEXT;
  }

  /**
   * The available tenant context of this call stack.
   *
   * @throws TenantContextMissingError — when the scope is missing or is the
   * explicit system scope. This is the one call a tenant-scoped operation
   * makes to refuse execution without a tenant (fail closed, ADR-010
   * section 13).
   */
  public static require(): AvailableTenantContext {
    const context = TenantScope.current();

    if (context.state !== 'available') {
      throw new TenantContextMissingError(context.state);
    }

    return context;
  }

  /**
   * Runs `work` with `context` published as the current tenant scope, and
   * restores the caller's scope when it settles.
   *
   * Called by the trusted entry points — the authenticated request path, the
   * Worker restoring a job's `companyId`, a test — never by business code
   * choosing a tenant for itself.
   */
  public static run<T>(context: AvailableTenantContext, work: () => Promise<T>): Promise<T> {
    return TenantScope.storage.run(context, work);
  }

  /**
   * Runs `work` under an explicit system scope: no tenant, declared rather
   * than missing.
   *
   * This is how system-level work (the infrastructure jobs that belong to no
   * company) states "this execution intentionally has no tenant" — so a
   * tenant-scoped operation inside it is still refused, but with
   * `state: 'system'` instead of an ambiguous absence.
   */
  public static runAsSystem<T>(work: () => Promise<T>): Promise<T> {
    return TenantScope.storage.run(SYSTEM_TENANT_CONTEXT, work);
  }
}
