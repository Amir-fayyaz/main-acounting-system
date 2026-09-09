import { InvalidValueError } from '../errors/invalid-value.error';
import { Address } from './address.vo';

describe('Address value object', () => {
  describe('valid creation', () => {
    it('creates an address from the four expected parts', () => {
      const address = Address.of({
        street: '221B Baker Street',
        city: 'London',
        postalCode: 'NW1 6XE',
        country: 'United Kingdom',
      });

      expect(address.street).toBe('221B Baker Street');
      expect(address.city).toBe('London');
      expect(address.postalCode).toBe('NW1 6XE');
      expect(address.country).toBe('United Kingdom');
    });

    it('trims surrounding whitespace from every field', () => {
      const address = Address.of({
        street: '  221B Baker Street  ',
        city: '  London  ',
        postalCode: '  NW1 6XE  ',
        country: '  United Kingdom  ',
      });

      expect(address.street).toBe('221B Baker Street');
      expect(address.city).toBe('London');
      expect(address.postalCode).toBe('NW1 6XE');
      expect(address.country).toBe('United Kingdom');
    });

    it('uppercases the postal code so casing does not change identity', () => {
      const address = Address.of({
        street: '1 Infinite Loop',
        city: 'Cupertino',
        postalCode: 'sw1a 1aa',
        country: 'United States',
      });

      expect(address.postalCode).toBe('SW1A 1AA');
    });
  });

  describe('structural equality', () => {
    it('treats addresses differing only by whitespace as equal', () => {
      const a = Address.of({
        street: '221B Baker Street',
        city: 'London',
        postalCode: 'NW1 6XE',
        country: 'United Kingdom',
      });
      const b = Address.of({
        street: '  221B Baker Street  ',
        city: '  London  ',
        postalCode: '  nw1 6xe  ',
        country: '  United Kingdom  ',
      });
      expect(a.equals(b)).toBe(true);
    });

    it('treats addresses differing in any part as not equal', () => {
      const base = Address.of({
        street: '221B Baker Street',
        city: 'London',
        postalCode: 'NW1 6XE',
        country: 'United Kingdom',
      });
      expect(
        base.equals(
          Address.of({
            street: '1 Infinite Loop',
            city: 'London',
            postalCode: 'NW1 6XE',
            country: 'United Kingdom',
          }),
        ),
      ).toBe(false);
    });

    it('returns false when compared against undefined', () => {
      const a = Address.of({
        street: '221B Baker Street',
        city: 'London',
        postalCode: 'NW1 6XE',
        country: 'United Kingdom',
      });
      expect(a.equals(undefined)).toBe(false);
    });
  });

  describe('validation failures', () => {
    const baseArgs = {
      street: '221B Baker Street',
      city: 'London',
      postalCode: 'NW1 6XE',
      country: 'United Kingdom',
    };

    it.each([
      ['street', ''],
      ['street', '   '],
      ['city', ''],
      ['country', ''],
    ])('rejects an empty %s', (_field, value) => {
      expect(() => Address.of({ ...baseArgs, [_field]: value } as typeof baseArgs)).toThrow(
        InvalidValueError,
      );
    });

    it.each([
      ['street', 'a'.repeat(121)],
      ['city', 'b'.repeat(121)],
      ['country', 'c'.repeat(121)],
    ])('rejects a %s longer than 120 characters', (_field, value) => {
      expect(() => Address.of({ ...baseArgs, [_field]: value } as typeof baseArgs)).toThrow(
        InvalidValueError,
      );
    });

    it('rejects a non-string field', () => {
      expect(() => Address.of({ ...baseArgs, street: 42 as unknown as string })).toThrow(InvalidValueError);
    });

    it('rejects a postal code shorter than 3 characters', () => {
      expect(() => Address.of({ ...baseArgs, postalCode: 'AB' })).toThrow(InvalidValueError);
    });

    it('rejects a postal code longer than 12 characters', () => {
      expect(() => Address.of({ ...baseArgs, postalCode: 'A'.repeat(13) })).toThrow(InvalidValueError);
    });

    it('rejects a postal code with unsupported characters', () => {
      expect(() => Address.of({ ...baseArgs, postalCode: 'AB!1 XE' })).toThrow(InvalidValueError);
    });
  });

  describe('format', () => {
    it('renders the address on a single line', () => {
      const address = Address.of({
        street: '221B Baker Street',
        city: 'London',
        postalCode: 'NW1 6XE',
        country: 'United Kingdom',
      });
      expect(address.format()).toBe('221B Baker Street, London NW1 6XE, United Kingdom');
    });
  });
});
