import { AsyncLocalStorage } from 'node:async_hooks';

import { validateNonBlank } from '../primitives/assert.js';

/**
 * The ambient actor scope: the authenticated identity an operation runs as
 * (AUD-001; SHR-007 — the same propagation mechanism as the tenant scope).
 *
 * An audit record has to answer *who* acted, and that answer must never come
 * from the caller that stated the fact: a use case that records "someone did
 * this" cannot be trusted to name itself, or a client could file an action under
 * a name it does not own. So the identity is resolved once, at the trusted
 * entry point of an execution — today the HTTP boundary's global interceptor,
 * reading the principal the authorization guard verified — and every layer
 * below reads it through this one abstraction instead of receiving it as a
 * parameter.
 *
 * It carries a value identity and nothing else: the opaque `userId` only. No
 * name, no role, no tenant — those belong to the modules that own them
 * (ADR-002, section 11), and the shared kernel carries no rule about any of
 * them.
 *
 * Three rules keep it honest:
 *
 * - **Established only from a trusted boundary.** `run` takes an id the
 *   application resolved from an authenticated principal; nothing here reads a
 *   request body, header or query. A client can never select the actor a fact
 *   is filed under.
 * - **Absence is a fact, not a gap.** Outside any scope `current()` answers
 *   `undefined`, which is how a system-generated operation — a background job, a
 *   rejected attempt that resolved no user — states "no user acted". The audit
 *   record keeps that apart from "the actor could not be determined".
 * - **Scopes nest and restore.** An inner scope is visible only inside its own
 *   `run`; when it returns, the caller's scope is exactly as it was.
 *
 * Propagation follows the asynchronous call chain on `node:async_hooks`, the
 * same mechanism the tenant and transaction boundaries use — no HTTP
 * middleware, no request-scoped container, no framework type underneath.
 */
export class ActorScope {
  private static readonly storage = new AsyncLocalStorage<ActorScopeValue | undefined>();

  private constructor() {}

  /**
   * The actor alive in the current execution, or `undefined` when no
   * authenticated identity was established (a system operation).
   */
  public static current(): ActorScopeValue | undefined {
    return ActorScope.storage.getStore();
  }

  /**
   * Runs `work` with `userId` published as the current actor for the whole
   * (asynchronous) call chain, restoring the caller's scope when it settles.
   *
   * Called by the trusted entry point — the global HTTP interceptor, a test —
   * and never by business code choosing an actor for itself.
   */
  public static run<T>(userId: string, work: () => T): T {
    const id = validateNonBlank(userId, 'ActorScope', 'userId');

    return ActorScope.storage.run(Object.freeze({ userId: id }), work);
  }
}

/** The actor alive in the current execution (AUD-001). */
export interface ActorScopeValue {
  readonly userId: string;
}
