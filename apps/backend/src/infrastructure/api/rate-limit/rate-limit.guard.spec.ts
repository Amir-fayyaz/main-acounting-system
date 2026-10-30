import { describe, expect, it, vi } from 'vitest';

import type { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { AppConfigService } from '../../config/app-config.service.js';
import { loadConfiguration } from '../../config/configuration.js';
import { RateLimitGuard } from './rate-limit.guard.js';
import type { RateLimiter, RateLimitDecision } from './rate-limiter.js';

/** A minimal mock of Nest's ExecutionContext for HTTP. */
function makeContext({
  method = 'POST',
  url = '/api/v1/auth/sign-in',
  ip = '1.2.3.4',
  body = {},
  headers = {},
  correlationId = 'corr-123',
}: {
  method?: string;
  url?: string;
  ip?: string;
  body?: Record<string, unknown>;
  headers?: Record<string, string | string[] | undefined>;
  correlationId?: string;
}): ExecutionContext {
  const response = {
    setHeader: vi.fn(),
    getHeader: vi.fn(),
    status: vi.fn().mockReturnThis(),
    json: vi.fn(),
  };

  const request = {
    method,
    url,
    ip,
    socket: { remoteAddress: '1.2.3.4' },
    body,
    headers,
    correlationId,
  } as unknown;

  const switchToHttp = vi
    .fn()
    .mockReturnValue({ getRequest: () => request, getResponse: () => response });

  return {
    getHandler: vi.fn(),
    getClass: vi.fn(),
    switchToHttp,
    getArgs: vi.fn().mockReturnValue([request]),
    getIndexByParam: vi.fn(),
    getType: vi.fn().mockReturnValue('http'),
  } as unknown as ExecutionContext;
}

/** Builds a guard with a fake limiter and config. */
function setupGuard({
  configOverrides,
  limiterDecisions,
}: {
  configOverrides?: Record<string, string>;
  limiterDecisions?: RateLimitDecision[];
}) {
  const decisions = [...(limiterDecisions ?? [])];
  let decisionIndex = 0;

  const consume = vi.fn(
    async (_key: { scope: string; subject: string }, _limit?: number) =>
      decisions[decisionIndex++] ?? {
        allowed: true,
        remaining: 99,
        limit: 100,
        resetAtMs: Date.now() + 60_000,
      },
  );

  const limiter = { consume } as RateLimiter;
  const config = new AppConfigService(
    loadConfiguration({
      NODE_ENV: 'test',
      REDIS_HOST: '127.0.0.1',
      REDIS_PORT: '6379',
      ...configOverrides,
    }),
  );

  const reflector = {
    getAllAndOverride: vi.fn(),
  } as unknown as Reflector;

  const guard = new RateLimitGuard(reflector, limiter, config);

  return { guard, consume, config, reflector };
}

describe('RateLimitGuard (SEC-001)', () => {
  it('passes through when no rate-limit policy is declared', async () => {
    const { guard, reflector, consume } = setupGuard({});

    (reflector.getAllAndOverride as ReturnType<typeof vi.fn>).mockReturnValue(undefined);

    const context = makeContext({});
    const result = await guard.canActivate(context);

    expect(result).toBe(true);
    expect(consume).not.toHaveBeenCalled();
  });

  it('enforces per-IP limit and attaches rate-limit headers', async () => {
    const decisions: RateLimitDecision[] = [
      { allowed: true, remaining: 19, limit: 20, resetAtMs: Date.now() + 60_000 },
    ];
    const { guard, reflector, consume } = setupGuard({
      limiterDecisions: decisions,
    });

    (reflector.getAllAndOverride as ReturnType<typeof vi.fn>).mockReturnValue({
      scope: 'auth.sign-in',
      perIp: true,
    });

    const context = makeContext({ method: 'POST', url: '/api/v1/auth/sign-in', ip: '1.2.3.4' });
    const result = await guard.canActivate(context);

    expect(result).toBe(true);
    expect(consume).toHaveBeenCalledWith(
      { scope: 'auth.sign-in', subject: 'ip:1.2.3.4' },
      expect.any(Number),
    );

    const response = (
      context.switchToHttp() as { getResponse: () => { setHeader: ReturnType<typeof vi.fn> } }
    ).getResponse();
    expect(response.setHeader).toHaveBeenCalledWith('X-RateLimit-Limit', '20');
    expect(response.setHeader).toHaveBeenCalledWith('X-RateLimit-Remaining', '19');
    expect(response.setHeader).toHaveBeenCalledWith('X-RateLimit-Reset', expect.any(String));
  });

  it('enforces per-identity limit when the policy declares an identity hint', async () => {
    const decisions: RateLimitDecision[] = [
      { allowed: true, remaining: 19, limit: 20, resetAtMs: Date.now() + 60_000 }, // IP
      { allowed: true, remaining: 4, limit: 5, resetAtMs: Date.now() + 60_000 }, // identity
    ];
    const { guard, reflector, consume } = setupGuard({
      limiterDecisions: decisions,
    });

    (reflector.getAllAndOverride as ReturnType<typeof vi.fn>).mockReturnValue({
      scope: 'auth.sign-in',
      perIp: true,
      perIdentity: 'email',
    });

    const context = makeContext({
      method: 'POST',
      url: '/api/v1/auth/sign-in',
      ip: '1.2.3.4',
      body: { email: 'user@example.com', password: 'secret' },
    });
    const result = await guard.canActivate(context);

    expect(result).toBe(true);
    expect(consume).toHaveBeenNthCalledWith(
      1,
      { scope: 'auth.sign-in', subject: 'ip:1.2.3.4' },
      20,
    );
    const identityCall = consume.mock.calls[1];
    expect(identityCall).toBeDefined();
    expect(identityCall[0]).toMatchObject({
      scope: 'auth.sign-in',
      subject: expect.stringContaining('identity:'),
    });
    expect(identityCall[1]).toBe(5);
  });

  it('refuses when per-IP limit is exceeded (429 path)', async () => {
    const { guard, reflector } = setupGuard({
      limiterDecisions: [
        {
          allowed: false,
          remaining: 0,
          limit: 20,
          resetAtMs: Date.now() + 60_000,
          unavailable: false,
        },
      ],
    });

    (reflector.getAllAndOverride as ReturnType<typeof vi.fn>).mockReturnValue({
      scope: 'auth.sign-in',
      perIp: true,
    });

    const context = makeContext({ method: 'POST', url: '/api/v1/auth/sign-in', ip: '1.2.3.4' });

    await expect(guard.canActivate(context)).rejects.toThrow();
    expect(reflector.getAllAndOverride).toHaveBeenCalled();
  });

  it('fails closed when Redis is unavailable (unavailable: true)', async () => {
    const { guard, reflector } = setupGuard({
      limiterDecisions: [
        {
          allowed: false,
          remaining: 0,
          limit: 20,
          resetAtMs: Date.now() + 60_000,
          unavailable: true,
        },
      ],
    });

    (reflector.getAllAndOverride as ReturnType<typeof vi.fn>).mockReturnValue({
      scope: 'auth.sign-in',
      perIp: true,
    });

    const context = makeContext({ method: 'POST', url: '/api/v1/auth/sign-in', ip: '1.2.3.4' });

    await expect(guard.canActivate(context)).rejects.toThrow();
  });

  it('does not enforce per-identity when no identity hint is in the body', async () => {
    const decisions: RateLimitDecision[] = [
      { allowed: true, remaining: 19, limit: 20, resetAtMs: Date.now() + 60_000 },
    ];
    const { guard, reflector, consume } = setupGuard({
      limiterDecisions: decisions,
    });

    (reflector.getAllAndOverride as ReturnType<typeof vi.fn>).mockReturnValue({
      scope: 'auth.sign-in',
      perIp: true,
      perIdentity: 'email',
    });

    // No email in the body -> only the IP key is consumed.
    const context = makeContext({
      method: 'POST',
      url: '/api/v1/auth/sign-in',
      ip: '1.2.3.4',
      body: { password: 'secret' },
    });

    await guard.canActivate(context);
    expect(consume).toHaveBeenCalledTimes(1);
    expect(consume).toHaveBeenCalledWith({ scope: 'auth.sign-in', subject: 'ip:1.2.3.4' }, 20);
  });

  it('sets Retry-After header on throttled response', async () => {
    const farFuture = Date.now() + 120_000;
    const { guard, reflector } = setupGuard({
      limiterDecisions: [
        { allowed: false, remaining: 0, limit: 20, resetAtMs: farFuture, unavailable: false },
      ],
    });

    (reflector.getAllAndOverride as ReturnType<typeof vi.fn>).mockReturnValue({
      scope: 'auth.sign-in',
      perIp: true,
    });

    const context = makeContext({ method: 'POST', url: '/api/v1/auth/sign-in', ip: '1.2.3.4' });

    await expect(guard.canActivate(context)).rejects.toThrow();

    const response = (
      context.switchToHttp() as { getResponse: () => { setHeader: ReturnType<typeof vi.fn> } }
    ).getResponse();
    expect(response.setHeader).toHaveBeenCalledWith('Retry-After', expect.any(String));
  });
});
