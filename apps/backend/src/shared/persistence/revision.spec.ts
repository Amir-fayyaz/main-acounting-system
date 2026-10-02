import { describe, expect, it } from 'vitest';

import { InvalidPrimitiveError } from '../primitives/invalid-primitive-error.js';
import { MAX_REVISION, Revision } from './revision.js';

describe('Revision.initial', () => {
  it('starts every new record at one', () => {
    expect(Revision.initial().value).toBe(1);
    expect(Revision.initial().equals(Revision.of(1))).toBe(true);
  });
});

describe('Revision.of', () => {
  it('wraps a revision read from storage', () => {
    const revision = Revision.of(42);

    expect(revision.value).toBe(42);
    expect(revision.toString()).toBe('42');
    expect(revision.toJSON()).toBe(42);
    expect(Revision.of(MAX_REVISION).value).toBe(MAX_REVISION);
  });

  it.each([
    ['zero', 0],
    ['a negative number', -1],
    ['a value above the bound', MAX_REVISION + 1],
  ])('rejects %s rather than silently accepting a future revision', (_label, value) => {
    expect(() => Revision.of(value)).toThrow(InvalidPrimitiveError);
    expect(() => Revision.of(value)).toThrow('Revision: value must be between 1 and');
  });

  it.each([
    ['a fraction', 1.5],
    ['a non-number', '10' as unknown as number],
    ['a non-finite number', Number.POSITIVE_INFINITY],
  ])('rejects %s at all', (_label, value) => {
    expect(() => Revision.of(value)).toThrow(InvalidPrimitiveError);
    expect(() => Revision.of(value)).toThrow('Revision: value must be an integer');
  });
});

describe('Revision.next', () => {
  it('advances exactly one, the way a store bumps a version column', () => {
    expect(Revision.initial().next().value).toBe(2);
    expect(Revision.of(7).next().value).toBe(8);
  });

  it('refuses to wrap past the bound into a revision older than the record', () => {
    expect(() => Revision.of(MAX_REVISION).next()).toThrow(InvalidPrimitiveError);
  });
});

describe('Revision equality', () => {
  it('is value-based', () => {
    expect(Revision.of(3).equals(Revision.of(3))).toBe(true);
    expect(Revision.of(3).equals(Revision.of(4))).toBe(false);
  });

  it('is false for anything that is not a revision', () => {
    expect(Revision.of(3).equals(3 as unknown as Revision)).toBe(false);
    expect(Revision.of(3).equals(null as unknown as Revision)).toBe(false);
  });
});
