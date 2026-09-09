import { Address } from './address.vo';
import { InvalidValueError } from '../invalid-value.error';

describe('Address (shared/domain re-export)', () => {
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

  it('trims whitespace and uppercases the postal code', () => {
    const address = Address.of({
      street: '  221B Baker Street  ',
      city: '  London  ',
      postalCode: '  nw1 6xe  ',
      country: '  United Kingdom  ',
    });

    expect(address.postalCode).toBe('NW1 6XE');
    expect(address.street).toBe('221B Baker Street');
  });

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

  it('rejects an empty street', () => {
    expect(() =>
      Address.of({
        street: '',
        city: 'London',
        postalCode: 'NW1 6XE',
        country: 'United Kingdom',
      }),
    ).toThrow(InvalidValueError);
  });

  it('rejects an invalid postal code', () => {
    expect(() =>
      Address.of({
        street: '221B Baker Street',
        city: 'London',
        postalCode: 'AB!1 XE',
        country: 'United Kingdom',
      }),
    ).toThrow(InvalidValueError);
  });

  it('formats the address on a single line', () => {
    const address = Address.of({
      street: '221B Baker Street',
      city: 'London',
      postalCode: 'NW1 6XE',
      country: 'United Kingdom',
    });
    expect(address.format()).toBe('221B Baker Street, London NW1 6XE, United Kingdom');
  });
});
