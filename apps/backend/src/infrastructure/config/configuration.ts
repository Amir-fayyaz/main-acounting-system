import type { Configuration, LogLevel, RuntimeEnvironment } from './configuration.types.js';

/**
 * Reads, validates and groups raw environment values into the typed
 * configuration (FND-003).
 *
 * Rules implemented here:
 *
 * - Every environment variable enters the process through this boundary; no
 *   other file may read `process.env` (enforced by the `no-restricted-properties`
 *   rule in `eslint.config.mjs`).
 * - Validation is fail-fast and collects **all** problems before throwing, so a
 *   developer fixes one round of errors instead of restarting per field
 *   (Engineering Principles, rule 5).
 * - Error messages name the offending variable and the expected shape, never a
 *   value: a validation failure must not print a secret (06-security-engineering).
 * - Defaults exist only for non-secret, safe-to-default values; credentials are
 *   never defaulted in source code and are mandatory in `production`.
 */

export class ConfigurationValidationError extends Error {
  public readonly problems: readonly string[];

  constructor(problems: readonly string[]) {
    super(`Invalid application configuration:\n- ${problems.join('\n- ')}`);
    this.name = 'ConfigurationValidationError';
    this.problems = problems;
  }
}

/** Raw values as they arrive from the process environment or a `.env` file. */
type RawConfiguration = Readonly<Record<string, unknown>>;

const SUPPORTED_ENVIRONMENTS: readonly RuntimeEnvironment[] = ['development', 'test', 'production'];

const SUPPORTED_LOG_LEVELS: readonly LogLevel[] = ['debug', 'info', 'warn', 'error'];

const DEFAULT_ENVIRONMENT: RuntimeEnvironment = 'development';
const DEFAULT_SERVICE_NAME = 'backend';
const DEFAULT_HTTP_HOST = '0.0.0.0';
const DEFAULT_HTTP_PORT = 3000;
const DEFAULT_API_PREFIX = '/api';
const DEFAULT_DATABASE_HOST = '127.0.0.1';
const DEFAULT_DATABASE_PORT = 3306;
const DEFAULT_DATABASE_NAME = 'accounting';
const DEFAULT_DATABASE_USER = 'accounting';
const DEFAULT_REDIS_HOST = '127.0.0.1';
const DEFAULT_REDIS_PORT = 6379;
const DEFAULT_STORAGE_ENDPOINT = '127.0.0.1';
const DEFAULT_STORAGE_PORT = 9000;
const DEFAULT_STORAGE_BUCKET = 'accounting-local';
const DEFAULT_LOG_LEVEL: LogLevel = 'info';
const DEFAULT_JOBS_CONCURRENCY = 4;
const DEFAULT_JOBS_MAX_ATTEMPTS = 3;
const DEFAULT_RETRY_BASE_DELAY_MS = 1000;
const DEFAULT_RETRY_MAX_DELAY_MS = 30000;
const DEFAULT_SCHEDULER_INTERVAL_MS = 1000;

/** Credentials. Required in production; reported by their consumer elsewhere. */
const SECRET_KEYS = ['MYSQL_PASSWORD', 'MINIO_ACCESS_KEY', 'MINIO_SECRET_KEY'] as const;

function readText(raw: RawConfiguration, key: string, fallback?: string): string | undefined {
  const value = raw[key];

  if (value === undefined || value === null || value === '') {
    return fallback;
  }

  if (typeof value !== 'string') {
    // The value itself is never echoed: it may be a secret.
    throw new ConfigurationValidationError([`${key} must be a text value`]);
  }

  return value;
}

function readPort(
  raw: RawConfiguration,
  key: string,
  fallback: number,
  problems: string[],
): number {
  const value = readText(raw, key);

  if (value === undefined) {
    return fallback;
  }

  const port = Number(value);

  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    problems.push(`${key} must be an integer between 1 and 65535`);
    return fallback;
  }

  return port;
}

function readPositiveInteger(
  raw: RawConfiguration,
  key: string,
  fallback: number,
  problems: string[],
): number {
  const value = readText(raw, key);

  if (value === undefined) {
    return fallback;
  }

  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed < 1) {
    problems.push(`${key} must be an integer greater than or equal to 1`);
    return fallback;
  }

  return parsed;
}

function readBoolean(
  raw: RawConfiguration,
  key: string,
  fallback: boolean,
  problems: string[],
): boolean {
  const value = readText(raw, key);

  if (value === undefined) {
    return fallback;
  }

  if (value === 'true' || value === '1') {
    return true;
  }

  if (value === 'false' || value === '0') {
    return false;
  }

  problems.push(`${key} must be "true" or "false"`);
  return fallback;
}

function readEnum<T extends string>(
  raw: RawConfiguration,
  key: string,
  allowed: readonly T[],
  fallback: T,
  problems: string[],
): T {
  const value = readText(raw, key, fallback);

  if (value === undefined || !allowed.includes(value as T)) {
    problems.push(`${key} must be one of: ${allowed.join(', ')}`);
    return fallback;
  }

  return value as T;
}

function readEnvironmentName(raw: RawConfiguration, problems: string[]): RuntimeEnvironment {
  // Jest/Vitest set NODE_ENV=test automatically; anything unknown is rejected
  // instead of being silently downgraded to a development configuration.
  return readEnum(raw, 'NODE_ENV', SUPPORTED_ENVIRONMENTS, DEFAULT_ENVIRONMENT, problems);
}

