import { describe, expect, it } from 'vitest';

import { InvalidPrimitiveError } from '../../../shared/primitives/invalid-primitive-error.js';
import { DateTime } from '../../../shared/time/date-time.js';
import { AuthSession } from './aggregates/auth-session.js';
import { SessionAlreadyRevokedError } from './errors/authentication.errors.js';
import { generateUserId } from './value-objects/user-id.js';
import { SessionTokenHash } from './value-objects/session-token-hash.js';

/**
 * The authentication session lifecycle (IAM-005).
 *
 * These tests pin the three states the acceptance criteria describe — usable,
 * expired, invalidated — and the rule that a session carries identity and
 * nothing else.
 */

const NOW = DateTime.parse('2026-10-03T08:00:00.000Z');
const EXPIRES = DateTime.parse('2026-10-03T09:00:00.000Z');
const TOKEN_HASH = SessionTokenHash.from('a'.repeat(64));

function aSession(): AuthSession {
  return AuthSession.create({
    userId: generateUserId(),
    tokenHash: TOKEN_HASH,
    expiresAt: EXPIRES,
    now: NOW,
  });
}

describe('AuthSession', () => {
  it('is usable when created and carries identity only', () => {
    const session = aSession();

    expect(session.isUsable(NOW)).toBe(true);
    expect(session.isExpired(NOW)).toBe(false);
    expect(session.isRevoked()).toBe(false);
    expect(session.revokedAt).toBeUndefined();
    expect(session.createdAt.equals(NOW)).toBe(true);
    expect(session.expiresAt.equals(EXPIRES)).toBe(true);
    expect(session.tokenHash.equals(TOKEN_HASH)).toBe(true);

    // A session holds the user's identity, the token digest, its lifetime and
    // its state — no tenant, role, permission or profile attribute.
    expect(Object.keys(session.snapshot()).sort()).toEqual(
      ['createdAt', 'expiresAt', 'id', 'revokedAt', 'tokenHash', 'updatedAt', 'userId'].sort(),
    );
  });

  it('refuses a lifetime that would create an already-expired session', () => {
    expect(() =>
      AuthSession.create({
        userId: generateUserId(),
        tokenHash: TOKEN_HASH,
        expiresAt: NOW,
        now: NOW,
      }),
    ).toThrow(/expiresAt must be after/);
  });

  it('expires inclusively at the configured instant', () => {
    const session = aSession();

    expect(session.isExpired(DateTime.fromEpochMillis(EXPIRES.epochMillis - 1))).toBe(false);
    expect(session.isExpired(EXPIRES)).toBe(true);
    expect(session.isUsable(EXPIRES)).toBe(false);
  });

  it('is invalidated explicitly, and is refused from then on', () => {
    const session = aSession();
    const revokedAt = DateTime.parse('2026-10-03T08:30:00.000Z');

    session.revoke(revokedAt);

    expect(session.isRevoked()).toBe(true);
    expect(session.revokedAt?.equals(revokedAt)).toBe(true);
    expect(session.updatedAt.equals(revokedAt)).toBe(true);
    // Still within its lifetime, and still refused: invalidation is terminal.
    expect(session.isExpired(revokedAt)).toBe(false);
    expect(session.isUsable(revokedAt)).toBe(false);
  });

  it('refuses a second invalidation instead of reporting success', () => {
    const session = aSession();
    session.revoke(NOW);

    expect(() => session.revoke(NOW)).toThrow(SessionAlreadyRevokedError);
  });

  it('rebuilds from stored state, including an invalidation instant', () => {
    const session = aSession();
    session.revoke(NOW);

    const rehydrated = AuthSession.rehydrate(session.snapshot());

    expect(rehydrated.id.value).toBe(session.id.value);
    expect(rehydrated.isRevoked()).toBe(true);
    expect(rehydrated.revokedAt?.equals(NOW)).toBe(true);
    expect(rehydrated.isUsable(NOW)).toBe(false);
  });

  it('re-validates stored values rather than trusting the record', () => {
    const session = aSession();
    const snapshot = session.snapshot();

    expect(() => AuthSession.rehydrate({ ...snapshot, id: 'not-a-uuid' })).toThrow(
      InvalidPrimitiveError,
    );
    expect(() => AuthSession.rehydrate({ ...snapshot, tokenHash: 'not-a-digest' })).toThrow(
      InvalidPrimitiveError,
    );
  });

  it('never renders the token digest in its description', () => {
    const session = aSession();

    expect(session.toString()).toContain(session.id.value);
    expect(session.toString()).toContain(session.userIdValue());
    expect(session.toString()).not.toContain(TOKEN_HASH.value);
  });
});
