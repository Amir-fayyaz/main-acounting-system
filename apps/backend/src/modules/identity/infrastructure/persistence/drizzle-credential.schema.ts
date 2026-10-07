import { sql } from 'drizzle-orm';
import { datetime, int, mysqlTable, varchar } from 'drizzle-orm/mysql-core';
import type { Database } from '../../../../infrastructure/database/database.module.js';

/**
 * The user credential table (IAM-005; doc 07: database-and-migrations).
 *
 * This table belongs to the identity module and only the authentication flow
 * reaches it: the Drizzle table object, the adapter and the DDL live inside this
 * module's `infrastructure/persistence/`, and no other module may import any of
 * them (ADR-002 sections 8 and 12; enforced by
 * `src/modules/module-boundaries.spec.ts`).
 *
 * The columns are deliberately minimal, and each one is a rule:
 *
 * - `user_id` — the credential's identity *and* the primary key, so "one
 *   credential per user" is enforced by the database rather than by a check a
 *   caller might forget, and there is no second surrogate key to correlate.
 * - `password_hash` — the encoded, self-describing derivation
 *   (`algorithm(params)$salt$key`), never a password and never reversible. The
 *   length matches `PasswordHash.MAX_LENGTH`, so a hash the domain accepts can
 *   never be truncated by storage.
 * - `revision` — the optimistic-concurrency token (SHR-008): a rotation is a
 *   compare-and-swap, so two concurrent credential changes cannot silently
 *   produce a "last write wins" secret.
 * - `created_at` / `updated_at` — UTC instants; `created_at` never changes and
 *   `updated_at` advances on a rotation.
 *
 * There is deliberately **no foreign key** to `users`, matching the rest of the
 * module: the credential references a user by its stable identity and the
 * application enforces existence (provisioning resolves the user first, and
 * authentication never creates one). There is also no reversible or
 * recoverable column — no plaintext, no recoverable ciphertext and no security
 * question/answer — so a leaked dump is a list of salted derivations, not a list
 * of passwords.
 */
export const CREDENTIAL_TABLE_NAME = 'user_credentials';

export const userCredentials = mysqlTable(CREDENTIAL_TABLE_NAME, {
  userId: varchar('user_id', { length: 64 }).primaryKey(),
  passwordHash: varchar('password_hash', { length: 512 }).notNull(),
  revision: int('revision').notNull(),
  createdAt: datetime('created_at', { fsp: 3 }).notNull(),
  updatedAt: datetime('updated_at', { fsp: 3 }).notNull(),
});

/** The number of this module's credential schema revision. */
export const CREDENTIAL_SCHEMA_VERSION = 1;

/**
 * The credential schema as versioned, reviewable DDL (doc 07: migrations are
 * owned, versioned and reviewable, and constraints are enforced in the database
 * too). Idempotent (`IF NOT EXISTS`), so provisioning runs safely any number of
 * times.
 */
export const CREDENTIAL_DDL: readonly string[] = [
  `CREATE TABLE IF NOT EXISTS ${CREDENTIAL_TABLE_NAME} (
    user_id VARCHAR(64) NOT NULL,
    password_hash VARCHAR(512) NOT NULL,
    revision INT NOT NULL,
    created_at DATETIME(3) NOT NULL,
    updated_at DATETIME(3) NOT NULL,
    PRIMARY KEY (user_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
];

/**
 * Applies the credential schema. Safe to call repeatedly: the statement is
 * idempotent, nothing is dropped and no data is rewritten (doc 07 — a
 * destructive migration without a recovery plan is not allowed).
 */
export async function ensureCredentialSchema(database: Database): Promise<void> {
  for (const statement of CREDENTIAL_DDL) {
    await database.execute(sql.raw(statement));
  }
}
