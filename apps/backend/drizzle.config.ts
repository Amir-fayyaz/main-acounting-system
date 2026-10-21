import { defineConfig } from 'drizzle-kit';

import { loadConfiguration } from './src/infrastructure/config/configuration.js';
import { loadDotEnvFiles } from './src/infrastructure/config/dotenv.js';

/**
 * drizzle-kit configuration (FND-008).
 *
 * Ownership of the schema follows the module boundaries (ADR-002, TECH-003):
 * every business module owns the tables of its own persistence boundary in
 * `<module>/infrastructure/persistence/*.schema.ts`, and infrastructure-owned
 * persistence (the outbox) keeps its schema beside its adapter. There is
 * deliberately no global schema file to grow uncontrolled.
 *
 * `db:generate` diffs these schema files against `drizzle/` and appends a
 * versioned, reviewable migration; nothing here ever runs a migration against
 * a database (`generate` never inspects the real schema, so `dbCredentials`
 * below are only consumed by drizzle-kit commands that need a connection).
 */
loadDotEnvFiles();
const configuration = loadConfiguration();

export default defineConfig({
  dialect: 'mysql',
  schema: [
    './src/modules/*/infrastructure/persistence/*.schema.ts',
    './src/infrastructure/outbox/persistence/outbox.schema.ts',
  ],
  out: './drizzle',
  dbCredentials: {
    host: configuration.database.host,
    port: configuration.database.port,
    user: configuration.database.user,
    password: configuration.database.password,
    database: configuration.database.name,
  },
});
