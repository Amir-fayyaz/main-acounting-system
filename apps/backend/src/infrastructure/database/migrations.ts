import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { drizzle } from 'drizzle-orm/mysql2';
import { migrate } from 'drizzle-orm/mysql2/migrator';
import type { Pool, RowDataPacket } from 'mysql2/promise';

/**
 * Migration execution (FND-008).
 *
 * `drizzle-kit generate` writes versioned SQL migrations into `drizzle/` with a
 * deterministic journal (`meta/_journal.json`); this file is the *runtime* side
 * of that workflow. `migrateDatabase` applies every not-yet-applied migration in
 * journal order inside its own transaction and records the applied state in the
 * `__drizzle_migrations` table, so execution is:
 *
 * - **Deterministic** — the same folder always produces the same applied set,
 *   on a developer laptop or in automation; re-running an applied migration set
 *   is a verified no-op.
 * - **Fail-safe** — any failure (missing folder, unreadable journal, refused
 *   connection, broken SQL) is rethrown: a migration run that did not complete
 *   never reports success, and the process exits non-zero. No migration is
 *   silently skipped and the application never pretends persistence is ready
 *   behind a half-applied schema.
 *
 * The folder is resolved from the backend package root (the directory holding
 * `drizzle/`), found by walking up from *this* file — so it works unchanged
 * from source (`src/...`), from the build output (`dist/...`) and under Vitest.
 */
function resolveMigrationsFolder(): string {
  let current = dirname(fileURLToPath(import.meta.url));

  while (!existsSync(join(current, 'package.json'))) {
    const parent = dirname(current);
    if (parent === current) {
      throw new MigrationError(`Could not locate the backend package root for drizzle/`, undefined);
    }
    current = parent;
  }

  return join(current, 'drizzle');
}

const MIGRATIONS_FOLDER = resolveMigrationsFolder();

/** The journal row the mysql2 migrator records applied state in. */
const MIGRATIONS_TABLE = '__drizzle_migrations';

export class MigrationError extends Error {
  public constructor(
    message: string,
    public override readonly cause: unknown,
  ) {
    super(message);
    this.name = 'MigrationError';
  }
}

/**
 * Applies all pending migrations, then reports the applied count.
 *
 * Must be handed a pool whose connection to the target database has already
 * been proven successful; the database client itself owns the lifecycle.
 * `migrate` throws when a file cannot be read or a statement fails, which
 * callers must let abort the run — never catch and continue.
 */
export async function migrateDatabase(
  pool: Pool,
  migrationsFolder: string = MIGRATIONS_FOLDER,
): Promise<{ applied: number }> {
  const database = drizzle(pool);

  try {
    await migrate(database, { migrationsFolder });
  } catch (error) {
    throw new MigrationError(
      `Database migration failed; persistence state is not guaranteed (${MIGRATIONS_TABLE})`,
      error,
    );
  }

  return { applied: await appliedCount(pool) };
}

/**
 * The number of migrations the journal records as applied. Used by the CLI to
 * report state and by the integration test to prove that a second run of the
 * same folder changes nothing (deterministic tracking).
 */
export async function appliedCount(pool: Pool): Promise<number> {
  const [rows] = await pool.query(`SELECT COUNT(*) AS count FROM ${MIGRATIONS_TABLE}`);
  const row = (rows as RowDataPacket[])[0];
  return Number(row?.count ?? 0);
}

/**
 * The ordered file names the journal defines, what *should* be applied.
 *
 * Compared against `appliedCount` by the CLI's status command: a journal
 * shorter than the applied history (or a folder without a journal) is
 * inconsistent state and must be surfaced, never walked past.
 */
export interface MigrationStatus {
  readonly pending: number;
  readonly applied: number;
  readonly total: number;
}

export async function migrationStatus(pool: Pool): Promise<MigrationStatus> {
  const journal = JSON.parse(
    await readFile(join(MIGRATIONS_FOLDER, 'meta/_journal.json'), 'utf8'),
  ) as { entries: unknown[] };
  const total = journal.entries.length;
  const applied = await appliedCount(pool);

  if (applied > total) {
    throw new MigrationError(
      `Migration state is inconsistent: ${applied} applied but the journal defines ${total}`,
      undefined,
    );
  }

  return { applied, total, pending: total - applied };
}