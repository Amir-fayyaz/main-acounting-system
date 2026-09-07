/**
 * Environment validation (BACKLOG P1.1). Parse, validate, and expose a typed
 * application configuration. Keep this module dependency-free so it can run in
 * tests and scripts without NestJS.
 */

export type NodeEnv = 'development' | 'test' | 'production';

/** Injection token for the validated application configuration (AppEnv). */
export const APP_ENV = Symbol('APP_ENV');

export interface AppEnv {
  readonly nodeEnv: NodeEnv;
  readonly port: number;
  readonly databaseUrl: string;
  readonly redisUrl: string;
  readonly jwtAccessSecret: string;
  readonly jwtAccessTtl: string;
  readonly jwtRefreshTtl: string;
  readonly corsOrigins: string[];
}

export class EnvValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EnvValidationError';
  }
}

const DURATION = /^\d+(ms|s|m|h|d)$/;

function requireValue(env: NodeJS.ProcessEnv, key: string): string {
  const value = env[key];
  if (value === undefined || value.trim() === '') {
    throw new EnvValidationError(`Missing required environment variable: ${key}`);
  }
  return value.trim();
}

function parsePort(env: NodeJS.ProcessEnv): number {
  const raw = env['PORT'] ?? '3000';
  const port = Number.parseInt(raw, 10);
  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new EnvValidationError(`PORT must be an integer between 1 and 65535, got: ${raw}`);
  }
  return port;
}

function parseDuration(env: NodeJS.ProcessEnv, key: string): string {
  const raw = requireValue(env, key);
  if (!DURATION.test(raw)) {
    throw new EnvValidationError(`${key} must match <number><ms|s|m|h|d>, got: ${raw}`);
  }
  return raw;
}

function parseCorsOrigins(env: NodeJS.ProcessEnv): string[] {
  const raw = env['CORS_ORIGINS'] ?? '*';
  return raw
    .split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);
}

function assertSecretStrength(secret: string): void {
  if (secret.length < 32) {
    throw new EnvValidationError('JWT_ACCESS_SECRET must be at least 32 characters');
  }
}

/** Validates process.env and returns the typed application configuration. */
export function validateEnv(env: NodeJS.ProcessEnv = process.env): AppEnv {
  const nodeEnv = (env['NODE_ENV'] ?? 'development') as NodeEnv;
  if (!['development', 'test', 'production'].includes(nodeEnv)) {
    throw new EnvValidationError(`NODE_ENV must be development, test, or production, got: ${nodeEnv}`);
  }

  const jwtAccessSecret = requireValue(env, 'JWT_ACCESS_SECRET');
  if (nodeEnv === 'production') {
    assertSecretStrength(jwtAccessSecret);
  }

  return {
    nodeEnv,
    port: parsePort(env),
    databaseUrl: requireValue(env, 'DATABASE_URL'),
    redisUrl: requireValue(env, 'REDIS_URL'),
    jwtAccessSecret,
    jwtAccessTtl: parseDuration(env, 'JWT_ACCESS_TTL'),
    jwtRefreshTtl: parseDuration(env, 'JWT_REFRESH_TTL'),
    corsOrigins: parseCorsOrigins(env),
  };
}
