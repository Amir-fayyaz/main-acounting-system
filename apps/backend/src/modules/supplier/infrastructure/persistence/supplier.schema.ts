import { sql } from 'drizzle-orm';
import {
  check,
  datetime,
  index,
  int,
  mysqlEnum,
  mysqlTable,
  unique,
  varchar,
} from 'drizzle-orm/mysql-core';

import type { Database } from '../../../../infrastructure/database/database.module.js';
import { SupplierCode } from '../../domain/value-objects/supplier-code.js';
import { SupplierIdentificationNumber } from '../../domain/value-objects/supplier-identification-number.js';
import { SupplierName } from '../../domain/value-objects/supplier-name.js';
import { SupplierStatus } from '../../domain/value-objects/supplier-status.js';

/**
 * The `suppliers` table (S3; PUR-001).
 *
 * The table belongs to the supplier module: the Drizzle table object, the
 * adapter, the mapper and the DDL all live in
 * `supplier/infrastructure/persistence/`, and no other module imports them
 * (ADR-003 section 4; enforced by `src/modules/module-boundaries.spec.ts`).
 *
 * The columns are exactly the state the Supplier aggregate owns:
 *
 * - `id` — stable UUID identity, primary key so an id is never reused.
 * - `tenant_id` — owning tenant, **NOT NULL**. Every read narrows on it through
 *   the central tenant scope (`assertTenantCriterion` / `tenantEq`) and every
 *   write is checked with `assertTenantOwnership`, so two companies never share
 *   a supplier (IAM-007; doc 26).
 * - `code` — the tenant-unique business code, bounded like `SupplierCode`.
 * - `name` — the display name exactly as the user wrote it.
 * - `normalized_name` — the canonical comparison form computed once by the
 *   domain through the S2 normalizer. It is stored rather than recomputed on
 *   read so search can use an index instead of normalizing every row.
 * - `identification_number` — optional legal identifier, canonical digits only.
 * - `contact_*` — optional descriptive data. It is not part of the duplicate
 *   rule and is stored flat rather than as JSON so it stays queryable.
 * - `status` — `active` / `inactive`, a NOT NULL enum so storage cannot hold a
 *   value the domain does not define.
 * - `revision` — the optimistic-concurrency token (SHR-008). Updates are a
 *   compare-and-swap on this column and write `expected + 1`.
 * - `created_at` / `updated_at` — UTC instants.
 *
 * The constraints restate the domain rules in the database, so a bypassing
 * script is refused too:
 *
 * - `UNIQUE (tenant_id, code)` — one code per company. MySQL's default
 *   `utf8mb4_0900_ai_ci` collation makes it case-insensitive, matching
 *   `SupplierCode.equals`, and trailing spaces compare equal as they do in the
 *   domain.
 * - `UNIQUE (tenant_id, identification_number)` — one identifier per company
 *   *when present*. MySQL allows any number of `NULL`s in a nullable unique
 *   key, so suppliers without an identification number do not collide.
 * - `CHECK (status IN ('active','inactive'))` — a status vocabulary guard on
 *   top of the enum, so the rule is visible to a reader of the DDL and survives
 *   a change of column type.
 *
 * Indexes:
 *
 * - `suppliers_tenant_code_unique (tenant_id, code)` and
 *   `suppliers_tenant_identification_unique (tenant_id, identification_number)`
 *   — the two duplicate lookups.
 * - `suppliers_tenant_normalized_name_index (tenant_id, normalized_name)` — the
 *   search index. It is tenant-leading, so a search can only scan one company's
 *   names. A prefix search (`LIKE 'x%'`) is a range on the second key part; a
 *   contains search (`LIKE '%x%'`) still narrows by the leading tenant key and
 *   reads the name index instead of the table rows. This is deliberately the
 *   starting point from the ticket — full-text or a separate search store comes
 *   only after measurement (out of scope for S3).
 */
export const SUPPLIERS_TABLE_NAME = 'suppliers';

export const SUPPLIERS_TENANT_CODE_UNIQUE = 'suppliers_tenant_code_unique';
export const SUPPLIERS_TENANT_IDENTIFICATION_UNIQUE = 'suppliers_tenant_identification_unique';
export const SUPPLIERS_TENANT_NORMALIZED_NAME_INDEX = 'suppliers_tenant_normalized_name_index';
export const SUPPLIERS_STATUS_CHECK = 'suppliers_status_check';

const SUPPLIER_STATUS_VALUES = [
  SupplierStatus.ACTIVE.value,
  SupplierStatus.INACTIVE.value,
] as const;

