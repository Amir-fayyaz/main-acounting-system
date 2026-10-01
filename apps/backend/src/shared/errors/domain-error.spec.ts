import { describe, expect, it } from 'vitest';

import { InvalidPrimitiveError } from '../primitives/invalid-primitive-error.js';
import {
  BusinessRuleError,
  ConflictError,
  NotFoundError,
  StateViolationError,
  ValidationError,
} from './category-errors.js';
import { DomainError, type DomainErrorSnapshot } from './domain-error.js';
import { ErrorCategory } from './error-category.js';
import { MAX_ERROR_DETAILS, type ErrorDetail } from './error-detail.js';

class TestError extends DomainError {
  public constructor(
    message: string,
    options?: {
      readonly code?: string;
      readonly category?: ErrorCategory;
      readonly details?: readonly ErrorDetail[];
      readonly cause?: unknown;
    },
  ) {
    super(options?.code ?? 'TEST_FAILURE', message, {
      category: options?.category,
      details: options?.details,
      cause: options?.cause,
    });
  }
}

describe('code and message', () => {
  it('exposes a stable code and a client-facing message', () => {
    const error = new TestError('The period is closed.');

    expect(error.code).toBe('TEST_FAILURE');
    expect(error.message).toBe('The period is closed.');
    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe('TestError');
  });

  it.each([
    ['a lower-case code', 'period_closed'],
    ['a code with a space', 'PERIOD CLOSED'],
    ['a dotted code', 'PERIOD.CLOSED'],
    ['an empty code', ''],
    ['a code longer than 64 characters', `${'A'.repeat(65)}`],
  ])('rejects %s', (_label, code) => {
    expect(() => new TestError('message', { code })).toThrow(InvalidPrimitiveError);
  });

  it('requires an upper-snake code', () => {
    expect(() => new TestError('message', { code: 'period_closed' })).toThrow(
      'DomainError: code must be an upper-snake code',
    );
    expect(() => new TestError('message', { code: '' })).toThrow(
      'DomainError: code must not be blank',
    );
  });

  it.each([
    ['an empty message', ''],
    ['a blank message', '   '],
  ])('rejects %s', (_label, message) => {
    expect(() => new TestError(message)).toThrow('DomainError: message must not be blank');
  });
});

describe('category', () => {
  it('defaults to a business-rule failure when none is stated', () => {
    expect(new TestError('something declined.').category).toBe(ErrorCategory.BUSINESS_RULE);
  });

  it('takes the category the thrower states', () => {
    expect(new TestError('gone.', { category: ErrorCategory.NOT_FOUND }).category).toBe(
      ErrorCategory.NOT_FOUND,
    );
  });

  it('rejects a value outside the shared vocabulary', () => {
    expect(() => new TestError('hm.', { category: 'TEAPOT' as ErrorCategory })).toThrow(
      'DomainError: category must be one of VALIDATION, BUSINESS_RULE, CONFLICT, NOT_FOUND, STATE_VIOLATION',
    );
  });
});

describe('the generic category errors', () => {
  it.each([
    [new ValidationError('bad input.'), ErrorCategory.VALIDATION, 'VALIDATION_FAILED'],
    [new BusinessRuleError('not allowed.'), ErrorCategory.BUSINESS_RULE, 'BUSINESS_RULE_VIOLATED'],
    [new ConflictError('duplicate.'), ErrorCategory.CONFLICT, 'CONFLICT'],
    [new NotFoundError('gone.'), ErrorCategory.NOT_FOUND, 'NOT_FOUND'],
    [new StateViolationError('already posted.'), ErrorCategory.STATE_VIOLATION, 'STATE_VIOLATION'],
  ])('pins a category and a stable code', (error, category, code) => {
    expect(error.category).toBe(category);
    expect(error.code).toBe(code);
    expect(error).toBeInstanceOf(DomainError);
  });

  it('composes one validation failure from many field problems', () => {
    const details: ErrorDetail[] = [
      { code: 'REQUIRED', message: 'amount is required.', field: 'amount' },
      { code: 'MIN', message: 'page is too small.', field: 'page', expected: 1, actual: 0 },
    ];

    const error = ValidationError.fromDetails(details, 'The form is invalid.');

    expect(error.message).toBe('The form is invalid.');
    expect(error.category).toBe(ErrorCategory.VALIDATION);
    expect(error.details).toHaveLength(2);
    expect(error.details[0].field).toBe('amount');
    expect(error.details[1].expected).toBe(1);
    expect(error.toJSON()).toEqual({
      code: 'VALIDATION_FAILED',
      category: 'VALIDATION',
      message: 'The form is invalid.',
      details,
    });
  });

  it('uses a default message when composing from details alone', () => {
    expect(
      ValidationError.fromDetails([{ code: 'REQUIRED', message: 'name is required.' }]).message,
    ).toBe('The submitted values are invalid.');
  });
});

