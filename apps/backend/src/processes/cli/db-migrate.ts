import 'reflect-metadata';

import { createPool, type Pool } from 'mysql2/promise';

import { loadConfiguration } from '../../infrastructure/config/configuration.js';
import { loadDotEnvFiles } from '../../infrastructure/config/dotenv.js';
import { redactProcessSecrets } from '../../infrastructure/config/secrets.js';
import { migrateDatabase, migrationStatus } from '../../infrastructure/database/migrations.js';

const USAGE =
  'Usage: node dist/processes/cli/db-migrate.js <migrate|status>\n\n' +
  '  migrate  Apply all pending migrations (deterministic, tracked).\n' +
  '  status   Report applied/pending migration counts.\n\n' +
  'Fails fast — and without touching the database — when the configuration\n' +
  'is missing or invalid (FND-003), and exits non-zero when a migration\n' +
  'cannot be applied: a half-applied schema is never reported as success.\n';

/**
 * Migration command line (FND-008).
 *
 * The API process never migrates implicitly: schema changes reach a database
 * only when this command is run, so local development and automation execute
 * the same deterministic workflow against the same journal.
 */
async function main(): Promise<void> {
  loadDotEnvFiles();

  const command = process.argv[2] ?? 'migrate';

  if (command !== 'migrate' && command !== 'status') {
    console.error(USAGE);
    process.exitCode = 1;
    return;
  }

  // loadConfiguration throws before anything connects: a bad or missing
  // configuration can never be mistaken for a database failure or, worse,
  // silently skipped.
  const configuration = loadConfiguration();

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
    enableKeepAlive: false,
  });

  try {
    if (command === 'status') {
      const status = await migrationStatus(pool);
      console.log(
        `Migrations: ${status.applied} applied, ${status.pending} pending (${status.total} in journal).`,
      );
    } else {
      const result = await migrateDatabase(pool);
      const status = await migrationStatus(pool);
      console.log(
        `Migration complete: ${result.applied} applied in total, ${status.pending} pending.`,
      );
    }
  } finally {
    await pool.end();
  }
}

main().catch((error: unknown) => {
  const details = error instanceof Error ? (error.stack ?? error.message) : String(error);

  console.error(redactProcessSecrets(details));
  process.exit(1);
});