function readApiPrefix(raw: RawConfiguration, problems: string[]): string {
  const value = readText(raw, 'BACKEND_API_PREFIX', DEFAULT_API_PREFIX) ?? DEFAULT_API_PREFIX;

  if (!value.startsWith('/')) {
    problems.push('BACKEND_API_PREFIX must start with "/"');
    return DEFAULT_API_PREFIX;
  }

  return value.endsWith('/') ? value.slice(0, -1) : value;
}

/**
 * Validates raw values and returns the immutable, typed configuration.
 *
 * Throws `ConfigurationValidationError` instead of falling back silently: a
 * process that starts with an unknown configuration is worse than a process that
 * refuses to start.
 */
export function loadConfiguration(raw: RawConfiguration = process.env): Configuration {
  const problems: string[] = [];

  const environmentName = readEnvironmentName(raw, problems);

  // Credentials are mandatory in production only. In development and test their
  // absence is reported by the dependency that needs them (readiness, connection
  // errors) so a fresh checkout can start without a configured infrastructure.
  if (environmentName === 'production') {
    for (const key of SECRET_KEYS) {
      if (!readText(raw, key)) {
        problems.push(`${key} is required when NODE_ENV=production`);
      }
    }
  }

  const configuration: Configuration = {
    environment: {
      name: environmentName,
      isDevelopment: environmentName === 'development',
      isTest: environmentName === 'test',
      isProduction: environmentName === 'production',
    },
    runtime: {
      serviceName: readText(raw, 'SERVICE_NAME', DEFAULT_SERVICE_NAME) ?? DEFAULT_SERVICE_NAME,
    },
    http: {
      host: readText(raw, 'BACKEND_HOST', DEFAULT_HTTP_HOST) ?? DEFAULT_HTTP_HOST,
      port: readPort(raw, 'BACKEND_PORT', DEFAULT_HTTP_PORT, problems),
      apiPrefix: readApiPrefix(raw, problems),
    },
    database: {
      host: readText(raw, 'MYSQL_HOST', DEFAULT_DATABASE_HOST) ?? DEFAULT_DATABASE_HOST,
      port: readPort(raw, 'MYSQL_PORT', DEFAULT_DATABASE_PORT, problems),
      name: readText(raw, 'MYSQL_DATABASE', DEFAULT_DATABASE_NAME) ?? DEFAULT_DATABASE_NAME,
      user: readText(raw, 'MYSQL_USER', DEFAULT_DATABASE_USER) ?? DEFAULT_DATABASE_USER,
      password: readText(raw, 'MYSQL_PASSWORD') ?? '',
    },
    redis: {
      host: readText(raw, 'REDIS_HOST', DEFAULT_REDIS_HOST) ?? DEFAULT_REDIS_HOST,
      port: readPort(raw, 'REDIS_PORT', DEFAULT_REDIS_PORT, problems),
    },
    storage: {
      endpoint:
        readText(raw, 'MINIO_ENDPOINT', DEFAULT_STORAGE_ENDPOINT) ?? DEFAULT_STORAGE_ENDPOINT,
      port: readPort(raw, 'MINIO_PORT', DEFAULT_STORAGE_PORT, problems),
      useSsl: readBoolean(raw, 'MINIO_USE_SSL', false, problems),
      accessKey: readText(raw, 'MINIO_ACCESS_KEY') ?? '',
      secretKey: readText(raw, 'MINIO_SECRET_KEY') ?? '',
      bucket: readText(raw, 'MINIO_BUCKET', DEFAULT_STORAGE_BUCKET) ?? DEFAULT_STORAGE_BUCKET,
    },
    logging: {
      level: readEnum(raw, 'LOG_LEVEL', SUPPORTED_LOG_LEVELS, DEFAULT_LOG_LEVEL, problems),
    },
    jobs: {
      concurrency: readPositiveInteger(
        raw,
        'WORKER_CONCURRENCY',
        DEFAULT_JOBS_CONCURRENCY,
        problems,
      ),
      maxAttempts: readPositiveInteger(
        raw,
        'WORKER_MAX_ATTEMPTS',
        DEFAULT_JOBS_MAX_ATTEMPTS,
        problems,
      ),
      retryBaseDelayMs: readPositiveInteger(
        raw,
        'WORKER_RETRY_BASE_DELAY_MS',
        DEFAULT_RETRY_BASE_DELAY_MS,
        problems,
      ),
      retryMaxDelayMs: readPositiveInteger(
        raw,
        'WORKER_RETRY_MAX_DELAY_MS',
        DEFAULT_RETRY_MAX_DELAY_MS,
        problems,
      ),
    },
    scheduler: {
      intervalMs: readPositiveInteger(
        raw,
        'SCHEDULER_INTERVAL_MS',
        DEFAULT_SCHEDULER_INTERVAL_MS,
        problems,
      ),
    },
  };

  // Cross-field check: a base delay above the ceiling would make the bounded
  // backoff climb past its own limit. Checked after the reads so every other
  // problem is still reported in the same round.
  if (configuration.jobs.retryBaseDelayMs > configuration.jobs.retryMaxDelayMs) {
    problems.push('WORKER_RETRY_BASE_DELAY_MS must not be greater than WORKER_RETRY_MAX_DELAY_MS');
  }

  if (problems.length > 0) {
    throw new ConfigurationValidationError(problems);
  }

  return configuration;
}
