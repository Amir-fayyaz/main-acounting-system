/**
 * Jest setup for suites that boot the full AppModule (e2e). AppConfigModule
 * validates the environment at bootstrap, so tests must supply valid values
 * before the module is initialized.
 */
process.env.NODE_ENV = process.env.NODE_ENV ?? 'test';
process.env.DATABASE_URL =
  process.env.DATABASE_URL ??
  'postgresql://postgres:postgres@localhost:5432/accounting_saas_test?schema=public';
process.env.REDIS_URL = process.env.REDIS_URL ?? 'redis://localhost:6379';
process.env.JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET ?? 'test-secret-that-is-long-enough-0000000000';
process.env.JWT_ACCESS_TTL = process.env.JWT_ACCESS_TTL ?? '15m';
process.env.JWT_REFRESH_TTL = process.env.JWT_REFRESH_TTL ?? '30d';
process.env.CORS_ORIGINS = process.env.CORS_ORIGINS ?? 'http://localhost:3001';
