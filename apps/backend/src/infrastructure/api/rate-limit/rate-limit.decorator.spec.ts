import { describe, expect, it } from 'vitest';

import {
  RATE_LIMIT_POLICY_METADATA,
  RateLimit,
  type RateLimitPolicy,
} from './rate-limit.decorator.js';

describe('RateLimit decorator (SEC-001)', () => {
  it('sets rate-limit policy metadata on a class', () => {
    const policy: RateLimitPolicy = {
      scope: 'auth.sign-in',
      perIp: true,
      perIdentity: 'email',
    };

    class Target {}
    RateLimit(policy)(Target);

    const stored = Reflect.getMetadata(RATE_LIMIT_POLICY_METADATA, Target);
    expect(stored).toEqual(policy);
  });

  it('returns a decorator function', () => {
    const result = RateLimit({ scope: 'auth.sign-in', perIp: true });
    expect(typeof result).toBe('function');
  });
});