export const suppliers = mysqlTable(
  SUPPLIERS_TABLE_NAME,
  {
    id: varchar('id', { length: 64 }).primaryKey(),
    tenantId: varchar('tenant_id', { length: 64 }).notNull(),
    code: varchar('code', { length: SupplierCode.MAX_LENGTH }).notNull(),
    name: varchar('name', { length: SupplierName.MAX_LENGTH }).notNull(),
    normalizedName: varchar('normalized_name', { length: SupplierName.MAX_LENGTH }).notNull(),
    identificationNumber: varchar('identification_number', {
      length: SupplierIdentificationNumber.MAX_LENGTH,
    }),
    contactPhone: varchar('contact_phone', { length: 32 }),
    contactEmail: varchar('contact_email', { length: 254 }),
    contactAddress: varchar('contact_address', { length: 500 }),
    contactPostalCode: varchar('contact_postal_code', { length: 20 }),
    status: mysqlEnum('status', SUPPLIER_STATUS_VALUES).notNull(),
    revision: int('revision').notNull(),
    createdAt: datetime('created_at', { fsp: 3 }).notNull(),
    updatedAt: datetime('updated_at', { fsp: 3 }).notNull(),
  },
  (table) => [
    unique(SUPPLIERS_TENANT_CODE_UNIQUE).on(table.tenantId, table.code),
    unique(SUPPLIERS_TENANT_IDENTIFICATION_UNIQUE).on(table.tenantId, table.identificationNumber),
    index(SUPPLIERS_TENANT_NORMALIZED_NAME_INDEX).on(table.tenantId, table.normalizedName),
    check(SUPPLIERS_STATUS_CHECK, sql`\`status\` IN ('active', 'inactive')`),
  ],
);

/**
 * The supplier schema as versioned, reviewable DDL.
 *
 * It mirrors the Drizzle table statement for statement: the table object is the
 * type-level truth and this is the executable one. `IF NOT EXISTS` keeps the
 * spec runnable on a schema where the migration journal has not been applied
 * yet, exactly like the other persistence specs.
 */
export const SUPPLIER_SCHEMA_VERSION = 1;

export const SUPPLIERS_DDL: readonly string[] = [
  `CREATE TABLE IF NOT EXISTS \`${SUPPLIERS_TABLE_NAME}\` (
    \`id\` varchar(64) NOT NULL,
    \`tenant_id\` varchar(64) NOT NULL,
    \`code\` varchar(${SupplierCode.MAX_LENGTH}) NOT NULL,
    \`name\` varchar(${SupplierName.MAX_LENGTH}) NOT NULL,
    \`normalized_name\` varchar(${SupplierName.MAX_LENGTH}) NOT NULL,
    \`identification_number\` varchar(${SupplierIdentificationNumber.MAX_LENGTH}),
    \`contact_phone\` varchar(32),
    \`contact_email\` varchar(254),
    \`contact_address\` varchar(500),
    \`contact_postal_code\` varchar(20),
    \`status\` enum('active','inactive') NOT NULL,
    \`revision\` int NOT NULL,
    \`created_at\` datetime(3) NOT NULL,
    \`updated_at\` datetime(3) NOT NULL,
    CONSTRAINT \`suppliers_id\` PRIMARY KEY(\`id\`),
    CONSTRAINT \`${SUPPLIERS_TENANT_CODE_UNIQUE}\` UNIQUE(\`tenant_id\`,\`code\`),
    CONSTRAINT \`${SUPPLIERS_TENANT_IDENTIFICATION_UNIQUE}\` UNIQUE(\`tenant_id\`,\`identification_number\`),
    KEY \`${SUPPLIERS_TENANT_NORMALIZED_NAME_INDEX}\` (\`tenant_id\`,\`normalized_name\`),
    CONSTRAINT \`${SUPPLIERS_STATUS_CHECK}\` CHECK(\`status\` IN ('active', 'inactive'))
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
];

/**
 * The reverse of {@link SUPPLIERS_DDL}: the down migration.
 *
 * The migration journal is forward-only, so the reversal is declared beside the
 * up statements and proven by the written plan in `ROLLBACK.md` rather than by
 * a test that drops the table (the S3 verification rules forbid a spec teardown
 * from dropping tables or touching the journal).
 *
 * `suppliers` is master data, not financial history: nothing references it yet
 * and the rows can be re-created from the company's supplier records, so a
 * table drop is a recoverable reversal at this stage. Once purchase documents
 * reference suppliers, removal must become a lifecycle change (`inactive`) and
 * never a table drop.
 */
export const SUPPLIERS_DOWN_DDL: readonly string[] = [
  `DROP TABLE IF EXISTS \`${SUPPLIERS_TABLE_NAME}\``,
];

/** Applies the supplier schema this ticket owns; safe to call repeatedly. */
export async function ensureSupplierSchema(database: Database): Promise<void> {
  for (const statement of SUPPLIERS_DDL) {
    await database.execute(sql.raw(statement));
  }
}
