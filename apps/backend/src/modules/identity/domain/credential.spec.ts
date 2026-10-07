import { describe, expect, it } from 'vitest';

import { InvalidPrimitiveError } from '../../../shared/primitives/invalid-primitive-error.js';
import { DateTime } from '../../../shared/time/date-time.js';
import { Credential } from './aggregates/credential.js';
import { PasswordHash } from './value-objects/password-hash.js';
import {
  PLAIN_PASSWORD_MIN_LENGTH,
  PlainPassword,
} from './value-objects/plain-password.js';
import { generateUserId, userIdFrom } from './value-objects/user-id.js';

/**
 * The credential model (IAM-005).
 *
 * These tests pin the properties the security requirements rest on: a secret is
 * never stored or rendered, a stored hash is self-describing and parseable, and
 * a credential belongs to exactly one user.
 */

const NOW = DateTime.parse('2026-10-03T08:00:00.000Z');
const LATER = DateTime.parse('2026-10-03T09:30:00.000Z');

/** A syntactically valid encoded hash, shaped like the adapter's output. */
function encodedHash(
  salt = 'c2FsdHNhbHRzYWx0c2FsdA',
  key = 'ZGVyaXZlZGtleWRlcml2ZWRrZXk',
  parameters = 'n=131072,r=8,p=1',
): string {
  return `scrypt(${parameters})$${salt}$${key}`;
}

describe('PlainPassword', () => {
  it('accepts a secret at the policy minimum and reveals it unchanged', () => {
    const secret = 'x'.repeat(PLAIN_PASSWORD_MIN_LENGTH);

    const password = PlainPassword.from(secret);

    expect(password.reveal()).toBe(secret);
    expect(password.length).toBe(PLAIN_PASSWORD_MIN_LENGTH);
  });

  it('refuses a secret below the minimum without echoing it', () => {
    expect(() => PlainPassword.from('short')).toThrow(InvalidPrimitiveError);
    expect(() => PlainPassword.from('short')).toThrow(/at least 12 characters/);

    // The rejected value must not appear in the error, because an error is
    // exactly the kind of message that reaches a log.
    let failure: unknown;
    try {
      PlainPassword.from('hunter2');
    } catch (error) {
      failure = error;
    }
    expect((failure as Error).message).not.toContain('hunter2');
  });

  it('refuses a blank secret and a non-string', () => {
    expect(() => PlainPassword.from('            ')).toThrow(/must not be blank/);
    expect(() => PlainPassword.from(undefined as unknown as string)).toThrow(/must be a string/);
  });

  it('counts Unicode code points rather than UTF-16 units', () => {
    const emoji = '🔐'.repeat(6);

    expect(emoji.length).toBe(12);
    expect(() => PlainPassword.from(emoji)).toThrow(/at least 12 characters/);
    expect(PlainPassword.from(emoji.repeat(2)).length).toBe(12);
  });

  it('preserves surrounding whitespace, because it is part of the secret', () => {
    const password = PlainPassword.from('  spaced secret  ');

    expect(password.reveal()).toBe('  spaced secret  ');
  });

  it('never renders the secret through toString or JSON', () => {
    const password = PlainPassword.from('correct horse battery staple');

    expect(password.toString()).toBe('PlainPassword(***)');
    expect(JSON.stringify({ password })).toBe('{"password":"PlainPassword(***)"}');
    expect(JSON.stringify({ password })).not.toContain('battery');
  });

  it('reports validity without throwing, for a boundary that only rejects', () => {
    expect(PlainPassword.isValid('correct horse battery staple')).toBe(true);
    expect(PlainPassword.isValid('short')).toBe(false);
    expect(PlainPassword.isValid(42)).toBe(false);
  });
});

