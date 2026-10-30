import { defineConfig } from 'drizzle-kit';

import { loadConfiguration } from './src/infrastructure/config/configuration.js';
import { loadDotEnvFiles } from './src/infrastructure/config/dotenv.js';

/**
 * drizzle-kit configuration (FND-008).
 *
 * Ownership of the schema follows the module boundaries (ADR-002, TECH-003):
 * every business module owns the tables of its own persistence boundary in
 * `<module>/infrastructure/persistence/*.schema.ts`, and infrastructure-owned
 * persistence (the outbox) keeps its schema beside its adapter.
 *
 * The schema is consumed through a single entry point
 * (`src/infrastructure/database/schema.ts`) that re-exports every module-owned
 * table — modules still own their own schema files; this file only aggregates
 * them for tooling.
 *
 * `db:generate` diffs these schema files against `drizzle/` and appends a
 * versioned, reviewable migration. `db:migrate` is the command that applies
 * pending migrations to a running database (`dbCredentials` below are consumed
 * by every drizzle-kit command that needs a connection; `generate` alone never
 * inspects the real schema).
 */
loadDotEnvFiles();
const configuration = loadConfiguration();

export default defineConfig({
  dialect: 'mysql',
  schema: ['./src/infrastructure/database/schema.ts'],
  out: './drizzle',
  dbCredentials: {
    host: configuration.database.host,
    port: configuration.database.port,
    user: configuration.database.user,
    password: configuration.database.password,
    database: configuration.database.name,
  },
});
