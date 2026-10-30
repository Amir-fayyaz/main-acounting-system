import { describe, expect, it } from 'vitest';

import { AppConfigService } from '../../config/app-config.service.js';
import { loadConfiguration } from '../../config/configuration.js';
import type { RedisConnectionService } from '../../redis/redis-connection.service.js';
import { RedisRateLimiter } from './redis-rate-limiter.js';
import type { RateLimitDecision } from './rate-limiter.js';

/** Builds an adapter backed by a fake Redis client. */
function setup(overrides?: {
  clientEval?: (keys: string[], args: string[]) => unknown;
  failConnect?: boolean;
  configOverrides?: Parameters<typeof loadConfiguration>[0];
}) {
  const calls: Array<{ keys: string[]; args: string[] }> = [];
  let ensureCalls = 0;
  let connectionFailure: Error | undefined;
  let hangConnection = false;
  let callCount = 0;

  const client = {
    eval: async (
      _script: string,
      options: { keys: string[]; arguments: string[] },
    ): Promise<unknown> => {
      calls.push({ keys: options.keys, args: options.arguments });
      callCount += 1;
      if (overrides?.clientEval !== undefined) {
        return overrides.clientEval(options.keys, options.arguments);
      }
      return String(callCount);
    },
  };

  const connection = {
    ensureConnected: async (): Promise<void> => {
      ensureCalls += 1;
      if (hangConnection) {
        // Mirrors the real client: a refused connection retries forever, so
        // the connect promise never settles.
        return new Promise<void>(() => undefined);
      }
      if (connectionFailure !== undefined) {
        throw connectionFailure;
      }
    },
    getClient: () => client,
  } as unknown as RedisConnectionService;

  const config = new AppConfigService(
    loadConfiguration({
      NODE_ENV: 'test',
      REDIS_HOST: '127.0.0.1',
      REDIS_PORT: '6379',
      ...overrides?.configOverrides,
    }),
  );

  const limiter = new RedisRateLimiter(connection, config);

  return {
    limiter,
    calls,
    ensureCalls: () => ensureCalls,
    failConnect: (error: Error) => {
      connectionFailure = error;
    },
    hangConnect: () => {
      hangConnection = true;
    },
    setEval: (fn: (keys: string[], args: string[]) => unknown) => {
      overrides!.clientEval = fn;
    },
  };
}

function expectDecision(
  decision: RateLimitDecision,
  {
    allowed,
    remaining,
    limit,
    unavailable,
  }: {
    allowed?: boolean;
    remaining?: number;
    limit?: number;
    unavailable?: boolean;
  },
): void {
  if (allowed !== undefined) {
    expect(decision.allowed).toBe(allowed);
  }
  if (remaining !== undefined) {
    expect(decision.remaining).toBe(remaining);
  }
  if (limit !== undefined) {
    expect(decision.limit).toBe(limit);
  }
  if (unavailable === true) {
    expect(decision.unavailable).toBe(true);
  } else if (unavailable === false) {
    expect(decision.unavailable).not.toBe(true);
  }
}

describe('RedisRateLimiter (SEC-001)', () => {
  it('allows the first N calls and refuses the next within the window', async () => {
    const { limiter } = setup({
      configOverrides: { RATE_LIMIT_AUTH_MAX_PER_IP: '3' },
    });

    const key = { scope: 'auth.sign-in', subject: 'ip:1.2.3.4' };

    for (let i = 1; i <= 3; i += 1) {
      expectDecision(await limiter.consume(key), {
        allowed: true,
        remaining: 3 - i,
        limit: 3,
        unavailable: false,
      });
    }

    const refused = await limiter.consume(key);
    expectDecision(refused, {
      allowed: false,
      remaining: 0,
      limit: 3,
      unavailable: false,
    });
  });

  it('uses an explicit limit override when provided', async () => {
    const { limiter } = setup({
      configOverrides: { RATE_LIMIT_AUTH_MAX_PER_IP: '100' },
    });

    const key = { scope: 'auth.sign-in', subject: 'ip:1.2.3.4' };

    const first = await limiter.consume(key, 2);
    expectDecision(first, { allowed: true, limit: 2, remaining: 1 });

    const second = await limiter.consume(key, 2);
    expectDecision(second, { allowed: true, limit: 2, remaining: 0 });

    const third = await limiter.consume(key, 2);
    expectDecision(third, { allowed: false, limit: 2, remaining: 0 });
  });

  it('returns unavailable when Redis is down (fail-safe)', async () => {
    const { limiter, failConnect } = setup({
      configOverrides: { RATE_LIMIT_AUTH_MAX_PER_IP: '100' },
    });
    failConnect(new Error('connection refused'));

    const decision = await limiter.consume({ scope: 'auth.sign-in', subject: 'ip:1.2.3.4' });
    expectDecision(decision, {
      allowed: false,
      remaining: 0,
      limit: 100,
      unavailable: true,
    });
  });

  it('namespaces keys by environment and scope', async () => {
    const { limiter, calls } = setup();

    await limiter.consume({ scope: 'auth.sign-in', subject: 'ip:1.2.3.4' });
    expect(calls).toHaveLength(1);
    expect(calls[0]?.keys[0]).toBe('rl:test:auth.sign-in:ip:1.2.3.4');
  });

  it('returns unavailable instead of hanging when the connection never settles', async () => {
    const { limiter, hangConnect } = setup({
      configOverrides: { RATE_LIMIT_AUTH_MAX_PER_IP: '100' },
    });
    hangConnect();

    const startedAt = Date.now();
    const decision = await limiter.consume({ scope: 'auth.sign-in', subject: 'ip:1.2.3.4' });

    expectDecision(decision, { allowed: false, unavailable: true });
    // Fail-closed must be prompt: a down Redis may not stall the request.
    expect(Date.now() - startedAt).toBeLessThan(3000);
  });

  it('does not throw when Redis eval throws', async () => {
    const { limiter, failConnect } = setup({
      configOverrides: { RATE_LIMIT_AUTH_MAX_PER_IP: '100' },
    });
    failConnect(new Error('redis eval error'));

    const decision = await limiter.consume({ scope: 'auth.sign-in', subject: 'ip:1.2.3.4' });
    expect(decision).toBeDefined();
    expect(decision.unavailable).toBe(true);
  });

  it('opens the connection on demand rather than at construction', async () => {
    const { limiter, ensureCalls } = setup({
      configOverrides: { RATE_LIMIT_AUTH_MAX_PER_IP: '100' },
    });

    expect(ensureCalls()).toBe(0);

    await limiter.consume({ scope: 'auth.sign-in', subject: 'ip:1.2.3.4' });

    expect(ensureCalls()).toBe(1);
  });
});
