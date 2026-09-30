import { InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { DomainError } from '../../../shared/errors/domain-error.js';
import { ApiErrorException } from './api-error.exception.js';
import { mapException } from './api-error.mapper.js';

class PeriodAlreadyClosedError extends DomainError {
  constructor() {
    super('PERIOD_ALREADY_CLOSED', 'The accounting period is already closed.');
  }
}

describe('mapException', () => {
  it('classifies a DomainError as a domain failure and keeps its own code', () => {
    expect(mapException(new PeriodAlreadyClosedError())).toEqual({
      status: 422,
      code: 'PERIOD_ALREADY_CLOSED',
      category: 'domain',
      message: 'The accounting period is already closed.',
    });
  });

  it('carries the code, category and details of an ApiErrorException', () => {
    const mapped = mapException(
      ApiErrorException.validation([{ field: 'page', code: 'min', message: 'page is too small' }]),
    );

    expect(mapped).toEqual({
      status: 400,
      code: 'VALIDATION_FAILED',
      category: 'validation',
      message: 'The request contains invalid values.',
      details: [{ field: 'page', code: 'min', message: 'page is too small' }],
    });
  });

  it('keeps the client-facing message of a 4xx framework exception', () => {
    expect(mapException(new NotFoundException('Example was not found.'))).toEqual({
      status: 404,
      code: 'NOT_FOUND',
      category: 'client',
      message: 'Example was not found.',
    });
  });

  it('never exposes the message of a 5xx exception', () => {
    const mapped = mapException(new InternalServerErrorException('database dsn leaked'));

    expect(mapped).toEqual({
      status: 500,
      code: 'INTERNAL_ERROR',
      category: 'technical',
      message: 'An unexpected error occurred.',
    });
    expect(JSON.stringify(mapped)).not.toContain('dsn');
  });

  it('maps an unexpected Error to a generic internal error', () => {
    const mapped = mapException(new Error('connect ECONNREFUSED 10.0.0.5:3306'));

    expect(mapped.status).toBe(500);
    expect(mapped.code).toBe('INTERNAL_ERROR');
    expect(JSON.stringify(mapped)).not.toContain('10.0.0.5');
  });

  it('maps a non-Error throw to a generic internal error', () => {
    expect(mapException('boom')).toMatchObject({
      status: 500,
      code: 'INTERNAL_ERROR',
      category: 'technical',
    });
  });
});
