import { PhoneNumber } from './phone-number.vo';
import { InvalidValueError } from '../invalid-value.error';

describe('PhoneNumber (shared/domain re-export)', () => {
  it('creates a PhoneNumber from a clean E.164 string', () => {
    const phone = PhoneNumber.of('+14155552671');
    expect(phone.value).toBe('+14155552671');
  });

  it('normalises spaces, dashes, parentheses, and dots', () => {
    expect(PhoneNumber.of('+1 (415) 555-2671').value).toBe('+14155552671');
  });

  it('converts a leading 00 international prefix to +', () => {
    expect(PhoneNumber.of('00441555123456').value).toBe('+441555123456');
  });

  it('treats numbers written differently as equal after normalisation', () => {
    expect(PhoneNumber.of('+14155552671').equals(PhoneNumber.of('+1 (415) 555-2671'))).toBe(true);
  });

  it('rejects a number without a leading +', () => {
    expect(() => PhoneNumber.of('14155552671')).toThrow(InvalidValueError);
  });

  it('rejects a number shorter than 8 digits after +', () => {
    expect(() => PhoneNumber.of('+1234567')).toThrow(InvalidValueError);
  });

  it('exposes a best-effort countryCode derived from the E.164 prefix', () => {
    expect(PhoneNumber.of('+14155552671').countryCode).toBe('141');
  });
});
