import { InvalidValueError } from '../errors/invalid-value.error';
import { TenantId } from './tenant-id.vo';

const VALID = '550e8400-e29b-41d4-a716-446655440000';

describe('TenantId value object', () => {
  describe('valid creation', () => {
    it('creates a TenantId from a canonical lowercase UUID v4', () => {
      const id = TenantId.of(VALID);
      expect(id.value).toBe(VALID);
    });

    it('trims surrounding whitespace', () => {
      const id = TenantId.of(`  ${VALID}  `);
      expect(id.value).toBe(VALID);
    });

    it('normalises uppercase hex characters to lowercase', () => {
      const id = TenantId.of(VALID.toUpperCase());
      expect(id.value).toBe(VALID);
    });
  });

  describe('structural equality', () => {
    it('treats ids differing only in case or whitespace as equal', () => {
      expect(TenantId.of(VALID).equals(TenantId.of(VALID.toUpperCase()))).toBe(true);
      expect(TenantId.of(VALID).equals(TenantId.of(`  ${VALID}  `))).toBe(true);
    });

    it('treats different ids as not equal', () => {
      const other = '550e8400-e29b-41d4-a716-446655440001';
      expect(TenantId.of(VALID).equals(TenantId.of(other))).toBe(false);
    });

    it('returns false when compared against undefined', () => {
      expect(TenantId.of(VALID).equals(undefined)).toBe(false);
    });
  });

  describe('validation failures', () => {
    it('rejects non-string input', () => {
      expect(() => TenantId.of(42 as unknown as string)).toThrow(InvalidValueError);
      expect(() => TenantId.of(undefined as unknown as string)).toThrow(InvalidValueError);
      expect(() => TenantId.of(null as unknown as string)).toThrow(InvalidValueError);
    });

    it('rejects an empty string after trimming', () => {
      expect(() => TenantId.of('')).toThrow(InvalidValueError);
      expect(() => TenantId.of('   ')).toThrow(InvalidValueError);
    });

    it('rejects non-UUID strings', () => {
      expect(() => TenantId.of('not-a-uuid')).toThrow(InvalidValueError);
      expect(() => TenantId.of('12345')).toThrow(InvalidValueError);
    });

    it('rejects UUIDs of the wrong version', () => {
      // Version 1, not 4
      const v1 = '550e8400-e29b-11d4-a716-446655440000';
      expect(() => TenantId.of(v1)).toThrow(InvalidValueError);
    });

    it('rejects UUIDs with the wrong variant nibble', () => {
      // variant "c" is not in [89ab]
      const badVariant = '550e8400-e29b-41d4-c716-446655440000';
      expect(() => TenantId.of(badVariant)).toThrow(InvalidValueError);
    });

    it('rejects UUIDs missing segments', () => {
      expect(() => TenantId.of('550e8400-e29b-41d4-a716-44665544000')).toThrow(InvalidValueError);
    });

    it('rejects UUIDs with extra segments', () => {
      expect(() => TenantId.of('550e8400-e29b-41d4-a716-4466554400000')).toThrow(InvalidValueError);
    });

    it('rejects UUIDs containing non-hex characters', () => {
      const nonHex = '550e8400-e29b-41d4-a716-44665544000z';
      expect(() => TenantId.of(nonHex)).toThrow(InvalidValueError);
    });
  });

  describe('toString', () => {
    it('returns the normalised value', () => {
      expect(TenantId.of(VALID.toUpperCase()).toString()).toBe(VALID);
    });
  });
});
