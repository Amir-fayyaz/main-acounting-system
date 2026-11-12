import type { ExecutionContext } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { MetricsTokenGuard } from './metrics-token.guard.js';

/**
 * The token rules of the scrape boundary (FND-016): every request needs a
 * valid `METRICS_TOKEN` bearer credential; a failure is the generic 401 and
 * never echoes the presented or configured token.
 */
function guardWith(token: string | undefined): MetricsTokenGuard {
  return new MetricsTokenGuard({ metrics: { token } } as never);
}

/** The guard is synchronous; this only shapes the request it inspects. */
async function runGuard(guard: MetricsTokenGuard, authorization: string | undefined) {
  const context = {
    switchToHttp: () => ({
      getRequest: () => ({ headers: authorization === undefined ? {} : { authorization } }),
    }),
  } as unknown as ExecutionContext;

  return guard.canActivate(context);
}

describe('MetricsTokenGuard', () => {
  it('allows a request whose bearer token matches the configured one', async () => {
    const guard = guardWith('scrape-token');

    await expect(runGuard(guard, 'Bearer scrape-token')).resolves.toBe(true);
  });

  it('refuses a missing, malformed or wrong token with the generic 401', async () => {
    const guard = guardWith('scrape-token');

    await expect(runGuard(guard, undefined)).rejects.toMatchObject({
      status: 401,
      message: 'Missing or invalid metrics bearer token',
    });
    await expect(runGuard(guard, 'scrape-token')).rejects.toMatchObject({ status: 401 });
    await expect(runGuard(guard, 'Bearer wrong-token')).rejects.toMatchObject({ status: 401 });
    await expect(runGuard(guard, 'Basic c2NyYXBlLXRva2Vu')).rejects.toMatchObject({ status: 401 });
  });

  it('never echoes a token in the refusal, configured or presented', async () => {
    const guard = guardWith('scrape-token');

    try {
      await runGuard(guard, 'Bearer leaked-guess');
    } catch (error) {
      const body = JSON.stringify(error);

      expect(body).not.toContain('scrape-token');
      expect(body).not.toContain('leaked-guess');
    }
  });

  it('refuses everything when no token is configured (deny-by-default)', async () => {
    const guard = guardWith(undefined);

    await expect(runGuard(guard, 'Bearer anything')).rejects.toMatchObject({ status: 401 });
    await expect(runGuard(guard, undefined)).rejects.toMatchObject({ status: 401 });
  });

  it('accepts the token case-insensitively by scheme and exactly by value', async () => {
    const guard = guardWith('scrape-token');

    await expect(runGuard(guard, 'bearer scrape-token')).resolves.toBe(true);
    await expect(runGuard(guard, 'BEARER scrape-token')).resolves.toBe(true);
    await expect(runGuard(guard, 'Bearer scrape-TOKEN')).rejects.toMatchObject({ status: 401 });
  });
});