describe('structured details', () => {
  it('is empty unless the failure supplies reasons', () => {
    expect(new TestError('plain.').details).toEqual([]);
  });

  it('copies and freezes details so they cannot be rewritten afterwards', () => {
    const source: ErrorDetail[] = [{ code: 'MIN', message: 'too small.', field: 'page' }];
    const error = new TestError('invalid.', { details: source });

    expect(error.details).toHaveLength(1);
    expect(error.details).not.toBe(source);
    expect(Object.isFrozen(error.details)).toBe(true);
    expect(Object.isFrozen(error.details[0])).toBe(true);

    expect(() => {
      (error.details[0] as unknown as Record<string, string>).code = 'HACKED';
    }).toThrow();
    expect(error.details[0].code).toBe('MIN');
  });

  it('keeps extra primitive facts that support the message', () => {
    const error = new TestError('mismatch.', {
      details: [
        {
          code: 'MISMATCH',
          message: 'period differs.',
          expected: '2026-01',
          actual: '2025-12',
          open: true,
        },
      ],
    });

    expect(error.details[0].expected).toBe('2026-01');
    expect(error.details[0].actual).toBe('2025-12');
    expect(error.details[0].open).toBe(true);
    expect(JSON.parse(JSON.stringify(error)).details[0]).toMatchObject({
      expected: '2026-01',
      actual: '2025-12',
      open: true,
    });
  });

  it.each([
    ['a blank detail code', [{ code: '  ', message: 'x' }]],
    ['a blank detail message', [{ code: 'X', message: '' }]],
    ['a blank detail field', [{ code: 'X', message: 'x', field: ' ' }]],
    ['an object-valued detail key', [{ code: 'X', message: 'x', stack: { a: 1 } }]],
    ['an array-valued detail key', [{ code: 'X', message: 'x', sql: ['select 1'] }]],
    ['a non-finite number', [{ code: 'X', message: 'x', value: Number.NaN }]],
    ['a non-object detail', ['not an object']],
  ])('rejects %s', (_label, details) => {
    expect(() => new TestError('bad.', { details: details as unknown as ErrorDetail[] })).toThrow(
      InvalidPrimitiveError,
    );
  });

  it('rejects more details than the kernel allows', () => {
    const tooMany = Array.from({ length: MAX_ERROR_DETAILS + 1 }, (_, index) => ({
      code: `E${index}`,
      message: 'problem',
    }));

    expect(() => new TestError('many.', { details: tooMany })).toThrow(
      `ErrorDetail: details must hold at most ${MAX_ERROR_DETAILS} entries`,
    );
    expect(MAX_ERROR_DETAILS).toBe(50);
  });

  it('rejects details that are not an array', () => {
    expect(() => new TestError('bad.', { details: {} as unknown as ErrorDetail[] })).toThrow(
      'ErrorDetail: details must be an array',
    );
  });

  it('cannot be pointed at a hostile key', () => {
    const hostile = JSON.parse('{"code":"X","message":"x","__proto__":"polluted"}') as ErrorDetail;

    const error = new TestError('hostile.', { details: [hostile] });

    expect(error.details[0].code).toBe('X');
    expect(Object.getOwnPropertyDescriptor(error.details[0], '__proto__')?.value).toBe('polluted');
    expect(Object.getPrototypeOf(error.details[0])).toBe(Object.prototype);
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
  });
});

describe('serialization and the exception boundary', () => {
  it('serializes to plain data with code, category, message and details', () => {
    const snapshot: DomainErrorSnapshot = new TestError('closed.', {
      category: ErrorCategory.STATE_VIOLATION,
      details: [
        { code: 'PERIOD_CLOSED', message: 'The period is closed.', field: 'accountingDate' },
      ],
    }).toJSON();

    expect(snapshot).toEqual({
      code: 'TEST_FAILURE',
      category: 'STATE_VIOLATION',
      message: 'closed.',
      details: [
        { code: 'PERIOD_CLOSED', message: 'The period is closed.', field: 'accountingDate' },
      ],
    });
    expect(JSON.parse(JSON.stringify(snapshot))).toEqual(snapshot);
  });

  it('keeps an internal cause out of the serialized shape', () => {
    const cause = new Error('connect ECONNREFUSED 10.0.0.5:3306');
    const error = new TestError('Storage is unavailable.', { cause });

    expect(error.cause).toBe(cause);
    expect(JSON.stringify(error)).not.toContain('ECONNREFUSED');
    expect(JSON.stringify(error)).not.toContain('10.0.0.5');
    expect(error.toJSON()).not.toHaveProperty('cause');
  });

  it('is an expected failure, not a technical exception, and never carries a stack in its data', () => {
    const error = new TestError('declined.');

    expect(error).toBeInstanceOf(DomainError);
    expect(error).not.toBeInstanceOf(InvalidPrimitiveError);
    expect(JSON.stringify(error)).not.toContain('at ');
    expect(error.stack).toBeDefined();
  });

  it('is frozen so a raised error cannot be rewritten', () => {
    const error = new TestError('frozen.');

    expect(Object.isFrozen(error)).toBe(true);
    expect(() => {
      (error as unknown as Record<string, string>).code = 'HACKED';
    }).toThrow();
    expect(error.code).toBe('TEST_FAILURE');
  });
});
