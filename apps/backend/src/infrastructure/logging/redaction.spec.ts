import { describe, expect, it } from 'vitest';

import { SecretRedactor } from '../config/secrets.js';
import { redactText, sanitizeValue } from './redaction.js';

const SECRET = 'super-secret-value';
const secrets = new SecretRedactor([SECRET]);

describe('log redaction (FND-011)', () => {
  it('replaces a known secret in a string', () => {
    expect(redactText(`token=${SECRET}`, secrets)).toBe('token=[redacted]');
  });

  it('redacts a secret nested in an object or an array', () => {
    const sanitized = sanitizeValue({ a: { b: [SECRET, 'safe'] } }, secrets);

    expect(JSON.stringify(sanitized)).not.toContain(SECRET);
    expect(sanitized).toEqual({ a: { b: ['[redacted]', 'safe'] } });
  });

  it('reduces a Date to ISO and an Error to name and message', () => {
    const sanitized = sanitizeValue(
      { at: new Date('2026-10-13T09:22:34.673Z'), error: new Error(`boom ${SECRET}`) },
      secrets,
    );

    expect(sanitized).toEqual({
      at: '2026-10-13T09:22:34.673Z',
      error: { name: 'Error', message: 'boom [redacted]' },
    });
  });

  it('cuts a cyclic structure instead of throwing', () => {
    const cyclic: Record<string, unknown> = { name: 'root' };
    cyclic['self'] = cyclic;

    expect(() => sanitizeValue(cyclic, secrets)).not.toThrow();
    expect(JSON.stringify(sanitizeValue(cyclic, secrets))).toContain('[circular]');
  });

  it('cuts a structure deeper than the limit', () => {
    let deep: unknown = 'leaf';
    for (let index = 0; index < 10; index += 1) {
      deep = { next: deep };
    }

    expect(JSON.stringify(sanitizeValue(deep, secrets))).toContain('[too deep]');
  });

  it('drops a function or a symbol instead of serializing it', () => {
    expect(sanitizeValue({ fn: () => undefined, sym: Symbol('x') }, secrets)).toEqual({
      fn: '[unsupported]',
      sym: '[unsupported]',
    });
  });

  it('does not redact a secret shorter than the redactor minimum', () => {
    const short = new SecretRedactor(['abc']);

    expect(redactText('abc', short)).toBe('abc');
  });
});
