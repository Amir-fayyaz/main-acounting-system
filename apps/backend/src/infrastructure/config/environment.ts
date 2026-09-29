/**
 * Environment configuration for the backend process.
 *
 * This module is deliberately free of framework concerns: it reads plain values,
 * validates them and returns an immutable, typed configuration object. Technical
 * configuration lives in Infrastructure and must never leak into Domain
 * (ADR-002, section 21).
 */

export type NodeEnvironment = 'development' | 'test' | 'production';

export interface HttpEnvironment {
  readonly host: string;
  readonly port: number;
  readonly apiPrefix: string;
}

export interface DatabaseEnvironment {
  readonly host: string;
  readonly port: number;
  readonly name: string;
  readonly user: string;
  readonly password: string;
}

export interface RedisEnvironment {
  readonly host: string;
  readonly port: number;
}

export interface StorageEnvironment {
  readonly endpoint: string;
  readonly port: number;
  readonly useSsl: boolean;
  readonly accessKey: string;
  readonly secretKey: string;
  readonly bucket: string;
}

export interface Environment {
  readonly nodeEnv: NodeEnvironment;
  readonly http: HttpEnvironment;
  readonly database: DatabaseEnvironment;
  readonly redis: RedisEnvironment;
  readonly storage: StorageEnvironment;
}

const SUPPORTED_NODE_ENVIRONMENTS: readonly NodeEnvironment[] = [
  'development',
  'test',
  'production',
];

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

export class EnvironmentValidationError extends Error {
  public readonly problems: readonly string[];

  constructor(problems: readonly string[]) {
    super(`Invalid environment configuration:\n- ${problems.join('\n- ')}`);
    this.name = 'EnvironmentValidationError';
    this.problems = problems;
  }
}

type RawEnvironment = Readonly<Record<string, unknown>>;

function readText(raw: RawEnvironment, key: string, fallback?: string): string | undefined {
  const value = raw[key];

  if (value === undefined || value === null || value === '') {
    return fallback;
  }

  if (typeof value !== 'string') {
    throw new EnvironmentValidationError([`${key} must be a text value`]);
  }

  return value;
}

function readPort(raw: RawEnvironment, key: string, fallback: number, problems: string[]): number {
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

function readBoolean(
  raw: RawEnvironment,
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

function readNodeEnvironment(raw: RawEnvironment, problems: string[]): NodeEnvironment {
  const value = readText(raw, 'NODE_ENV', 'development');
  const candidate = value ?? 'development';

  // Jest/Vitest set NODE_ENV=test automatically; anything unknown is treated as
  // invalid instead of being silently downgraded to a development configuration.
  if (!SUPPORTED_NODE_ENVIRONMENTS.includes(candidate as NodeEnvironment)) {
    problems.push(`NODE_ENV must be one of: ${SUPPORTED_NODE_ENVIRONMENTS.join(', ')}`);
    return 'development';
  }

  return candidate as NodeEnvironment;
}

function readApiPrefix(raw: RawEnvironment, problems: string[]): string {
  const value = readText(raw, 'BACKEND_API_PREFIX', DEFAULT_API_PREFIX) ?? DEFAULT_API_PREFIX;

  if (!value.startsWith('/')) {
    problems.push('BACKEND_API_PREFIX must start with "/"');
    return DEFAULT_API_PREFIX;
  }

  return value.endsWith('/') ? value.slice(0, -1) : value;
}

/**
 * Validates raw environment values and returns the typed configuration.
 *
 * Throws `EnvironmentValidationError` instead of falling back silently: a backend
 * that starts with an unknown configuration is worse than a backend that refuses
 * to start (Engineering Principles, rule 5).
 *
 * Credentials follow one rule: in `production` they are mandatory, in
 * `development`/`test` their absence is reported by the dependency that needs them
 * (readiness, connection errors) instead of by a process-wide failure. Secrets are
 * never defaulted to a value in source code.
 */
export function loadEnvironment(raw: RawEnvironment = process.env): Environment {
  const problems: string[] = [];

  const nodeEnv = readNodeEnvironment(raw, problems);
  const databasePassword = readText(raw, 'MYSQL_PASSWORD');
  const storageAccessKey = readText(raw, 'MINIO_ACCESS_KEY');
  const storageSecretKey = readText(raw, 'MINIO_SECRET_KEY');

  if (nodeEnv === 'production') {
    if (!databasePassword) {
      problems.push('MYSQL_PASSWORD is required when NODE_ENV=production');
    }
    if (!storageAccessKey || !storageSecretKey) {
      problems.push('MINIO_ACCESS_KEY and MINIO_SECRET_KEY are required when NODE_ENV=production');
    }
  }

  const http: HttpEnvironment = {
    host: readText(raw, 'BACKEND_HOST', DEFAULT_HTTP_HOST) ?? DEFAULT_HTTP_HOST,
    port: readPort(raw, 'BACKEND_PORT', DEFAULT_HTTP_PORT, problems),
    apiPrefix: readApiPrefix(raw, problems),
  };

  const database: DatabaseEnvironment = {
    host: readText(raw, 'MYSQL_HOST', DEFAULT_DATABASE_HOST) ?? DEFAULT_DATABASE_HOST,
    port: readPort(raw, 'MYSQL_PORT', DEFAULT_DATABASE_PORT, problems),
    name: readText(raw, 'MYSQL_DATABASE', DEFAULT_DATABASE_NAME) ?? DEFAULT_DATABASE_NAME,
    user: readText(raw, 'MYSQL_USER', DEFAULT_DATABASE_USER) ?? DEFAULT_DATABASE_USER,
    password: databasePassword ?? '',
  };

  const redis: RedisEnvironment = {
    host: readText(raw, 'REDIS_HOST', DEFAULT_REDIS_HOST) ?? DEFAULT_REDIS_HOST,
    port: readPort(raw, 'REDIS_PORT', DEFAULT_REDIS_PORT, problems),
  };

  const storage: StorageEnvironment = {
    endpoint: readText(raw, 'MINIO_ENDPOINT', DEFAULT_STORAGE_ENDPOINT) ?? DEFAULT_STORAGE_ENDPOINT,
    port: readPort(raw, 'MINIO_PORT', DEFAULT_STORAGE_PORT, problems),
    useSsl: readBoolean(raw, 'MINIO_USE_SSL', false, problems),
    accessKey: storageAccessKey ?? '',
    secretKey: storageSecretKey ?? '',
    bucket: readText(raw, 'MINIO_BUCKET', DEFAULT_STORAGE_BUCKET) ?? DEFAULT_STORAGE_BUCKET,
  };

  if (problems.length > 0) {
    throw new EnvironmentValidationError(problems);
  }

  return { nodeEnv, http, database, redis, storage };
}
