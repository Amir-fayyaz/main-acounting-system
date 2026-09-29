/**
 * Secret handling helpers (FND-003, ADR-010 section 6, 06-security-engineering).
 *
 * Two rules are implemented here:
 *
 * 1. Secrets only enter the process through the configuration layer (the values
 *    are read from raw environment values, never from literals in source code).
 * 2. Once loaded, a secret must not reappear in logs, exceptions or health
 *    responses — every message that leaves the process goes through a redactor
 *    built from the values this process actually holds.
 */

/**
 * Environment variables that carry credentials. Kept as an explicit list so a
 * new secret is a deliberate change instead of an accident.
 */
export const SECRET_ENVIRONMENT_KEYS = [
  'MYSQL_PASSWORD',
  'MYSQL_ROOT_PASSWORD',
  'MINIO_ACCESS_KEY',
  'MINIO_SECRET_KEY',
] as const;

/**
 * Values shorter than this are not redacted: replacing every two-character
 * sequence would mangle unrelated text far more than it protects anything.
 * Credentials below this length are a configuration problem of their own.
 */
const MINIMUM_REDACTABLE_LENGTH = 6;

const REDACTED = '[redacted]';

export interface SecretHolder {
  /** Replaces every occurrence of a known secret in `text`. */
  redact(text: string): string;
}

/** A `SecretHolder` that redacts nothing; used when no secret is configured. */
export const NO_REDACTION: SecretHolder = { redact: (text) => text };

function isRedactable(value: string): boolean {
  return value.length >= MINIMUM_REDACTABLE_LENGTH;
}

export class SecretRedactor implements SecretHolder {
  private readonly values: readonly string[];

  constructor(values: readonly string[]) {
    // Longest first, so an overlapping secret cannot leave a fragment behind.
    this.values = [...new Set(values.filter(isRedactable))].sort(
      (left, right) => right.length - left.length,
    );
  }

  redact(text: string): string {
    return this.values.reduce((result, value) => result.split(value).join(REDACTED), text);
  }
}

/** Collects the secret values present in raw environment values. */
export function collectSecretValues(raw: Readonly<Record<string, unknown>>): readonly string[] {
  const values: string[] = [];

  for (const key of SECRET_ENVIRONMENT_KEYS) {
    const value = raw[key];

    if (typeof value === 'string' && value.length > 0) {
      values.push(value);
    }
  }

  return values;
}

/** Builds the redactor for a process from the raw values it was started with. */
export function createSecretRedactor(raw: Readonly<Record<string, unknown>>): SecretRedactor {
  return new SecretRedactor(collectSecretValues(raw));
}

/**
 * Redacts secrets held by this process environment.
 *
 * Used at the process boundary (`main.ts`), before dependency injection exists,
 * so a startup failure is reported without leaking credentials.
 */
export function redactProcessSecrets(text: string): string {
  return createSecretRedactor(process.env).redact(text);
}
