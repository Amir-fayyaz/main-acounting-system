import type { CallHandler, ExecutionContext } from '@nestjs/common';
import { firstValueFrom, Observable, of, throwError } from 'rxjs';
import { describe, expect, it } from 'vitest';

import { ActorScope } from '../../../shared/actor/actor-scope.js';
import { ActorScopeInterceptor } from './actor-scope.interceptor.js';

/**
 * The HTTP actor scope (AUD-001).
 *
 * What matters is that the scope exists *only* for a request whose principal
 * the guard has verified, that it is visible to the handler while it runs, and
 * that it is gone once the handler settles — never leaking into the next
 * request or into the interceptor's own frame.
 */

/** The minimum of `ExecutionContext` the interceptor uses. */
function contextWith(principal: { readonly userId: string } | undefined): ExecutionContext {
  const switchToHttp = () => ({ getRequest: () => ({ principal }) });

  return { switchToHttp } as unknown as ExecutionContext;
}

/** A handler that reports the actor scope it observed while producing its value. */
function reportingHandler(
  build: () => Observable<unknown> = () => of(ActorScope.current()?.userId ?? 'no-actor'),
): CallHandler {
  return { handle: build } as CallHandler;
}

describe('ActorScopeInterceptor', () => {
  it('runs the handler without a scope when the request carries no principal', async () => {
    const interceptor = new ActorScopeInterceptor();

    const value = await firstValueFrom(
      interceptor.intercept(contextWith(undefined), reportingHandler()),
    );

    expect(value).toBe('no-actor');
    expect(ActorScope.current()).toBeUndefined();
  });

  it('establishes the actor scope around handler execution when a principal exists', async () => {
    const interceptor = new ActorScopeInterceptor();

    const value = await firstValueFrom(
      interceptor.intercept(contextWith({ userId: 'u-42' }), reportingHandler()),
    );

    expect(value).toBe('u-42');
    // The scope is torn down once the handler settles.
    expect(ActorScope.current()).toBeUndefined();
  });

  it('restores the outer scope after the handler settles', async () => {
    const interceptor = new ActorScopeInterceptor();

    await ActorScope.run('outer', async () => {
      await firstValueFrom(
        interceptor.intercept(contextWith({ userId: 'inner' }), reportingHandler()),
      );

      expect(ActorScope.current()).toEqual({ userId: 'outer' });
    });
  });

  it('propagates a handler failure and still tears the scope down', async () => {
    const interceptor = new ActorScopeInterceptor();
    const failing = reportingHandler(() => throwError(() => new Error('boom')));

    await expect(
      firstValueFrom(interceptor.intercept(contextWith({ userId: 'u-42' }), failing)),
    ).rejects.toThrow('boom');

    expect(ActorScope.current()).toBeUndefined();
  });
});
