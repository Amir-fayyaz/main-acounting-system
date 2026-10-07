import { describe, expect, it } from 'vitest';

import { PasswordHash } from '../../domain/value-objects/password-hash.js';
import { PlainPassword } from '../../domain/value-objects/plain-password.js';
import { SCRYPT_PARAMETERS, ScryptPasswordHasher } from './scrypt-password-hasher.js';

/**
 * The approved password-hashing mechanism (IAM-005; 06-security-engineering).
 *
 * These are the security-focused tests of the credential store: the real
 * `node:crypto` scrypt adapter is exercised, not a double, because what is being
 * verified *is* the derivation — its cost parameters, its per-credential salt,
 * its constant-time comparison, and its refusal to perform absurd work for a
 * hostile record.
 *
 * The secret used here is a test fixture, never a real credential.
 */
const SECRET = 'correct horse battery staple';
const OTHER_SECRET = 'correct horse battery stapl3';

describe('ScryptPasswordHasher', () => {
  const hasher = new ScryptPasswordHasher();

  it('stores a self-describing hash with the approved cost parameters', async () => {
    const hash = await hasher.hash(PlainPassword.from(SECRET));

    expect(hash.algorithm).toBe('scrypt');
    expect(hash.parameters).toEqual({ n: 131072, r: 8, p: 1 });
    expect(hash.encoded).toMatch(/^scrypt\(n=131072,r=8,p=1\)\$[A-Za-z0-9_-]{22}\$[A-Za-z0-9_-]{86}$/);
    await expect(hasher.verify(PlainPassword.from(SECRET), hash)).resolves.toBe(true);
  });

  it('never stores or renders the secret it derived from', async () => {
    const hash = await hasher.hash(PlainPassword.from(SECRET));

    expect(hash.encoded).not.toContain(SECRET);
    expect(hash.encoded).not.toContain('horse');
    expect(JSON.stringify({ hash })).not.toContain('horse');
  });

  it('salts every hash, so the same secret never hashes to the same value twice', async () => {
    const first = await hasher.hash(PlainPassword.from(SECRET));
    const second = await hasher.hash(PlainPassword.from(SECRET));

    expect(first.salt).not.toBe(second.salt);
    expect(first.derivedKey).not.toBe(second.derivedKey);
    expect(first.equals(second)).toBe(false);

    // Both remain verifiable against the same secret: the salt is per
    // credential, not per secret.
    await expect(hasher.verify(PlainPassword.from(SECRET), first)).resolves.toBe(true);
    await expect(hasher.verify(PlainPassword.from(SECRET), second)).resolves.toBe(true);
  });

  it('rejects a wrong secret without throwing', async () => {
    const hash = await hasher.hash(PlainPassword.from(SECRET));

    await expect(hasher.verify(PlainPassword.from(OTHER_SECRET), hash)).resolves.toBe(false);
  });

  it('is case- and whitespace-sensitive: the stored secret is the exact secret', async () => {
    const hash = await hasher.hash(PlainPassword.from(SECRET));

    await expect(
      hasher.verify(PlainPassword.from(SECRET.toUpperCase()), hash),
    ).resolves.toBe(false);
    await expect(hasher.verify(PlainPassword.from(`${SECRET} `), hash)).resolves.toBe(false);
  });

  it('refuses to verify an algorithm or parameter set it does not support', async () => {
    const hash = await hasher.hash(PlainPassword.from(SECRET));

    const foreignAlgorithm = PasswordHash.from(
      hash.encoded.replace('scrypt', 'bcrypt'),
    );
    const absurdCost = PasswordHash.from(hash.encoded.replace('n=131072', 'n=1073741824'));
    const notAPowerOfTwo = PasswordHash.from(hash.encoded.replace('n=131072', 'n=100000'));
    const hugeBlockSize = PasswordHash.from(hash.encoded.replace('r=8', 'r=4096'));

    for (const candidate of [foreignAlgorithm, absurdCost, notAPowerOfTwo, hugeBlockSize]) {
      await expect(hasher.verify(PlainPassword.from(SECRET), candidate)).resolves.toBe(false);
    }
  });

  it('answers false rather than throwing when a stored record does not match', async () => {
    const hash = await hasher.hash(PlainPassword.from(SECRET));
    const tampered = PasswordHash.from(hash.encoded.replace(hash.derivedKey, 'A'.repeat(88)));

    await expect(hasher.verify(PlainPassword.from(SECRET), tampered)).resolves.toBe(false);
  });

  it('spends derivation work for a credential that does not exist', async () => {
    // The point of this method is that it costs the same as a verification, so
    // its observable contract is that it resolves (and does not need a hash).
    await expect(
      hasher.verifyWithoutCredential(PlainPassword.from(SECRET)),
    ).resolves.toBeUndefined();
  });

  it('keeps the documented parameter set in one place', () => {
    expect(SCRYPT_PARAMETERS).toEqual({
      cost: 131_072,
      blockSize: 8,
      parallelization: 1,
      keyLength: 64,
      saltLength: 16,
    });
  });
});
