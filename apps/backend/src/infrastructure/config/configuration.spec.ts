import { describe, expect, it } from 'vitest';
import { ConfigurationValidationError, loadConfiguration } from './configuration.js';

describe('loadConfiguration', () => {
  it('applies development defaults when nothing is configured', () => {
    const configuration = loadConfiguration({ NODE_ENV: 'development' });

    expect(configuration.environment).toEqual({
      name: 'development',
      isDevelopment: true,
      isTest: false,
      isProduction: false,
    });
    expect(configuration.runtime).toEqual({ serviceName: 'backend' });
    expect(configuration.http).toEqual({ host: '0.0.0.0', port: 3000, apiPrefix: '/api' });
    expect(configuration.database).toEqual({
      host: '127.0.0.1',
      port: 3306,
      name: 'accounting',
      user: 'accounting',
      password: '',
    });
    expect(configuration.redis).toEqual({ host: '127.0.0.1', port: 6379 });
    expect(configuration.storage).toEqual({
      endpoint: '127.0.0.1',
      port: 9000,
      useSsl: false,
      accessKey: '',
      secretKey: '',
      bucket: 'accounting-local',
    });
    expect(configuration.logging).toEqual({ level: 'info' });
    expect(configuration.jobs).toEqual({
      concurrency: 4,
      maxAttempts: 3,
      retryBaseDelayMs: 1000,
      retryMaxDelayMs: 30000,
    });
    expect(configuration.scheduler).toEqual({ intervalMs: 1000 });
    expect(configuration.outbox).toEqual({
      batchSize: 25,
      maxAttempts: 5,
      retryBaseDelayMs: 1000,
      retryMaxDelayMs: 60000,
      publishIntervalMs: 1000,
    });
  });

  it('never invents a credential for a default value', () => {
    const configuration = loadConfiguration({});

    expect(configuration.database.password).toBe('');
    expect(configuration.storage.accessKey).toBe('');
    expect(configuration.storage.secretKey).toBe('');
  });

  it('reads and normalizes configured values', () => {
    const configuration = loadConfiguration({
      NODE_ENV: 'test',
      SERVICE_NAME: 'worker',
      BACKEND_HOST: '127.0.0.1',
      BACKEND_PORT: '8080',
      BACKEND_API_PREFIX: '/internal/',
      MYSQL_HOST: 'mysql',
      MYSQL_PORT: '3307',
      MYSQL_DATABASE: 'accounting_test',
      MYSQL_USER: 'tester',
      MYSQL_PASSWORD: 'secret',
      REDIS_HOST: 'redis',
      MINIO_ENDPOINT: 'minio',
      MINIO_USE_SSL: 'true',
      MINIO_ACCESS_KEY: 'minio-local',
      MINIO_SECRET_KEY: 'minio-secret',
      LOG_LEVEL: 'debug',
      WORKER_CONCURRENCY: '8',
      WORKER_MAX_ATTEMPTS: '5',
      WORKER_RETRY_BASE_DELAY_MS: '200',
      WORKER_RETRY_MAX_DELAY_MS: '5000',
      SCHEDULER_INTERVAL_MS: '250',
      OUTBOX_BATCH_SIZE: '10',
      OUTBOX_MAX_ATTEMPTS: '7',
      OUTBOX_RETRY_BASE_DELAY_MS: '400',
      OUTBOX_RETRY_MAX_DELAY_MS: '12000',
      OUTBOX_PUBLISH_INTERVAL_MS: '500',
    });

    expect(configuration.environment).toMatchObject({ name: 'test', isTest: true });
    expect(configuration.runtime).toEqual({ serviceName: 'worker' });
    expect(configuration.http).toEqual({
      host: '127.0.0.1',
      port: 8080,
      apiPrefix: '/internal',
    });
    expect(configuration.database).toEqual({
      host: 'mysql',
      port: 3307,
      name: 'accounting_test',
      user: 'tester',
      password: 'secret',
    });
    expect(configuration.redis).toEqual({ host: 'redis', port: 6379 });
    expect(configuration.storage).toMatchObject({
      endpoint: 'minio',
      useSsl: true,
      accessKey: 'minio-local',
      secretKey: 'minio-secret',
    });
    expect(configuration.logging).toEqual({ level: 'debug' });
    expect(configuration.jobs).toEqual({
      concurrency: 8,
      maxAttempts: 5,
      retryBaseDelayMs: 200,
      retryMaxDelayMs: 5000,
    });
    expect(configuration.scheduler).toEqual({ intervalMs: 250 });
    expect(configuration.outbox).toEqual({
      batchSize: 10,
      maxAttempts: 7,
      retryBaseDelayMs: 400,
      retryMaxDelayMs: 12000,
      publishIntervalMs: 500,
    });
  });

  it('rejects a retry base delay above the ceiling', () => {
    let caught: unknown;

    try {
      loadConfiguration({
        NODE_ENV: 'development',
        WORKER_RETRY_BASE_DELAY_MS: '10000',
        WORKER_RETRY_MAX_DELAY_MS: '1000',
      });
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(ConfigurationValidationError);
    expect((caught as ConfigurationValidationError).problems).toEqual([
      'WORKER_RETRY_BASE_DELAY_MS must not be greater than WORKER_RETRY_MAX_DELAY_MS',
    ]);
  });

  it('rejects an outbox retry base delay above the ceiling', () => {
    let caught: unknown;

    try {
      loadConfiguration({
        NODE_ENV: 'development',
        OUTBOX_RETRY_BASE_DELAY_MS: '60000',
        OUTBOX_RETRY_MAX_DELAY_MS: '5000',
      });
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(ConfigurationValidationError);
    expect((caught as ConfigurationValidationError).problems).toEqual([
      'OUTBOX_RETRY_BASE_DELAY_MS must not be greater than OUTBOX_RETRY_MAX_DELAY_MS',
    ]);
  });

  it('accepts a fully configured production process', () => {
    const configuration = loadConfiguration({
      NODE_ENV: 'production',
      MYSQL_PASSWORD: 'database-password',
      MINIO_ACCESS_KEY: 'minio-access',
      MINIO_SECRET_KEY: 'minio-secret',
    });

    expect(configuration.environment.isProduction).toBe(true);
  });

  it('rejects missing credentials in production by name', () => {
    let caught: unknown;

    try {
      loadConfiguration({ NODE_ENV: 'production' });
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(ConfigurationValidationError);
    expect((caught as ConfigurationValidationError).problems).toEqual([
      'MYSQL_PASSWORD is required when NODE_ENV=production',
      'MINIO_ACCESS_KEY is required when NODE_ENV=production',
      'MINIO_SECRET_KEY is required when NODE_ENV=production',
    ]);
  });

  it('does not print a configured secret in the validation error', () => {
    let caught: unknown;

    try {
      loadConfiguration({
        NODE_ENV: 'production',
        MINIO_ACCESS_KEY: 'minio-local',
        MINIO_SECRET_KEY: 'do-not-print-this-value',
        BACKEND_PORT: 'not-a-port',
      });
    } catch (error) {
      caught = error;
    }

    const message = (caught as ConfigurationValidationError).message;

    expect(message).toContain('MYSQL_PASSWORD is required');
    expect(message).toContain('BACKEND_PORT must be an integer between 1 and 65535');
    expect(message).not.toContain('do-not-print-this-value');
    expect(message).not.toContain('minio-local');
  });

  it('collects every invalid value instead of failing on the first one', () => {
    let caught: unknown;

    try {
      loadConfiguration({
        NODE_ENV: 'staging',
        BACKEND_PORT: 'not-a-port',
        BACKEND_API_PREFIX: 'api',
        LOG_LEVEL: 'verbose',
        WORKER_CONCURRENCY: '0',
        MINIO_USE_SSL: 'sometimes',
      });
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(ConfigurationValidationError);
    expect((caught as ConfigurationValidationError).problems).toEqual([
      'NODE_ENV must be one of: development, test, production',
      'BACKEND_PORT must be an integer between 1 and 65535',
      'BACKEND_API_PREFIX must start with "/"',
      'MINIO_USE_SSL must be "true" or "false"',
      'LOG_LEVEL must be one of: debug, info, warn, error',
      'WORKER_CONCURRENCY must be an integer greater than or equal to 1',
    ]);
  });

  it('gives every process of the workspace the same configuration contract', () => {
    // The loader is framework-free on purpose: the HTTP process, the worker and
    // the scheduler call it with their own SERVICE_NAME and get the same shape.
    const shared = { NODE_ENV: 'development', MYSQL_HOST: 'mysql' };

    const http = loadConfiguration({ ...shared, SERVICE_NAME: 'backend' });
    const worker = loadConfiguration({ ...shared, SERVICE_NAME: 'worker' });
    const scheduler = loadConfiguration({ ...shared, SERVICE_NAME: 'scheduler' });

    expect(Object.keys(worker)).toEqual(Object.keys(http));
    expect(Object.keys(scheduler)).toEqual(Object.keys(http));
    expect(http.runtime.serviceName).toBe('backend');
    expect(worker.database).toEqual(http.database);
    expect(scheduler.jobs).toEqual(http.jobs);
  });
});
