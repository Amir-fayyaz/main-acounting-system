import { describe, expect, it } from 'vitest';
import {
  collectSecretValues,
  createSecretRedactor,
  NO_REDACTION,
  SecretRedactor,
} from './secrets.js';

describe('SecretRedactor', () => {
  it('replaces every occurrence of a configured secret', () => {
    const redactor = new SecretRedactor(['super-secret-value']);

    const message = redactor.redact(
      'Access denied for super-secret-value and again super-secret-value',
    );

    expect(message).toBe('Access denied for [redacted] and again [redacted]');
    expect(message).not.toContain('super-secret-value');
  });

  it('redacts the longest secret first so overlaps leave no fragment', () => {
    const redactor = new SecretRedactor(['secret', 'secret-value']);

    expect(redactor.redact('a secret-value here')).toBe('a [redacted] here');
  });

  it('ignores values too short to redact safely', () => {
    const redactor = new SecretRedactor(['12']);

    expect(redactor.redact('port 12 is open')).toBe('port 12 is open');
  });

  it('leaves unrelated text untouched', () => {
    const redactor = new SecretRedactor([]);

    expect(redactor.redact('database timeout after 3000ms')).toBe('database timeout after 3000ms');
  });
});

describe('collectSecretValues', () => {
  it('collects only the configured secret keys that hold a value', () => {
    const values = collectSecretValues({
      MYSQL_PASSWORD: 'database-password',
      MYSQL_ROOT_PASSWORD: '',
      MINIO_ACCESS_KEY: 'minio-local',
      MINIO_SECRET_KEY: 'minio-secret',
      MYSQL_HOST: 'mysql',
    });

    expect(values).toEqual(['database-password', 'minio-local', 'minio-secret']);
  });

  it('builds a redactor from the process environment', () => {
    const redactor = createSecretRedactor({ MINIO_SECRET_KEY: 'minio-secret' });

    expect(redactor.redact('bad signature minio-secret')).toBe('bad signature [redacted]');
  });
});

describe('NO_REDACTION', () => {
  it('returns the message unchanged', () => {
    expect(NO_REDACTION.redact('anything')).toBe('anything');
  });
});
