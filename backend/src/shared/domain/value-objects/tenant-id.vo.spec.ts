import { TenantId } from './tenant-id.vo';
import { InvalidValueError } from '../invalid-value.error';

const VALID = '550e8400-e29b-41d4-a716-446655440000';

describe('TenantId (shared/domain re-export)', () => {
  it('creates a TenantId from a canonical lowercase UUID v4', () => {
    const id = TenantId.of(VALID);
    expect(id.value).toBe(VALID);
  });

  it('normalises uppercase hex and surrounding whitespace', () => {
    const id = TenantId.of(`  ${VALID.toUpperCase()}  `);
    expect(id.value).toBe(VALID);
  });

  it('treats ids differing only in case as equal', () => {
    expect(TenantId.of(VALID).equals(TenantId.of(VALID.toUpperCase()))).toBe(true);
  });

  it('rejects an empty string', () => {
    expect(() => TenantId.of('')).toThrow(InvalidValueError);
  });

  it('rejects a non-UUID string', () => {
    expect(() => TenantId.of('not-a-uuid')).toThrow(InvalidValueError);
  });
});
