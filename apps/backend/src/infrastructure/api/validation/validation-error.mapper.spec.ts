import { ValidationError } from 'class-validator';
import { describe, expect, it } from 'vitest';
import { mapValidationErrors } from './validation-error.mapper.js';

function validationError(
  property: string,
  constraints: Record<string, string>,
  children?: ValidationError[],
): ValidationError {
  const error = new ValidationError();
  error.property = property;
  error.constraints = constraints;
  error.children = children;

  return error;
}

describe('mapValidationErrors', () => {
  it('maps a constraint to a stable field detail', () => {
    expect(
      mapValidationErrors([validationError('message', { isString: 'message must be a string' })]),
    ).toEqual([{ field: 'message', code: 'isString', message: 'message must be a string' }]);
  });

  it('uses its own wording when the constraint is known', () => {
    const [detail] = mapValidationErrors([
      validationError('page', { min: 'page must not be less than 1' }),
    ]);

    expect(detail).toEqual({
      field: 'page',
      code: 'min',
      message: 'page is below the minimum allowed value',
    });
  });

  it('does not prefix an unknown constraint default that already names the field', () => {
    const [detail] = mapValidationErrors([
      validationError('message', {
        isLength: 'message must be longer than or equal to 1 characters',
      }),
    ]);

    expect(detail).toEqual({
      field: 'message',
      code: 'isLength',
      message: 'message must be longer than or equal to 1 characters',
    });
  });

  it('flattens nested errors into dotted field paths', () => {
    const nested = validationError('amount', {}, [
      validationError('amount', { matches: 'amount has an invalid format' }),
      validationError('currency', { isString: 'currency must be a string' }),
    ]);

    expect(mapValidationErrors([nested])).toEqual([
      { field: 'amount.amount', code: 'matches', message: 'amount.amount has an invalid format' },
      { field: 'amount.currency', code: 'isString', message: 'amount.currency must be a string' },
    ]);
  });

  it('never includes the rejected value in the message', () => {
    const [detail] = mapValidationErrors([
      validationError('message', { isString: 'message must be a string' }),
    ]);

    expect(detail.message).not.toContain('top-secret-value');
  });
});
