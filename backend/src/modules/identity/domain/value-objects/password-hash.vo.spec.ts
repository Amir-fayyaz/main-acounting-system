import { InvalidPasswordError } from '../errors/invalid-password.error';
import { PasswordHash } from './password-hash.vo';

// A realistic bcrypt hash (60 chars) used across the happy-path assertions.
const BCRYPT_HASH = '$2b$12$C6UzMDM.H6dfI/f/IKcEe.WeuUQJfUdJBopCg5BxKKT6lbHNGCpFS';

describe('PasswordHash value object', () => {
  describe('valid creation', () => {
    it('creates a hash from a bcrypt PHC string', () => {
      const hash = PasswordHash.of(BCRYPT_HASH);
      expect(hash.value).toBe(BCRYPT_HASH);
    });

    it('accepts each supported bcrypt variant prefix', () => {
      for (const variant of ['2a', '2b', '2x', '2y']) {
        const candidate = `$${variant}$12$C6UzMDM.H6dfI/f/IKcEe.WeuUQJfUdJBopCg5BxKKT6lbHNGCpF`;
        expect(PasswordHash.of(candidate).value).toBe(candidate);
      }
    });

    it('accepts argon2i, argon2d, and argon2id prefixes', () => {
      const argon2id = '$argon2id$v=19$m=65536,t=3,p=1$c29tZXNhbHQ$Zm9vYmFy';
      const argon2i = '$argon2i$v=19$m=65536,t=3,p=1$c29tZXNhbHQ$Zm9vYmFy';
      const argon2d = '$argon2d$v=19$m=65536,t=3,p=1$c29tZXNhbHQ$Zm9vYmFy';

      expect(PasswordHash.of(argon2id).value).toBe(argon2id);
      expect(PasswordHash.of(argon2i).value).toBe(argon2i);
      expect(PasswordHash.of(argon2d).value).toBe(argon2d);
    });

    it('accepts scrypt and pbkdf2 prefixes', () => {
      const scrypt = '$scrypt$ln=16384,r=8,p=1$c29tZXNhbHQ$Zm9vYmFy';
      const pbkdf2 = '$pbkdf2$sha256$i=100000$c29tZXNhbHQ$Zm9vYmFy';

      expect(PasswordHash.of(scrypt).value).toBe(scrypt);
      expect(PasswordHash.of(pbkdf2).value).toBe(pbkdf2);
    });

    it('preserves case in the algorithm prefix', () => {
      const candidate = '$ARGON2ID$v=19$m=65536,t=3,p=1$c29tZXNhbHQ$Zm9vYmFy';
      expect(PasswordHash.of(candidate).value).toBe(candidate);
    });

    it('does not trim or normalise the stored value', () => {
      const candidate = `$2b$12$C6UzMDM.H6dfI/f/IKcEe.WeuUQJfUdJBopCg5BxKKT6lbHNGCpF `;
      expect(PasswordHash.of(candidate).value).toBe(candidate);
    });
  });

  describe('structural equality', () => {
    it('treats two hashes with identical values as equal', () => {
      expect(PasswordHash.of(BCRYPT_HASH).equals(PasswordHash.of(BCRYPT_HASH))).toBe(true);
    });

    it('treats hashes with different values as not equal', () => {
      const other = '$2b$12$C6UzMDM.H6dfI/f/IKcEe.WeuUQJfUdJBopCg5BxKKT6lbHNGCpFT';
      expect(PasswordHash.of(BCRYPT_HASH).equals(PasswordHash.of(other))).toBe(false);
    });

    it('returns false when compared against undefined', () => {
      expect(PasswordHash.of(BCRYPT_HASH).equals(undefined)).toBe(false);
    });
  });

  describe('validation failures', () => {
    it('rejects non-string input', () => {
      expect(() => PasswordHash.of(123 as unknown as string)).toThrow(InvalidPasswordError);
      expect(() => PasswordHash.of(undefined as unknown as string)).toThrow(InvalidPasswordError);
    });

    it('rejects an empty string', () => {
      expect(() => PasswordHash.of('')).toThrow(InvalidPasswordError);
    });

    it('rejects a hash shorter than 20 characters', () => {
      expect(() => PasswordHash.of('$2b$12$short')).toThrow(InvalidPasswordError);
    });

    it('accepts a hash of exactly 20 characters', () => {
      const candidate = '$2b$12$abcdefghijKLMNOPQR'; // 25 chars: over the floor but under the cap
      expect(candidate.length).toBeGreaterThanOrEqual(20);
      expect(PasswordHash.of(candidate).value).toBe(candidate);
    });

    it('rejects a hash longer than 1024 characters', () => {
      const long = `$2b$12$${'a'.repeat(1020)}`;
      expect(long.length).toBeGreaterThan(1024);
      expect(() => PasswordHash.of(long)).toThrow(InvalidPasswordError);
    });

    it('rejects a hash without a recognised algorithm prefix', () => {
      expect(() => PasswordHash.of('plain-text-password')).toThrow(InvalidPasswordError);
      expect(() => PasswordHash.of('md5$5d41402abc4b2a76b9719d911017c592')).toThrow(InvalidPasswordError);
      expect(() => PasswordHash.of('$sha256$YWJjZGVmZ2hpamtsbW5vcA==')).toThrow(InvalidPasswordError);
      expect(() => PasswordHash.of('$2c$12$C6UzMDM.H6dfI/f/IKcEe.WeuUQJfUdJBopCg5BxKKT6lbHNGCpF')).toThrow(
        InvalidPasswordError,
      );
    });

    it('rejects a plaintext password even when long enough', () => {
      expect(() => PasswordHash.of('a'.repeat(60))).toThrow(InvalidPasswordError);
    });
  });

  describe('toString', () => {
    it('returns the stored hash value', () => {
      expect(PasswordHash.of(BCRYPT_HASH).toString()).toBe(BCRYPT_HASH);
    });
  });
});
