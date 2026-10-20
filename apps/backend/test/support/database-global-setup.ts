import { env } from 'node:process';

import { createPool, type Pool } from 'mysql2/promise';

import { AppConfigService } from '../../src/infrastructure/config/app-config.service.js';
import { loadConfiguration } from '../../src/infrastructure/config/configuration.js';
import { loadDotEnvFiles } from '../../src/infrastructure/config/dotenv.js';
import { migrateDatabase } from '../../src/infrastructure/database/migrations.js';

/**
 * Global setup for the MySQL integration tests (FND-008): when
 * `MYSQL_INTEGRATION=1`, the configured database is migrated *before* any spec
 * runs, so every persistence spec starts from the schema the migration journal
 * defines instead of scaffolding its own tables on a schemaless database. Specs
 * keep `CREATE TABLE IF NOT EXISTS` scaffolds so they still run without
 * infrastructure, but with migrations applied those become no-ops and every
 * spec runs on the real, indexed schema. A failed migration aborts the whole
 * run — the specs must not pretend persistence works on a half-applied schema.
 *
 * `env` is imported from `node:process` (rather than read through the
 * configuration layer) because this is a test gate, not application
 * configuration; the values are handed to the configuration boundary like the
 * persistence specs do.
 */
export default async function setup(): Promise<() => Promise<void>> {
  if (env.MYSQL_INTEGRATION !== '1') {
    return async () => undefined;
  }

  loadDotEnvFiles();

  const configuration = new AppConfigService(
    loadConfiguration({
      NODE_ENV: 'test',
      MYSQL_HOST: env.MYSQL_HOST,
      MYSQL_PORT: env.MYSQL_PORT,
      MYSQL_DATABASE: env.MYSQL_DATABASE,
      MYSQL_USER: env.MYSQL_USER,
      MYSQL_PASSWORD: env.MYSQL_PASSWORD,
    }),
  );

  const pool: Pool = createPool({
    host: configuration.database.host,
    port: configuration.database.port,
    user: configuration.database.user,
    password: configuration.database.password,
    database: configuration.database.name,
    connectionLimit: 2,
    waitForConnections: true,
    queueLimit: 0,
    timezone: 'Z',
  });

  try {
    // Throws loudly — the run stops rather than testing against a broken state.
    await migrateDatabase(pool);
  } finally {
    await pool.end();
  }

  return async () => undefined;
}
