import { sql } from 'drizzle-orm';
import { datetime, index, int, mysqlTable, varchar } from 'drizzle-orm/mysql-core';
import type { Database } from '../../../../infrastructure/database/database.module.js';

/**
 * The authentication session table (IAM-005; doc 07: database-and-migrations).
 *
 * Like every other table in the workspace it belongs to exactly one module — the
 * authentication feature of identity — and no other module may import the table
 * object, the adapter or this DDL (ADR-002 sections 8 and 12; enforced by
 * `src/modules/module-boundaries.spec.ts`).
 *
 * The columns encode the session contract:
 *
 * - `id` — the stable UUID identity, the primary key, and what an audit record
 *   and a sign-out name.
 * - `user_id` — the authenticated user's identity. It is indexed because it is
 *   the criterion a credential change uses to invalidate a user's sessions; the
 *   table deliberately stores *only* the id, so a rename or a lifecycle change
 *   never has to be propagated into a session.
 * - `token_hash` — `sha256` of the bearer token, **unique**: the lookup is by
 *   digest, so the column is indexed, and the uniqueness constraint makes it
 *   impossible for two sessions to answer to the same credential. The token
 *   itself is never stored, so this column cannot be replayed.
 * - `expires_at` — the absolute instant the session stops being accepted,
 *   computed at sign-in from the configured lifetime of the environment.
 * - `revoked_at` — `NULL` while the session is in force and the invalidation
 *   instant afterwards. Keeping the record (rather than deleting it) is what
 *   makes sign-out auditable and what lets an operator see *why* a token stopped
 *   working.
 * - `revision` — the optimistic-concurrency token (SHR-008), so a sign-out and a
 *   concurrent credential change cannot both claim the same transition, and a
 *   bulk invalidation advances each row it touches by one.
 * - `created_at` / `updated_at` — UTC instants.
 *
 * There is deliberately no foreign key to `users` and no tenant column: a
 * session proves identity and nothing else, and a tenant column here would be a
 * standing invitation to treat authentication as tenant access.
 */
export const AUTH_SESSION_TABLE_NAME = 'auth_sessions';

export const authSessions = mysqlTable(
  AUTH_SESSION_TABLE_NAME,
  {
    id: varchar('id', { length: 64 }).primaryKey(),
    userId: varchar('user_id', { length: 64 }).notNull(),
    tokenHash: varchar('token_hash', { length: 64 }).notNull().unique(),
    expiresAt: datetime('expires_at', { fsp: 3 }).notNull(),
    revokedAt: datetime('revoked_at', { fsp: 3 }),
    revision: int('revision').notNull(),
    createdAt: datetime('created_at', { fsp: 3 }).notNull(),
    updatedAt: datetime('updated_at', { fsp: 3 }).notNull(),
  },
  (table) => [index('auth_sessions_user_id_index').on(table.userId)],
);

/** The number of this module's authentication session schema revision. */
export const AUTH_SESSION_SCHEMA_VERSION = 1;

/**
 * The session schema as versioned, reviewable DDL (doc 07). Idempotent
 * (`IF NOT EXISTS`), so provisioning runs safely any number of times.
 */
export const AUTH_SESSION_DDL: readonly string[] = [
  `CREATE TABLE IF NOT EXISTS ${AUTH_SESSION_TABLE_NAME} (
    id VARCHAR(64) NOT NULL,
    user_id VARCHAR(64) NOT NULL,
    token_hash VARCHAR(64) NOT NULL,
    expires_at DATETIME(3) NOT NULL,
    revoked_at DATETIME(3) NULL,
    revision INT NOT NULL,
    created_at DATETIME(3) NOT NULL,
    updated_at DATETIME(3) NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY auth_sessions_token_hash_unique (token_hash),
    KEY auth_sessions_user_id_index (user_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
];

/**
 * Applies the authentication session schema. Safe to call repeatedly: the
 * statement is idempotent, nothing is dropped and no data is rewritten.
 */
export async function ensureAuthSessionSchema(database: Database): Promise<void> {
  for (const statement of AUTH_SESSION_DDL) {
    await database.execute(sql.raw(statement));
  }
}
