import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  datetime,
  foreignKey,
  index,
  int,
  mysqlEnum,
  mysqlTable,
  unique,
  varchar,
} from 'drizzle-orm/mysql-core';
import type { Database } from '../../../../infrastructure/database/database.module.js';
import { AccountCode } from '../../domain/value-objects/account-code.js';
import { AccountType } from '../../domain/value-objects/account-type.js';
import { NormalBalance } from '../../domain/value-objects/account-normal-balance.js';

/**
 * The chart-of-accounts table (ACC-001.2; design section 6; doc 07).
 *
 * This table belongs to the accounting module, and only that module reaches
 * it: the Drizzle table object, the adapter, the mapper and the DDL all live
 * inside the module's `infrastructure/persistence/`, and no other module may
 * import any of them (ADR-003 section 4; enforced by
 * `src/modules/module-boundaries.spec.ts`).
 *
 * Columns are exactly the account-level information the aggregate owns:
 *
 * - `id` — the stable UUID identity. Primary key, so an id is never reused.
 * - `tenant_id` — the owning tenant, **NOT NULL**. Every read narrows on it and
 *   every write is checked against the ambient scope, so a chart of accounts
 *   never mixes two companies (IAM-007; doc 26).
 * - `code` — the account code, bounded to match `AccountCode` and unique per
 *   tenant, so `1000` means one account in one company.
 * - `name` — the mutable display name.
 * - `level` — the depth in the tree; a root is level 1 and a child is always
 *   `parent.level + 1`.
 * - `parent_id` — the parent account, nullable for a root.
 * - `type` / `normal_balance` — the two dimensions the aggregate derives for a
 *   child from its parent, both `NOT NULL` enums so storage can never hold a
 *   value the domain does not define.
 * - `postable` / `active` / `system` — the three boolean attributes the
 *   aggregate protects. `system` is quoted everywhere because MySQL reserves it.
 * - `revision` — the optimistic-concurrency token (SHR-008; doc 22). The
 *   adapter's compare-and-swap writes `revision = expected + 1` and matches on
 *   the old value, so a stale write affects zero rows. The ticket calls this the
 *   account's *version*; the project's shared mechanism names it `revision`, and
 *   the shared port is what this table is built on.
 * - `created_at` / `updated_at` — UTC instants. `created_at` never changes;
 *   `updated_at` advances on every accepted write.
 *
 * Four constraints carry the ticket's rules at the storage layer:
 *
 * - `UNIQUE (tenant_id, code)` — one code per company (and the index a code
 *   lookup narrows by). The same code in two companies is deliberately allowed.
 * - `UNIQUE (tenant_id, id)` — the key the composite parent foreign key needs;
 *   `id` alone is already unique, but InnoDB requires an index on the
 *   *referenced* column list exactly.
 * - `FOREIGN KEY (tenant_id, parent_id) REFERENCES accounts (tenant_id, id)` —
 *   the parent must be an account **of the same tenant**. A parent id from
 *   another company cannot be stored, even by a write that bypasses the domain,
 *   because the tenant is part of the reference itself. The constraint is
 *   inside one module (a self-reference), which doc 07 allows; cross-module
 *   foreign keys remain forbidden (ADR-003 section 13).
 * - `CHECK` — a level below 1, and a level/parent disagreement (a root that
 *   claims a depth, or a child that claims to be a root), are refused.
 *
 * Indexes:
 *
 * - `accounts_tenant_parent_index (tenant_id, parent_id)` — the tree load: one
 *   query per tenant, ordered by the hierarchy, with no per-node follow-up.
 * - `accounts_tenant_code_unique (tenant_id, code)` — the code lookup.
 */
export const ACCOUNTS_TABLE_NAME = 'accounts';

/**
 * The type and normal-balance vocabularies come from the domain value objects,
 * so the enum columns cannot drift from what `AccountType.from` and
 * `NormalBalance.from` accept.
 */
const ACCOUNT_TYPE_VALUES = AccountType.VALUES.map((type) => type.value) as unknown as readonly [
  string,
  ...string[],
];

const NORMAL_BALANCE_VALUES = NormalBalance.VALUES.map(
  (balance) => balance.value,
) as unknown as readonly [string, ...string[]];

