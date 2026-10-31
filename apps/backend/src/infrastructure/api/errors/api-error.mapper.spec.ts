import { InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { DomainError } from '../../../shared/errors/domain-error.js';
import { ErrorCategory } from '../../../shared/errors/error-category.js';
import {
  TenantContextMissingError,
  TenantIsolationViolationError,
} from '../../../shared/tenant/tenant.errors.js';
import { ApiErrorException } from './api-error.exception.js';
import { mapException } from './api-error.mapper.js';

class PeriodAlreadyClosedError extends DomainError {
  constructor() {
    super('PERIOD_ALREADY_CLOSED', 'The accounting period is already closed.');
  }
}

/** Representative fiscal failures: the module's codes, the shared categories. */
class FiscalYearOverlapError extends DomainError {
  constructor() {
    super('FISCAL_YEAR_OVERLAP', 'A fiscal year already covers that range.', {
      category: ErrorCategory.CONFLICT,
    });
  }
}

class FiscalPeriodNotFoundError extends DomainError {
  constructor() {
    super('FISCAL_PERIOD_NOT_FOUND', 'No fiscal period with that identity exists.', {
      category: ErrorCategory.NOT_FOUND,
    });
  }
}

class PeriodStateInvalidError extends DomainError {
  constructor() {
    super('PERIOD_STATE_INVALID', 'The fiscal period is in an invalid state.', {
      category: ErrorCategory.CONFLICT,
    });
  }
}

class ReopenReasonRequiredError extends DomainError {
  constructor() {
    super('REOPEN_REASON_REQUIRED', 'A non-empty reason is required to reopen.', {
      category: ErrorCategory.VALIDATION,
    });
  }
}

class FiscalPeriodNotOpenError extends DomainError {
  constructor() {
    super('FISCAL_PERIOD_NOT_OPEN', 'Only an open period can be the active one.', {
      category: ErrorCategory.STATE_VIOLATION,
    });
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

  it('answers each fiscal failure with its category status and its own code (doc 13)', () => {
    // A conflict is 409 — not the generic 422 a DomainError used to default to.
    expect(mapException(new FiscalYearOverlapError())).toEqual({
      status: 409,
      code: 'FISCAL_YEAR_OVERLAP',
      category: 'domain',
      message: 'A fiscal year already covers that range.',
    });
    expect(mapException(new PeriodStateInvalidError())).toMatchObject({
      status: 409,
      code: 'PERIOD_STATE_INVALID',
    });

    // A missing resource is 404, with the module's code, not a generic NOT_FOUND.
    expect(mapException(new FiscalPeriodNotFoundError())).toMatchObject({
      status: 404,
      code: 'FISCAL_PERIOD_NOT_FOUND',
    });

    // Rejected input is 400 — the code the two hard-coded branches used to carry.
    expect(mapException(new ReopenReasonRequiredError())).toMatchObject({
      status: 400,
      code: 'REOPEN_REASON_REQUIRED',
    });

    // A lifecycle violation stays 422.
    expect(mapException(new FiscalPeriodNotOpenError())).toMatchObject({
      status: 422,
      code: 'FISCAL_PERIOD_NOT_OPEN',
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

describe('mapException — TENANT_REQUIRED (TNT-002)', () => {
  it('maps TenantContextMissingError (missing) to TENANT_REQUIRED 400', () => {
    expect(mapException(new TenantContextMissingError('missing'))).toEqual({
      status: 400,
      code: 'TENANT_REQUIRED',
      category: 'client',
      message: 'A tenant context is required for this operation.',
    });
  });

  it('maps TenantContextMissingError (system) to TENANT_REQUIRED 400', () => {
    expect(mapException(new TenantContextMissingError('system'))).toMatchObject({
      status: 400,
      code: 'TENANT_REQUIRED',
      category: 'client',
    });
  });
});

describe('mapException — tenant isolation (IAM-007)', () => {
  it('maps a cross-tenant attempt to a generic FORBIDDEN 403', () => {
    const mapped = mapException(new TenantIsolationViolationError('MembershipRepository.update'));

    expect(mapped).toEqual({
      status: 403,
      code: 'FORBIDDEN',
      category: 'client',
      message: 'The request is not allowed.',
    });
    // The server-side position stays server-side.
    expect(JSON.stringify(mapped)).not.toContain('MembershipRepository');
  });
});
