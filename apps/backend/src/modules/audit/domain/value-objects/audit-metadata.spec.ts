import { describe, expect, it } from 'vitest';

import {
  AUDIT_METADATA_MAX_DEPTH,
  AUDIT_REDACTION_MARKER,
  AUDIT_TRUNCATION_MARKER,
  isSensitiveAuditKey,
  sanitizeAuditMetadata,
} from './audit-metadata.js';

/**
 * The sanitizer that keeps credential material out of the audit trail (AUD-001;
 * ADR-010 section 6; ADR-015 section 12).
 *
 * An audit record is durable, widely readable security data, so the rule this
 * spec pins is a security property rather than a formatting preference: a
 * password, a token, a digest, a key or an authorization header handed to a
 * record — at any depth, under any spelling, in an object or in an array — must
 * not survive sanitization.
 */

describe('sanitizeAuditMetadata — credential material never survives', () => {
  it.each([
    'password',
    'passwordHash',
    'password_hash',
    'newPassword',
    'access_token',
    'refreshToken',
    'token',
    'secret',
    'clientSecret',
    'credential',
    'apiKey',
    'api-key',
    'privateKey',
    'authorization',
    'Authorization',
    'cookie',
    'sessionSecret',
    'passwordSalt',
    'connectionString',
    'dsn',
  ])('redacts the value of %s', (key) => {
    const sanitized = sanitizeAuditMetadata({ [key]: 'super-secret-value' });

    expect(sanitized[key]).toBe(AUDIT_REDACTION_MARKER);
    expect(JSON.stringify(sanitized)).not.toContain('super-secret-value');
  });

  it('redacts at every depth, in objects and in arrays', () => {
    const sanitized = sanitizeAuditMetadata({
      attempt: { presented: { token: 'the-token' } },
      attempts: [{ password: 'hunter2' }, { reason: 'INVALID_SECRET' }],
    });

    expect(JSON.stringify(sanitized)).not.toContain('the-token');
    expect(JSON.stringify(sanitized)).not.toContain('hunter2');
    expect(sanitized).toEqual({
      attempt: { presented: { token: AUDIT_REDACTION_MARKER } },
      attempts: [{ password: AUDIT_REDACTION_MARKER }, { reason: 'INVALID_SECRET' }],
    });
  });

  it('redacts a whole subtree when its own key names credential material', () => {
    // Broader than strictly necessary, and deliberately so: the value under
    // `credentials` is credential material whatever it is shaped like.
    const sanitized = sanitizeAuditMetadata({ credentials: { token: 'the-token', hash: 'h' } });

    expect(sanitized.credentials).toBe(AUDIT_REDACTION_MARKER);
    expect(JSON.stringify(sanitized)).not.toContain('the-token');
  });

  it('keeps a redacted key in place rather than dropping it', () => {
    // A reader must be able to tell "a value was removed" from "there was no
    // value", so the key stays and only the value is replaced.
    const sanitized = sanitizeAuditMetadata({ token: 'x', reason: 'EXPIRED' });

    expect(Object.keys(sanitized)).toEqual(['token', 'reason']);
  });

  it('recognizes a sensitive key whatever its separators or case are', () => {
    expect(isSensitiveAuditKey('accessToken')).toBe(true);
    expect(isSensitiveAuditKey('ACCESS-TOKEN')).toBe(true);
    expect(isSensitiveAuditKey('access token')).toBe(true);
    expect(isSensitiveAuditKey('reason')).toBe(false);
  });
});

describe('sanitizeAuditMetadata — only data is kept', () => {
  it('keeps the JSON-safe primitives and an instant as its ISO text', () => {
    const sanitized = sanitizeAuditMetadata({
      text: 'value',
      count: 3,
      flag: true,
      nothing: null,
      at: new Date('2026-10-16T09:00:00.000Z'),
    });

    expect(sanitized).toEqual({
      text: 'value',
      count: 3,
      flag: true,
      nothing: null,
      at: '2026-10-16T09:00:00.000Z',
    });
  });

  it('drops values that have no data form instead of coercing them', () => {
    const sanitized = sanitizeAuditMetadata({
      fn: () => 'nope',
      symbol: Symbol('nope'),
      big: 10n,
      missing: undefined,
      infinite: Number.POSITIVE_INFINITY,
      nan: Number.NaN,
      instance: new (class Secretive {
        public readonly hidden = 'internal';
      })(),
      map: new Map([['a', 1]]),
      kept: 'still here',
    });

    expect(sanitized).toEqual({ kept: 'still here' });
  });

  it('drops an invalid Date', () => {
    expect(sanitizeAuditMetadata({ at: new Date('not a date') })).toEqual({});
  });

  it('truncates context nested deeper than the bound', () => {
    const deeper = { a: { b: { c: { d: { e: 'too deep' } } } } };

    const sanitized = sanitizeAuditMetadata(deeper);

    expect(JSON.stringify(sanitized)).not.toContain('too deep');
    expect(JSON.stringify(sanitized)).toContain(AUDIT_TRUNCATION_MARKER);
    expect(AUDIT_METADATA_MAX_DEPTH).toBe(4);
  });

  it('freezes the result deeply, so a stored fact cannot be edited', () => {
    const sanitized = sanitizeAuditMetadata({ nested: { value: 'original' } });

    expect(Object.isFrozen(sanitized)).toBe(true);
    expect(Object.isFrozen(sanitized.nested)).toBe(true);
    expect(Reflect.set(sanitized, 'nested', 'changed')).toBe(false);
  });

  it.each([undefined, null, 'a string', 42, [], new Date()])(
    'answers an empty context for a non-object input',
    (input) => {
      expect(sanitizeAuditMetadata(input)).toEqual({});
    },
  );
});
