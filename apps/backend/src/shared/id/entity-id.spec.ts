import { describe, expect, it } from 'vitest';

import { InvalidPrimitiveError } from '../primitives/invalid-primitive-error.js';
import { EntityId } from './entity-id.js';

const SAMPLE = '018f0d3c-6d0f-7a4b-9d4e-2b3c4d5e6f70';

describe('EntityId.generate', () => {
  it('produces a fresh UUID every time', () => {
    const first = EntityId.generate();
    const second = EntityId.generate();

    expect(first.value).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
    expect(first.equals(second)).toBe(false);
    expect(first.value).not.toBe(second.value);
  });
});

describe('EntityId.from', () => {
  it('accepts a UUID and exposes it as its text', () => {
    const id = EntityId.from(SAMPLE);
    expect(id.value).toBe(SAMPLE);
    expect(id.toString()).toBe(SAMPLE);
    expect(id.toJSON()).toBe(SAMPLE);
  });

  it('folds case and padding so one id has one spelling', () => {
    const upper = EntityId.from(SAMPLE.toUpperCase());
    const padded = EntityId.from(`  ${SAMPLE}  `);
    expect(upper.value).toBe(SAMPLE);
    expect(padded.value).toBe(SAMPLE);
    expect(upper.equals(padded)).toBe(true);
  });

  it.each([
    ['a UUID without dashes', '018f0d3c6d0f7a4b9d4e2b3c4d5e6f70'],
    ['an empty string', ''],
    ['arbitrary text', 'not-a-uuid'],
    ['a too-short UUID', '018f0d3c-6d0f-7a4b-9d4e-2b3c4d5e6f'],
    ['a UUID with non-hex digits', 'zzzf0d3c-6d0f-7a4b-9d4e-2b3c4d5e6f70'],
  ])('rejects %s', (_label, value) => {
    expect(() => EntityId.from(value)).toThrow(InvalidPrimitiveError);
    expect(() => EntityId.from(value)).toThrow('EntityId: value must be a UUID');
  });

  it('rejects a non-string at runtime', () => {
    expect(() => EntityId.from(null as unknown as string)).toThrow(InvalidPrimitiveError);
    expect(() => EntityId.from(undefined as unknown as string)).toThrow(
      'EntityId: value must be a UUID string',
    );
  });

  it('never echoes an oversized value back in full', () => {
    expect(() => EntityId.from('x'.repeat(500))).toThrow(/\.\.\./);
  });
});

describe('EntityId.isValid', () => {
  it('answers without throwing', () => {
    expect(EntityId.isValid(SAMPLE)).toBe(true);
    expect(EntityId.isValid(SAMPLE.toUpperCase())).toBe(true);
    expect(EntityId.isValid('nope')).toBe(false);
    expect(EntityId.isValid(null as unknown as string)).toBe(false);
  });
});

describe('EntityId equality', () => {
  it('is value-based', () => {
    const id = EntityId.from(SAMPLE);
    expect(id.equals(EntityId.from(SAMPLE))).toBe(true);
    expect(id.equals(EntityId.generate())).toBe(false);
  });

  it('is false for anything that is not an id', () => {
    const id = EntityId.from(SAMPLE);
    expect(id.equals(SAMPLE as unknown as EntityId)).toBe(false);
    expect(id.equals(null as unknown as EntityId)).toBe(false);
  });
});
