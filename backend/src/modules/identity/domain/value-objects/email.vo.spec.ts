import { InvalidEmailError } from '../errors/invalid-email.error';
import { Email } from './email.vo';

describe('Email value object', () => {
  describe('valid creation', () => {
    it('creates an email from a plain address', () => {
      const email = Email.of('ada@example.com');
      expect(email.value).toBe('ada@example.com');
    });

    it('trims surrounding whitespace', () => {
      const email = Email.of('  ada@example.com  ');
      expect(email.value).toBe('ada@example.com');
    });

    it('normalises to lowercase', () => {
      const email = Email.of('Ada.Lovelace@EXAMPLE.COM');
      expect(email.value).toBe('ada.lovelace@example.com');
    });

    it('exposes the local part and domain', () => {
      const email = Email.of('ada.lovelace@example.co.uk');
      expect(email.localPart).toBe('ada.lovelace');
      expect(email.domain).toBe('example.co.uk');
    });

    it('accepts plus addressing and common mailbox characters', () => {
      expect(Email.of('ada+news@example.com').value).toBe('ada+news@example.com');
      expect(Email.of('a_b-c%d@example.com').value).toBe('a_b-c%d@example.com');
    });

    it('accepts single-character labels', () => {
      expect(Email.of('a@b.co').value).toBe('a@b.co');
    });
  });

  describe('structural equality', () => {
    it('treats addresses differing only in case as equal', () => {
      expect(Email.of('Ada@Example.com').equals(Email.of('ada@example.com'))).toBe(true);
    });

    it('treats addresses differing by whitespace as equal', () => {
      expect(Email.of(' ada@example.com ').equals(Email.of('ada@example.com'))).toBe(true);
    });

    it('treats different addresses as not equal', () => {
      expect(Email.of('ada@example.com').equals(Email.of('grace@example.com'))).toBe(false);
    });

    it('returns false when compared against undefined', () => {
      expect(Email.of('ada@example.com').equals(undefined)).toBe(false);
    });
  });

  describe('validation failures', () => {
    it('rejects non-string input', () => {
      expect(() => Email.of(42 as unknown as string)).toThrow(InvalidEmailError);
      expect(() => Email.of(undefined as unknown as string)).toThrow(InvalidEmailError);
    });

    it('rejects an empty string after trimming', () => {
      expect(() => Email.of('')).toThrow(InvalidEmailError);
      expect(() => Email.of('   ')).toThrow(InvalidEmailError);
    });

    it('rejects an address longer than 254 characters', () => {
      const longLocal = 'a'.repeat(64);
      const longDomain = `${'b'.repeat(61)}.c`; // keeps total length over 254
      const long = `${longLocal}@${longDomain}${'.d'.repeat(100)}`;
      expect(long.length).toBeGreaterThan(254);
      expect(() => Email.of(long)).toThrow(InvalidEmailError);
    });

    it('rejects an address of exactly 255 characters', () => {
      // Structurally valid (64-char local, all labels <= 63) but one octet
      // over the RFC 5321 limit, so only the length rule can reject it.
      const padded = `${'a'.repeat(64)}@${'b'.repeat(63)}${'.cd'.repeat(41)}.com`;
      expect(padded.length).toBe(255);
      expect(() => Email.of(padded)).toThrow(InvalidEmailError);
    });

    it('rejects a missing @ separator', () => {
      expect(() => Email.of('ada.example.com')).toThrow(InvalidEmailError);
    });

    it('rejects multiple @ separators', () => {
      expect(() => Email.of('a@@b.com')).toThrow(InvalidEmailError);
      expect(() => Email.of('a@b@c.com')).toThrow(InvalidEmailError);
    });

    it('rejects an empty local part', () => {
      expect(() => Email.of('@example.com')).toThrow(InvalidEmailError);
    });

    it('rejects a missing domain', () => {
      expect(() => Email.of('ada@')).toThrow(InvalidEmailError);
    });

    it('rejects a domain without a dot (no TLD)', () => {
      expect(() => Email.of('ada@localhost')).toThrow(InvalidEmailError);
    });

    it('rejects leading, trailing, or consecutive dots', () => {
      expect(() => Email.of('.ada@example.com')).toThrow(InvalidEmailError);
      expect(() => Email.of('ada.@example.com')).toThrow(InvalidEmailError);
      expect(() => Email.of('ada..lovelace@example.com')).toThrow(InvalidEmailError);
      expect(() => Email.of('ada@example..com')).toThrow(InvalidEmailError);
      expect(() => Email.of('ada@.example.com')).toThrow(InvalidEmailError);
      expect(() => Email.of('ada@example.com.')).toThrow(InvalidEmailError);
    });

    it('rejects invalid domain label boundaries', () => {
      expect(() => Email.of('ada@-example.com')).toThrow(InvalidEmailError);
      expect(() => Email.of('ada@example-.com')).toThrow(InvalidEmailError);
    });

    it('rejects whitespace inside the address', () => {
      expect(() => Email.of('ada lovelace@example.com')).toThrow(InvalidEmailError);
      expect(() => Email.of('ada@exam ple.com')).toThrow(InvalidEmailError);
    });

    it('rejects unsupported special characters in the local part', () => {
      expect(() => Email.of('ada"lovelace@example.com')).toThrow(InvalidEmailError);
      expect(() => Email.of('ada,lovelace@example.com')).toThrow(InvalidEmailError);
    });

    it('rejects a domain label longer than 63 characters', () => {
      const longLabel = 'b'.repeat(64);
      expect(() => Email.of(`ada@${longLabel}.com`)).toThrow(InvalidEmailError);
    });
  });

  describe('toString', () => {
    it('returns the normalised value', () => {
      expect(Email.of(' Ada@Example.COM ').toString()).toBe('ada@example.com');
    });
  });
});
