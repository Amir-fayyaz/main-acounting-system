import { describe, expect, it } from 'vitest';

import { ConflictError } from '../errors/category-errors.js';
import { Revision } from './revision.js';
import {
  isStaleRevision,
  STALE_REVISION_DETAIL_CODE,
  staleRevision,
  staleRevisionDetail,
} from './stale-revision.js';

/**
 * Contract tests for the stale-update cause (SHR-008).
 *
 * The cause is the only part of the mechanism that travels: it rides on the
 * `PersistenceError` an adapter raises, is read back by the application, and
 * becomes an `ErrorDetail` a client may see. So the guard has to be strict
 * about what it accepts — a malformed cause must never be reported to a caller
 * as a conflict it can act on — and the detail has to stay free of anything a
 * driver could have left behind.
 */

const expected = Revision.of(10);
const actual = Revision.of(11);

describe('staleRevision — the cause as data', () => {
  it('records the revision the writer expected and the one actually stored', () => {
    expect(staleRevision(expected, actual)).toEqual({ expected: 10, actual: 11 });
  });

  it('records an unknown current revision as unknown rather than guessing', () => {
    expect(staleRevision(expected)).toEqual({ expected: 10, actual: undefined });
    expect('actual' in staleRevision(expected)).toBe(true);
  });

  it('is inert: frozen, serializable and carrying nothing but numbers', () => {
    const cause = staleRevision(expected, actual);

    expect(Object.isFrozen(cause)).toBe(true);
    expect(JSON.parse(JSON.stringify(cause))).toEqual({ expected: 10, actual: 11 });
    expect(JSON.stringify(cause)).not.toContain('Revision');
  });
});

describe('isStaleRevision — the guard on a cause read back', () => {
  it('accepts a cause the mechanism produced, known or unknown current revision', () => {
    expect(isStaleRevision(staleRevision(expected))).toBe(true);
    expect(isStaleRevision(staleRevision(expected, actual))).toBe(true);
  });

  it.each([
    ['null', null],
    ['a string', '10'],
    ['an array', [10, 11]],
    ['an object without the expected revision', { actual: 11 }],
    ['a non-numeric expected revision', { expected: '10', actual: 11 }],
    ['a zero revision', { expected: 0, actual: 11 }],
    ['a negative revision', { expected: -1 }],
    ['a fractional revision', { expected: 10.5 }],
    ['a non-numeric current revision', { expected: 10, actual: 'eleven' }],
    ['an out-of-range current revision', { expected: 10, actual: 2_147_483_648 }],
    ['a missing value', undefined],
    ['a number', 10],
  ])('refuses %s', (_label, value) => {
    expect(isStaleRevision(value)).toBe(false);
  });
});

describe('staleRevisionDetail — the client-safe reason', () => {
  it('names the code and the field the conflict is about', () => {
    const detail = staleRevisionDetail(staleRevision(expected, actual));

    expect(detail.code).toBe(STALE_REVISION_DETAIL_CODE);
    expect(detail.code).toBe('STALE_REVISION');
    expect(detail.field).toBe('revision');
    expect(detail.expected).toBe(10);
    expect(detail.actual).toBe(11);
    expect(detail.message).toBe(
      'The record is now at revision 11; this update was prepared against revision 10.',
    );
  });

  it('says the current revision could not be read instead of inventing one', () => {
    const detail = staleRevisionDetail(staleRevision(expected));

    expect('actual' in detail).toBe(false);
    expect(detail.message).toBe(
      'The record was written by someone else; this update was prepared against revision 10.',
    );
  });

  it('stays inside the shared error vocabulary: serializable and driver-free', () => {
    const detail = staleRevisionDetail(staleRevision(expected, actual));
    const conflict = new ConflictError('The record was changed by someone else.', [detail]);

    expect(JSON.parse(JSON.stringify(conflict.toJSON().details))).toEqual([
      {
        code: 'STALE_REVISION',
        message: 'The record is now at revision 11; this update was prepared against revision 10.',
        field: 'revision',
        expected: 10,
        actual: 11,
      },
    ]);
    expect(Object.isFrozen(conflict.toJSON().details[0])).toBe(true);
  });
});
