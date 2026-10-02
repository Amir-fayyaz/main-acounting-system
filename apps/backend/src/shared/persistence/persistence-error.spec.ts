import { describe, expect, it } from 'vitest';

import { ErrorCategory } from '../errors/error-category.js';
import { InvalidPrimitiveError } from '../primitives/invalid-primitive-error.js';
import {
  isPersistenceFailureKind,
  PersistenceError,
  PersistenceFailureKind,
} from './persistence-error.js';

/** What a driver failure looked like before an adapter translated it. */
const DRIVER_TEXT =
  "Error: ER_LOCK_WAIT_TIMEOUT: Lock wait timeout exceeded; SQLSTATE [HY000] — SELECT * FROM accounting_lines WHERE document_id = '...'";

describe('PersistenceError policy per kind', () => {
  it.each([
    [PersistenceFailureKind.UNAVAILABLE, true, true],
    [PersistenceFailureKind.CONFLICT, false, true],
    [PersistenceFailureKind.REJECTED, false, true],
    [PersistenceFailureKind.TIMEOUT, false, false],
    [PersistenceFailureKind.UNKNOWN, false, false],
  ])('classifies %s as retryable=%s, outcomeKnown=%s', (kind, retryable, outcomeKnown) => {
    const error = new PersistenceError(kind, 'AccountingDocuments.update');

    expect(error.retryable).toBe(retryable);
    expect(error.outcomeKnown).toBe(outcomeKnown);
  });

  it('retries only the failure that provably attempted nothing (ADR-004, section 12)', () => {
    const unreachable = new PersistenceError(
      PersistenceFailureKind.UNAVAILABLE,
      'AccountingDocuments.get',
    );
    const timedOut = new PersistenceError(
      PersistenceFailureKind.TIMEOUT,
      'AccountingDocuments.add',
    );

    expect(unreachable.retryable).toBe(true);
    // An unknown outcome must be verified before it is repeated: a blind retry
    // could duplicate a business effect (ADR-004, sections 13 and 31).
    expect(timedOut.retryable).toBe(false);
    expect(timedOut.outcomeKnown).toBe(false);
  });
});

describe('PersistenceError construction', () => {
  it('names the position where the failure happened', () => {
    const error = new PersistenceError(PersistenceFailureKind.CONFLICT, 'SalesInvoices.update');

    expect(error.name).toBe('PersistenceError');
    expect(error.operation).toBe('SalesInvoices.update');
    expect(error.message).toBe('SalesInvoices.update failed (CONFLICT)');
    expect(error).toBeInstanceOf(Error);
  });

  it('keeps the original failure as its cause, for diagnosis only', () => {
    const cause = new Error(DRIVER_TEXT);
    const error = new PersistenceError(PersistenceFailureKind.TIMEOUT, 'Payments.add', { cause });

    expect(error.cause).toBe(cause);
    expect(Object.isFrozen(error)).toBe(true);
  });

  it('rejects an unclassified kind at runtime', () => {
    expect(
      () => new PersistenceError('DEADLOCK' as PersistenceFailureKind, 'Payments.add'),
    ).toThrow(InvalidPrimitiveError);
    expect(
      () => new PersistenceError('DEADLOCK' as PersistenceFailureKind, 'Payments.add'),
    ).toThrow(
      'PersistenceError: kind must be one of CONFLICT, UNAVAILABLE, TIMEOUT, REJECTED, UNKNOWN',
    );
  });

  it.each([
    ['an empty operation', '', 'PersistenceError: operation must not be blank'],
    [
      'an operation with a space',
      'select rows',
      'PersistenceError: operation must be a short operation name',
    ],
    [
      'an operation that smuggles a query',
      'AccountingDocuments.get; SELECT * FROM accounts',
      'PersistenceError: operation must be a short operation name',
    ],
  ])('rejects %s so no query can reach an error message', (_label, operation, message) => {
    expect(() => new PersistenceError(PersistenceFailureKind.REJECTED, operation)).toThrow(
      InvalidPrimitiveError,
    );
    expect(() => new PersistenceError(PersistenceFailureKind.REJECTED, operation)).toThrow(message);
  });
});

describe('PersistenceError.toJSON', () => {
  it('is plain, serializable data about the failure', () => {
    const error = new PersistenceError(PersistenceFailureKind.UNAVAILABLE, 'Ledger.get');

    expect(error.toJSON()).toEqual({
      kind: PersistenceFailureKind.UNAVAILABLE,
      operation: 'Ledger.get',
      retryable: true,
      outcomeKnown: true,
      message: 'Ledger.get failed (UNAVAILABLE)',
    });
    expect(JSON.parse(JSON.stringify(error))).toEqual(error.toJSON());
  });

  it('excludes the cause, where the driver text lives', () => {
    const error = new PersistenceError(PersistenceFailureKind.UNKNOWN, 'Ledger.add', {
      cause: new Error(DRIVER_TEXT),
    });

    const snapshot = JSON.stringify(error.toJSON());
    expect(snapshot).not.toContain('SELECT');
    expect(snapshot).not.toContain('accounting_lines');
    expect(snapshot).not.toContain('HY000');
  });
});

describe('PersistenceError.toDomainError', () => {
  it('turns a lost race into the shared conflict the caller can act on', () => {
    const error = new PersistenceError(PersistenceFailureKind.CONFLICT, 'SalesInvoices.update', {
      cause: new Error(DRIVER_TEXT),
    });
    const domainError = error.toDomainError();

    expect(domainError).toBeDefined();
    expect(domainError?.category).toBe(ErrorCategory.CONFLICT);
    expect(domainError?.message).toBe(
      'The record was changed by someone else. Reload it and try again.',
    );
    // The client-safe failure carries no operation name, no driver text and no cause.
    expect(JSON.stringify(domainError?.toJSON())).not.toContain('SalesInvoices');
    expect(domainError?.toJSON()).not.toHaveProperty('cause');
  });

  it.each([
    PersistenceFailureKind.UNAVAILABLE,
    PersistenceFailureKind.TIMEOUT,
    PersistenceFailureKind.REJECTED,
    PersistenceFailureKind.UNKNOWN,
  ])('leaves %s technical — there is no client decision to make', (kind) => {
    expect(new PersistenceError(kind, 'Ledger.add').toDomainError()).toBeUndefined();
  });
});

describe('isPersistenceFailureKind', () => {
  it('accepts every member of the vocabulary', () => {
    for (const kind of Object.values(PersistenceFailureKind)) {
      expect(isPersistenceFailureKind(kind)).toBe(true);
    }
  });

  it('refuses anything else', () => {
    expect(isPersistenceFailureKind('DEADLOCK')).toBe(false);
    expect(isPersistenceFailureKind(undefined)).toBe(false);
    expect(isPersistenceFailureKind(42)).toBe(false);
  });
});
