import { describe, expect, it } from 'vitest';

import { DateTime } from '../../../shared/time/date-time.js';
import { User, type LockoutPolicy } from './aggregates/user.js';

/**
 * The account lockout state (SEC-002).
 *
 * These tests pin the four rules the aggregate owns, and nothing else: the
 * counter increments, the threshold locks for the configured window, a
 * successful authentication clears both, and the boundary of the window is
 * exact. The use cases above it are responsible for *when* a failure is
 * recorded; this file is about what recording one means.
 */

const NOW = DateTime.parse('2026-10-03T08:00:00.000Z');
const POLICY: LockoutPolicy = { threshold: 3, durationMs: 15 * 60_000 };

function aUser(): User {
  return User.create({ displayName: 'Ali Rezaei', email: 'ali@example.com', now: NOW });
}

/** Records `times` consecutive failures, each one minute apart. */
function failTimes(user: User, times: number, policy: LockoutPolicy = POLICY): DateTime {
  let at = NOW;
  for (let i = 0; i < times; i += 1) {
    user.recordFailedAuthentication(policy, at);
    at = DateTime.fromEpochMillis(at.epochMillis + 60_000);
  }
  return at;
}

describe('User lockout state (SEC-002)', () => {
  it('starts unlocked with no failures', () => {
    const user = aUser();

    expect(user.failedAuthAttempts).toBe(0);
    expect(user.lockedUntil).toBeUndefined();
    expect(user.isLocked(NOW)).toBe(false);
  });

  it('increments the counter on each failure without locking early', () => {
    const user = aUser();

    user.recordFailedAuthentication(POLICY, NOW);
    expect(user.failedAuthAttempts).toBe(1);
    expect(user.isLocked(NOW)).toBe(false);

    user.recordFailedAuthentication(POLICY, NOW);
    expect(user.failedAuthAttempts).toBe(2);
    expect(user.isLocked(NOW)).toBe(false);
  });

  it('locks for the configured duration when the threshold is reached', () => {
    const user = aUser();

    failTimes(user, POLICY.threshold);

    expect(user.failedAuthAttempts).toBe(POLICY.threshold);
    expect(user.lockedUntil).toBeDefined();
    // The lockout starts at the instant of the failure that reached it.
    expect(user.lockedUntil?.epochMillis).toBe(NOW.epochMillis + 2 * 60_000 + POLICY.durationMs);
    expect(user.isLocked(DateTime.fromEpochMillis(NOW.epochMillis + 2 * 60_000))).toBe(true);
  });

  it('is locked strictly before the lockout instant and free at or after it', () => {
    const user = aUser();
    failTimes(user, POLICY.threshold);

    const lockedUntil = user.lockedUntil!;
    const oneMsBefore = DateTime.fromEpochMillis(lockedUntil.epochMillis - 1);
    const exactly = lockedUntil;
    const after = DateTime.fromEpochMillis(lockedUntil.epochMillis + 1);

    expect(user.isLocked(oneMsBefore)).toBe(true);
    expect(user.isLocked(exactly)).toBe(false);
    expect(user.isLocked(after)).toBe(false);
  });

  it('does not extend an active lockout when another failure arrives', () => {
    const user = aUser();
    const lockedAt = failTimes(user, POLICY.threshold);
    const lockoutBefore = user.lockedUntil!.epochMillis;
    const counterBefore = user.failedAuthAttempts;

    // A failure during the lockout: no extension, no extra count.
    user.recordFailedAuthentication(POLICY, DateTime.fromEpochMillis(lockedAt.epochMillis + 1_000));

    expect(user.lockedUntil?.epochMillis).toBe(lockoutBefore);
    expect(user.failedAuthAttempts).toBe(counterBefore);
  });

  it('starts a fresh window on the first failure after an expired lockout', () => {
    const user = aUser();
    failTimes(user, POLICY.threshold);
    const afterLockout = DateTime.fromEpochMillis(user.lockedUntil!.epochMillis + 1);

    user.recordFailedAuthentication(POLICY, afterLockout);

    // One failure, not threshold+1, so the account is not re-locked by a single
    // late attempt.
    expect(user.failedAuthAttempts).toBe(1);
    expect(user.lockedUntil).toBeUndefined();
    expect(user.isLocked(afterLockout)).toBe(false);
  });

  it('clears the counter and the lockout on a successful authentication', () => {
    const user = aUser();
    failTimes(user, POLICY.threshold);

    user.clearFailedAuthentications(NOW);

    expect(user.failedAuthAttempts).toBe(0);
    expect(user.lockedUntil).toBeUndefined();
    expect(user.isLocked(NOW)).toBe(false);
  });

  it('leaves the update instant untouched when there is nothing to clear', () => {
    const user = aUser();

    user.clearFailedAuthentications(DateTime.fromEpochMillis(NOW.epochMillis + 60_000));

    expect(user.updatedAt.equals(NOW)).toBe(true);
  });

  it('round-trips the security state through the snapshot', () => {
    const user = aUser();
    failTimes(user, POLICY.threshold);

    const rebuilt = User.rehydrate(user.snapshot());

    expect(rebuilt.failedAuthAttempts).toBe(POLICY.threshold);
    expect(rebuilt.lockedUntil?.epochMillis).toBe(user.lockedUntil?.epochMillis);
    expect(rebuilt.isLocked(NOW)).toBe(true);
  });

  it('treats a snapshot without the new fields as an unlocked account', () => {
    const snapshot = aUser().snapshot();
    const legacy = User.rehydrate({
      id: snapshot.id,
      displayName: snapshot.displayName,
      email: snapshot.email,
      status: snapshot.status,
      createdAt: snapshot.createdAt,
      updatedAt: snapshot.updatedAt,
    });

    expect(legacy.failedAuthAttempts).toBe(0);
    expect(legacy.lockedUntil).toBeUndefined();
  });
});