export const accounts = mysqlTable(
  ACCOUNTS_TABLE_NAME,
  {
    id: varchar('id', { length: 64 }).primaryKey(),
    tenantId: varchar('tenant_id', { length: 64 }).notNull(),
    code: varchar('code', { length: AccountCode.MAX_LENGTH }).notNull(),
    name: varchar('name', { length: 200 }).notNull(),
    level: int('level').notNull(),
    parentId: varchar('parent_id', { length: 64 }),
    type: mysqlEnum('type', ACCOUNT_TYPE_VALUES).notNull(),
    normalBalance: mysqlEnum('normal_balance', NORMAL_BALANCE_VALUES).notNull(),
    postable: boolean('postable').notNull(),
    active: boolean('active').notNull(),
    system: boolean('system').notNull(),
    revision: int('revision').notNull(),
    createdAt: datetime('created_at', { fsp: 3 }).notNull(),
    updatedAt: datetime('updated_at', { fsp: 3 }).notNull(),
  },
  (table) => [
    unique('accounts_tenant_code_unique').on(table.tenantId, table.code),
    // The referenced key of the composite parent foreign key below.
    unique('accounts_tenant_id_unique').on(table.tenantId, table.id),
    index('accounts_tenant_parent_index').on(table.tenantId, table.parentId),
    check('accounts_level_check', sql`\`level\` >= 1`),
    check(
      'accounts_level_parent_check',
      sql`(\`parent_id\` IS NULL AND \`level\` = 1) OR (\`parent_id\` IS NOT NULL AND \`level\` > 1)`,
    ),
    foreignKey({
      name: 'accounts_tenant_parent_fk',
      columns: [table.tenantId, table.parentId],
      foreignColumns: [table.tenantId, table.id],
    }).onDelete('restrict'),
  ],
);

/**
 * The accounts schema as versioned, reviewable DDL (doc 07: migrations are
 * owned, versioned and reviewable, and constraints are enforced in the database
 * too).
 *
 * It mirrors `accounts` statement for statement — the Drizzle table is the
 * type-level truth, this is the executable one. Idempotent (`IF NOT EXISTS`),
 * so provisioning runs safely on any environment, any number of times.
 */
export const ACCOUNT_SCHEMA_VERSION = 1;

export const ACCOUNTS_DDL: readonly string[] = [
  `CREATE TABLE IF NOT EXISTS \`accounts\` (
    \`id\` varchar(64) NOT NULL,
    \`tenant_id\` varchar(64) NOT NULL,
    \`code\` varchar(${AccountCode.MAX_LENGTH}) NOT NULL,
    \`name\` varchar(200) NOT NULL,
    \`level\` int NOT NULL,
    \`parent_id\` varchar(64),
    \`type\` enum('asset','liability','equity','revenue','expense') NOT NULL,
    \`normal_balance\` enum('debit','credit') NOT NULL,
    \`postable\` boolean NOT NULL,
    \`active\` boolean NOT NULL,
    \`system\` boolean NOT NULL,
    \`revision\` int NOT NULL,
    \`created_at\` datetime(3) NOT NULL,
    \`updated_at\` datetime(3) NOT NULL,
    CONSTRAINT \`accounts_id\` PRIMARY KEY(\`id\`),
    CONSTRAINT \`accounts_tenant_code_unique\` UNIQUE(\`tenant_id\`,\`code\`),
    CONSTRAINT \`accounts_tenant_id_unique\` UNIQUE(\`tenant_id\`,\`id\`),
    KEY \`accounts_tenant_parent_index\` (\`tenant_id\`,\`parent_id\`),
    CONSTRAINT \`accounts_level_check\` CHECK(\`level\` >= 1),
    CONSTRAINT \`accounts_level_parent_check\` CHECK((\`parent_id\` IS NULL AND \`level\` = 1) OR (\`parent_id\` IS NOT NULL AND \`level\` > 1)),
    CONSTRAINT \`accounts_tenant_parent_fk\` FOREIGN KEY (\`tenant_id\`, \`parent_id\`) REFERENCES \`accounts\`(\`tenant_id\`, \`id\`) ON DELETE RESTRICT
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
];

/**
 * The reverse of {@link ACCOUNTS_DDL}: the down migration.
 *
 * The project's migrations are forward-only in the journal, so reversibility is
 * stated here — in the module's own schema, beside the up statements — and
 * proven by an integration test that applies the up DDL, seeds a row, drops the
 * table through this statement and applies the up DDL again. Dropping the table
 * also drops its two constraints and the foreign key, so nothing survives to
 * block the next apply.
 *
 * `accounts` is leaf data at this stage (nothing references it yet) and holds
 * no financial history; a chart-of-accounts row can be re-created from the
 * template, which is why a table drop is a recoverable reversal rather than a
 * destructive one (doc 07). Once postings reference accounts, removal becomes a
 * lifecycle change (`active = false`) and never a table drop.
 */
export const ACCOUNTS_DOWN_DDL: readonly string[] = [`DROP TABLE IF EXISTS \`accounts\``];

/**
 * Applies the accounts schema this ticket owns. Safe to call repeatedly: the
 * statement is idempotent, nothing is dropped and no data is rewritten (doc 07
 * — a destructive migration without a recovery plan is not allowed).
 */
export async function ensureAccountSchema(database: Database): Promise<void> {
  for (const statement of ACCOUNTS_DDL) {
    await database.execute(sql.raw(statement));
  }
}
