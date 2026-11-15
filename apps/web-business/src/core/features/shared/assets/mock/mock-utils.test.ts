import { describe, expect, it } from 'vitest';

import { createId, makeMoney } from './mock-utils';

describe('makeMoney', () => {
  it('returns the amount unchanged', () => {
    expect(makeMoney('48200000000.00')).toBe('48200000000.00');
    expect(makeMoney('0')).toBe('0');
  });
});

describe('createId', () => {
  it('creates a zero-padded id with prefix', () => {
    expect(createId('task', 1)).toBe('task-0001');
    expect(createId('activity', 2)).toBe('activity-0002');
    expect(createId('cheque', 10)).toBe('cheque-0010');
  });
});
