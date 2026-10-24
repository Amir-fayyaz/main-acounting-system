import { env } from 'node:process';

import { createPool, type Pool } from 'mysql2/promise';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { AppConfigService } from '../src/infrastructure/config/app-config.service.js';
import {
  ConfigurationValidationError,
  loadConfiguration,
} from '../src/infrastructure/config/configuration.js';
import { loadDotEnvFiles } from '../src/infrastructure/config/dotenv.js';
import { MigrationError, migrateDatabase, migrationStatus } from '../src/infrastructure/database/migrations.js';

/**
 * Migration execution against a real MySQL server (FND-008).
 *
 * The API process never migrates implicitly, so the same workflow a developer
 * or an automation environment runs through the `db:migrate` CLI is exercised
 * here: pending migrations applied in journal order, state tracked so a second
 * run of the same folder is a verified no-op, invalid configuration failing
 * before anything connects, and inconsistent applied history refusing to be
 * walked past. Opt-in like the other persistence specs, so the quality gate
 * still runs without infrastructure:
 *
 * ```bash
 * pnpm infra:up
 * MYSQL_INTEGRATION=1 pnpm --filter @accounting-saas/backend test
 * ```
 *
 * The suite migrates the configured database itself. Migrations are idempotent
 * by construction, so leaving the database migrated (rather than reverting it)
 * matches how the CLI behaves too; the inconsistent-state case below plants a
 * forged journal row and restores the original count first, so the spec leaves
 * the database exactly as `db:migrate` would.
 */
const integrationEnabled = env.MYSQL_INTEGRATION === '1';

describe.skipIf(!integrationEnabled)('database migrations (integration)', () => {
  let pool: Pool;

  beforeAll(async () => {
    loadDotEnvFiles();

    const config = new AppConfigService(
      loadConfiguration({
        NODE_ENV: 'test',
        MYSQL_HOST: env.MYSQL_HOST,
        MYSQL_PORT: env.MYSQL_PORT,
        MYSQL_DATABASE: env.MYSQL_DATABASE,
        MYSQL_USER: env.MYSQL_USER,
        MYSQL_PASSWORD: env.MYSQL_PASSWORD,
      }),
    );

    pool = createPool({
      host: config.database.host,
      port: config.database.port,
      user: config.database.user,
      password: config.database.password,
      database: config.database.name,
      connectionLimit: 2,
      waitForConnections: true,
      queueLimit: 0,
      timezone: 'Z',
    });
  });

  afterAll(async () => {
    if (pool !== undefined) {
      await pool.end();
    }
  });

  it('fails before connecting when the configuration is invalid', () => {
    expect(() =>
      loadConfiguration({ NODE_ENV: 'test', MYSQL_PORT: '99999' }),
    ).toThrow(ConfigurationValidationError);
  });

  it('applies the journal and re-running the same folder changes nothing', async () => {
    const first = await migrateDatabase(pool);

    const afterFirst = await migrationStatus(pool);
    expect(afterFirst.pending).toBe(0);
    expect(first.applied).toBe(afterFirst.total);

    // Deterministic state: the same folder applies zero further rows.
    const again = await migrateDatabase(pool);
    const afterSecond = await migrationStatus(pool);
    expect(again.applied).toBe(afterSecond.total);
    expect(afterSecond).toEqual(afterFirst);
  });

  it('refuses applied history the journal does not define', async () => {
    // Forge one row beyond the journal (1 entry), then restore it, so the run
    // leaves the migration table exactly as `db:migrate` produced it.
    const [counts] = await pool.query(
      'SELECT COUNT(*) AS count FROM __drizzle_migrations',
    );
    const applied = Number((counts as Array<{ count: number }>)[0].count);

    await pool.query(
      "INSERT INTO __drizzle_migrations (hash, created_at) VALUES ('forged', 0)",
    );
    try {
      await expect(migrationStatus(pool)).rejects.toBeInstanceOf(MigrationError);
      await expect(migrationStatus(pool)).rejects.toThrow(/inconsistent/);
    } finally {
      await pool.query(
        'DELETE FROM __drizzle_migrations WHERE hash = \'forged\'',
      );
      const [restored] = await pool.query(
        'SELECT COUNT(*) AS count FROM __drizzle_migrations',
      );
      expect(Number((restored as Array<{ count: number }>)[0].count)).toBe(applied);
    }
  });
});
