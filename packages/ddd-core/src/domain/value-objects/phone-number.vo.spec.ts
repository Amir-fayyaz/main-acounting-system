import { InvalidValueError } from '../errors/invalid-value.error';
import { PhoneNumber } from './phone-number.vo';

describe('PhoneNumber value object', () => {
  describe('normalisation', () => {
    it('keeps a clean E.164 number untouched', () => {
      expect(PhoneNumber.of('+14155552671').value).toBe('+14155552671');
    });

    it('strips spaces, dashes, parentheses, and dots', () => {
      expect(PhoneNumber.of('+1 (415) 555-2671').value).toBe('+14155552671');
      expect(PhoneNumber.of('+1.415.555.2671').value).toBe('+14155552671');
      expect(PhoneNumber.of('+1-415-555-2671').value).toBe('+14155552671');
    });

    it('converts a leading 00 international prefix to +', () => {
      expect(PhoneNumber.of('00441555123456').value).toBe('+441555123456');
    });

    it('trims surrounding whitespace before normalising', () => {
      expect(PhoneNumber.of('  +14155552671  ').value).toBe('+14155552671');
    });
  });

  describe('structural equality', () => {
    it('treats numbers written differently as equal after normalisation', () => {
      expect(PhoneNumber.of('+14155552671').equals(PhoneNumber.of('+1 (415) 555-2671'))).toBe(true);
      expect(PhoneNumber.of('00441555123456').equals(PhoneNumber.of('+441555123456'))).toBe(true);
    });

    it('treats different numbers as not equal', () => {
      expect(PhoneNumber.of('+14155552671').equals(PhoneNumber.of('+14155552672'))).toBe(false);
    });

    it('returns false when compared against undefined', () => {
      expect(PhoneNumber.of('+14155552671').equals(undefined)).toBe(false);
    });
  });

  describe('validation failures', () => {
    it('rejects non-string input', () => {
      expect(() => PhoneNumber.of(42 as unknown as string)).toThrow(InvalidValueError);
      expect(() => PhoneNumber.of(undefined as unknown as string)).toThrow(InvalidValueError);
      expect(() => PhoneNumber.of(null as unknown as string)).toThrow(InvalidValueError);
    });

    it('rejects an empty string after trimming', () => {
      expect(() => PhoneNumber.of('')).toThrow(InvalidValueError);
      expect(() => PhoneNumber.of('   ')).toThrow(InvalidValueError);
    });

    it('rejects numbers without a leading +', () => {
      expect(() => PhoneNumber.of('14155552671')).toThrow(InvalidValueError);
      expect(() => PhoneNumber.of('4155552671')).toThrow(InvalidValueError);
    });

    it('rejects numbers with a country code starting at 0', () => {
      expect(() => PhoneNumber.of('+0123456789')).toThrow(InvalidValueError);
    });

    it('rejects numbers shorter than 8 digits after +', () => {
      expect(() => PhoneNumber.of('+1234567')).toThrow(InvalidValueError);
    });

    it('rejects numbers longer than 15 digits after +', () => {
      expect(() => PhoneNumber.of('+1234567890123456')).toThrow(InvalidValueError);
    });

    it('rejects numbers containing letters', () => {
      expect(() => PhoneNumber.of('+1415abc2671')).toThrow(InvalidValueError);
    });

    it('rejects numbers that strip to nothing usable', () => {
      expect(() => PhoneNumber.of('()- .')).toThrow(InvalidValueError);
    });
  });

  describe('countryCode', () => {
    it('returns a 2-character code for short numbers', () => {
      expect(PhoneNumber.of('+1415555267').countryCode).toBe('14');
    });

    it('returns a 3-character code for longer numbers', () => {
      expect(PhoneNumber.of('+14155552671').countryCode).toBe('141');
    });
  });

  describe('toString', () => {
    it('returns the normalised value', () => {
      expect(PhoneNumber.of('+1 (415) 555-2671').toString()).toBe('+14155552671');
    });
  });
});
