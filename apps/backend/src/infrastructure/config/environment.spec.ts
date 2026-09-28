import { describe, expect, it } from 'vitest';
import { EnvironmentValidationError, loadEnvironment } from './environment.js';

describe('loadEnvironment', () => {
  it('applies development defaults when nothing is configured', () => {
    const environment = loadEnvironment({ NODE_ENV: 'development' });

    expect(environment.nodeEnv).toBe('development');
    expect(environment.http).toEqual({ host: '0.0.0.0', port: 3000, apiPrefix: '/api' });
    expect(environment.database).toEqual({
      host: '127.0.0.1',
      port: 3306,
      name: 'accounting',
      user: 'accounting',
      password: '',
    });
  });

  it('reads and normalizes configured values', () => {
    const environment = loadEnvironment({
      NODE_ENV: 'test',
      BACKEND_HOST: '127.0.0.1',
      BACKEND_PORT: '8080',
      BACKEND_API_PREFIX: '/internal/',
      MYSQL_HOST: 'mysql',
      MYSQL_PORT: '3307',
      MYSQL_DATABASE: 'accounting_test',
      MYSQL_USER: 'tester',
      MYSQL_PASSWORD: 'secret',
    });

    expect(environment.http).toEqual({
      host: '127.0.0.1',
      port: 8080,
      apiPrefix: '/internal',
    });
    expect(environment.database).toEqual({
      host: 'mysql',
      port: 3307,
      name: 'accounting_test',
      user: 'tester',
      password: 'secret',
    });
  });

  it('rejects a missing database password in production', () => {
    expect(() => loadEnvironment({ NODE_ENV: 'production' })).toThrow(EnvironmentValidationError);
  });

  it('collects every invalid value instead of failing on the first one', () => {
    let caught: unknown;

    try {
      loadEnvironment({
        NODE_ENV: 'staging',
        BACKEND_PORT: 'not-a-port',
        BACKEND_API_PREFIX: 'api',
      });
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(EnvironmentValidationError);
    expect((caught as EnvironmentValidationError).problems).toEqual([
      'NODE_ENV must be one of: development, test, production',
      'BACKEND_PORT must be an integer between 1 and 65535',
      'BACKEND_API_PREFIX must start with "/"',
    ]);
  });
});