describe('PasswordHash', () => {
  it('parses an encoded hash into its algorithm, parameters, salt and key', () => {
    const hash = PasswordHash.from(encodedHash());

    expect(hash.algorithm).toBe('scrypt');
    expect(hash.parameters).toEqual({ n: 131072, r: 8, p: 1 });
    expect(hash.salt).toBe('c2FsdHNhbHRzYWx0c2FsdA');
    expect(hash.derivedKey).toBe('ZGVyaXZlZGtleWRlcml2ZWRrZXk');
    expect(hash.encoded).toBe(encodedHash());
  });

  it('accepts an algorithm without parameters, so an upgrade can change the shape', () => {
    const hash = PasswordHash.from('argon2id$c2FsdHNhbHRzYWx0c2FsdA$ZGVyaXZlZGtleWRlcml2ZWRrZXk');

    expect(hash.algorithm).toBe('argon2id');
    expect(hash.parameters).toEqual({});
  });

  it('refuses a malformed, truncated or unbounded value', () => {
    expect(() => PasswordHash.from('')).toThrow(InvalidPrimitiveError);
    expect(() => PasswordHash.from('scrypt$onlysalt')).toThrow(InvalidPrimitiveError);
    expect(() => PasswordHash.from('SCrypt(n=1)$c2FsdA$ZGVyaXZlZA')).toThrow(InvalidPrimitiveError);
    expect(() =>
      PasswordHash.from('scrypt(n=131072,x=abc)$c2FsdHNhbHRzYWx0c2FsdA$ZGVyaXZlZGtleWRlcml2ZWRrZXk'),
    ).toThrow(/cost parameters/);
    expect(() => PasswordHash.from(`scrypt$c2FsdA$${'a'.repeat(300)}`)).toThrow(
      InvalidPrimitiveError,
    );
  });

  it('never renders the derived key through toString or JSON', () => {
    const hash = PasswordHash.from(encodedHash());

    expect(hash.toString()).toBe('PasswordHash(scrypt)');
    expect(JSON.stringify(hash)).toBe('"PasswordHash(scrypt)"');
    expect(JSON.stringify({ hash })).not.toContain('ZGVyaXZlZGtleQ');
  });

  it('compares by encoded value and answers "is this encoded" without throwing', () => {
    expect(PasswordHash.from(encodedHash()).equals(PasswordHash.from(encodedHash()))).toBe(true);
    expect(
      PasswordHash.from(encodedHash()).equals(PasswordHash.from(encodedHash('b3RoZXJzYWx0c2FsdA'))),
    ).toBe(false);
    expect(PasswordHash.isEncoded(encodedHash())).toBe(true);
    expect(PasswordHash.isEncoded('not-a-hash')).toBe(false);
  });
});

describe('Credential', () => {
  it('establishes the secret of a user without storing plaintext', () => {
    const userId = generateUserId();
    const hash = PasswordHash.from(encodedHash());

    const credential = Credential.create({ userId, passwordHash: hash, now: NOW });

    expect(credential.userId.value).toBe(userId.value);
    expect(credential.algorithm()).toBe('scrypt');
    expect(credential.createdAt.equals(NOW)).toBe(true);
    expect(credential.updatedAt.equals(NOW)).toBe(true);
    expect(credential.snapshot().passwordHash).toBe(encodedHash());
    expect(JSON.stringify(credential.freeze())).not.toContain('correct horse');
  });

  it('replaces the stored hash and advances only the update instant', () => {
    const credential = Credential.create({
      userId: generateUserId(),
      passwordHash: PasswordHash.from(encodedHash()),
      now: NOW,
    });

    credential.replacePasswordHash(
      PasswordHash.from(encodedHash('bmV3c2FsdG5ld3NhbHQ')),
      LATER,
    );

    expect(credential.snapshot().passwordHash).toBe(encodedHash('bmV3c2FsdG5ld3NhbHQ'));
    expect(credential.createdAt.equals(NOW)).toBe(true);
    expect(credential.updatedAt.equals(LATER)).toBe(true);
  });

  it('rebuilds from stored state and re-validates the encoded hash', () => {
    const userId = generateUserId();

    const rehydrated = Credential.rehydrate({
      userId: userId.value,
      passwordHash: encodedHash(),
      createdAt: NOW,
      updatedAt: LATER,
    });

    expect(rehydrated.userId.value).toBe(userId.value);
    expect(rehydrated.updatedAt.equals(LATER)).toBe(true);

    expect(() =>
      Credential.rehydrate({
        userId: userId.value,
        passwordHash: 'not-a-hash',
        createdAt: NOW,
        updatedAt: LATER,
      }),
    ).toThrow(InvalidPrimitiveError);
  });

  it('is one credential per user: identity is the user, and it never leaks the hash', () => {
    const userId = userIdFrom('018f0d3c-6d0f-7a4b-9d4e-2b3c4d5e6f70');
    const first = Credential.create({
      userId,
      passwordHash: PasswordHash.from(encodedHash()),
      now: NOW,
    });
    const second = Credential.create({
      userId: generateUserId(),
      passwordHash: PasswordHash.from(encodedHash()),
      now: NOW,
    });

    const sameUserDifferentSecret = Credential.create({
      userId,
      passwordHash: PasswordHash.from(encodedHash('b3RoZXJzYWx0c2FsdA')),
      now: LATER,
    });

    expect(first.equals(sameUserDifferentSecret)).toBe(true);
    expect(first.equals(second)).toBe(false);
    expect(first.toString()).toBe(`Credential(${userId.value})`);
    expect(first.toString()).not.toContain('c2FsdHNhbHRzYWx0');
  });
});
