import { describe, expect, it } from 'vitest';
import { computeBackoffDelayMs, hasAttemptsRemaining, type RetryPolicy } from './retry.policy.js';

const policy: RetryPolicy = { maxAttempts: 4, baseDelayMs: 100, maxDelayMs: 1000 };

describe('retry policy', () => {
  it('stops retrying once the attempt budget is used', () => {
    expect(hasAttemptsRemaining(1, 3)).toBe(true);
    expect(hasAttemptsRemaining(2, 3)).toBe(true);
    expect(hasAttemptsRemaining(3, 3)).toBe(false);
  });

  it('grows the delay exponentially per attempt', () => {
    // random() = 1 removes jitter, so the exponential term is exact.
    const noJitter = (): number => 1;

    expect(computeBackoffDelayMs(1, policy, noJitter)).toBe(100);
    expect(computeBackoffDelayMs(2, policy, noJitter)).toBe(200);
    expect(computeBackoffDelayMs(3, policy, noJitter)).toBe(400);
  });

  it('caps the delay at the configured ceiling', () => {
    const noJitter = (): number => 1;

    expect(computeBackoffDelayMs(10, policy, noJitter)).toBe(1000);
  });

  it('applies jitter between 50% and 100% of the capped delay', () => {
    expect(computeBackoffDelayMs(3, policy, () => 0)).toBe(200);
    expect(computeBackoffDelayMs(3, policy, () => 1)).toBe(400);
  });
});
