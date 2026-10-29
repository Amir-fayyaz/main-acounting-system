import { datetime, mysqlTable, varchar } from 'drizzle-orm/mysql-core';

/**
 * The seed fixture registry (DEV-001).
 *
 * A development fixture needs a *stable key* that survives a restart: a user
 * has a unique email and a role has a unique name within its tenant, but a
 * tenant has no natural key at all — creation always mints a fresh identity.
 * Without a record of which tenant a fixture key produced, a second `pnpm seed`
 * could only guess, and guessing would create duplicate companies.
 *
 * This table is that record and nothing more: a fixture key, the kind of
 * record it names and that record's identity. It is infrastructure-owned
 * tooling metadata, not business data — no module reads it, and it never
 * duplicates a module table. A missing row means "not created by the seeder
 * yet", never "deleted"; the seeder always prefers an existing application
 * record over a registry row and re-points a stale entry instead of deleting
 * anything.
 */
export const SEED_FIXTURE_TABLE_NAME = 'seed_fixtures';

export const seedFixtures = mysqlTable(SEED_FIXTURE_TABLE_NAME, {
  fixtureKey: varchar('fixture_key', { length: 128 }).primaryKey(),
  entityType: varchar('entity_type', { length: 32 }).notNull(),
  entityId: varchar('entity_id', { length: 128 }).notNull(),
  createdAt: datetime('created_at', { fsp: 3 }).notNull(),
  updatedAt: datetime('updated_at', { fsp: 3 }).notNull(),
});
