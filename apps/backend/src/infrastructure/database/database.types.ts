import type { MySql2Database } from 'drizzle-orm/mysql2';

/**
 * Drizzle instance shared by the persistence adapters of the domain modules.
 *
 * The schema is intentionally empty: each module owns its tables and migrations
 * inside its own `infrastructure/persistence` layer (TECH-003), so no global
 * schema is registered here.
 */
export type Database = MySql2Database<Record<string, never>>;