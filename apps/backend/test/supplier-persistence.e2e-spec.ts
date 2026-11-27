import { randomUUID } from 'node:crypto';
import { env } from 'node:process';

import { drizzle } from 'drizzle-orm/mysql2';
import { createPool, type Pool } from 'mysql2/promise';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { AppConfigService } from '../src/infrastructure/config/app-config.service.js';
import { loadConfiguration } from '../src/infrastructure/config/configuration.js';
import { loadDotEnvFiles } from '../src/infrastructure/config/dotenv.js';
import type { Database } from '../src/infrastructure/database/database.module.js';
import {
  isConcurrencyConflict,
  staleRevisionOf,
} from '../src/shared/persistence/optimistic-concurrency.js';
import { PersistenceFailureKind } from '../src/shared/persistence/persistence-error.js';
import { Revision } from '../src/shared/persistence/revision.js';
import { DateTime } from '../src/shared/time/date-time.js';
import { normalizePersianSearch } from '../src/shared/text/persian-search.js';
import { createTenantContext } from '../src/shared/tenant/tenant-context.js';
import { TenantScope } from '../src/shared/tenant/tenant-scope.js';
import {
  TenantContextMissingError,
  TenantIsolationViolationError,
} from '../src/shared/tenant/tenant.errors.js';
import {
  Supplier,
  type SupplierSnapshot,
} from '../src/modules/supplier/domain/aggregates/supplier.js';
import {
  SupplierCodeDuplicateError,
  SupplierIdentificationDuplicateError,
} from '../src/modules/supplier/domain/errors/supplier.errors.js';
import { SupplierDuplicatePolicy } from '../src/modules/supplier/domain/policies/supplier-duplicate.policy.js';
import { SupplierCode } from '../src/modules/supplier/domain/value-objects/supplier-code.js';
import { SupplierIdentificationNumber } from '../src/modules/supplier/domain/value-objects/supplier-identification-number.js';
import { SupplierName } from '../src/modules/supplier/domain/value-objects/supplier-name.js';
import { DrizzleSupplierRepository } from '../src/modules/supplier/infrastructure/persistence/drizzle-supplier.repository.js';
import {
  SUPPLIERS_DOWN_DDL,
  SUPPLIERS_TABLE_NAME,
  SUPPLIERS_TENANT_CODE_UNIQUE,
  SUPPLIERS_TENANT_IDENTIFICATION_UNIQUE,
  SUPPLIERS_TENANT_NORMALIZED_NAME_INDEX,
  ensureSupplierSchema,
} from '../src/modules/supplier/infrastructure/persistence/supplier.schema.js';

/**
 * Supplier persistence against a real MySQL server (S3; PUR-001; IAM-007;
 * SHR-004, SHR-008).
 *
 * The domain and application specs already prove the rules; these prove the
 * parts only a real store can:
 *
 * - the database itself refuses a duplicate code and a duplicate identification
 *   number inside one company, even for a raw INSERT that bypassed the domain;
 * - the same values are allowed in another company, and a missing
 *   identification number never collides (nullable unique key);
 * - the adapter turns those refusals into the supplier's own
 *   `SUPPLIER_CODE_DUPLICATE` / `SUPPLIER_IDENTIFICATION_DUPLICATE` errors
 *   carried as the cause of `PersistenceError(CONFLICT)`, without leaking
 *   driver text;
 * - every read and write is tenant-scoped, including a guessed id from another
 *   tenant;
 * - search uses the stored normalized name and the tenant-leading index;
 * - a revision is compare-and-swapped and two concurrent creations of the same
 *   code leave exactly one row;
 * - teardown deletes only this spec's rows and never drops the table or touches
 *   the migration journal.
 *
 * Opt-in, so the required quality gate still runs without infrastructure:
 *
 * ```bash
 * docker compose up -d mysql
 * MYSQL_INTEGRATION=1 pnpm --filter @accounting-saas/backend test
 * ```
 */
const integrationEnabled = env.MYSQL_INTEGRATION === '1';

const TABLE = SUPPLIERS_TABLE_NAME;

const TENANT_A = '018f0d3c-6d0f-7a4b-9d4e-2b3c4d5e6f80';
const TENANT_B = '018f0d3d-6d0f-7a4b-9d4e-2b3c4d5e6f81';

const NOW = DateTime.parse('2026-11-01T08:00:00.000Z');
const LATER = DateTime.parse('2026-11-02T09:30:00.000Z');

/** The production duplicate policy, with the S2 normalizer injected. */
const POLICY = new SupplierDuplicatePolicy(normalizePersianSearch);

/** Runs `work` inside the scope of one tenant. */
function inTenant<T>(tenantId: string, work: () => Promise<T>): Promise<T> {
  return TenantScope.run(createTenantContext(tenantId), work);
}

/** Builds a supplier through the aggregate's own creation path. */
function aSupplier(input: {
  readonly tenantId?: string;
  readonly code: string;
  readonly name: string;
  readonly identificationNumber?: string;
  readonly now?: DateTime;
}): Supplier {
  const creation = Supplier.create({
    tenantId: input.tenantId ?? TENANT_A,
    code: SupplierCode.from(input.code),
    name: SupplierName.from(input.name),
    identificationNumber:
      input.identificationNumber === undefined
        ? undefined
        : SupplierIdentificationNumber.from(input.identificationNumber),
    now: input.now ?? NOW,
    existingSuppliers: [],
    duplicatePolicy: POLICY,
  });

  const outcome = creation.valueOrThrow();
  if (outcome.kind !== 'created') {
    throw new Error(`expected a created supplier but received ${outcome.kind}`);
  }
  return outcome.supplier;
}

describe.skipIf(!integrationEnabled)('supplier persistence (integration)', () => {
  let pool: Pool;
  let database: Database;
  let repository: DrizzleSupplierRepository;
  let migrationRowsBefore: number;

  beforeAll(async () => {
    loadDotEnvFiles();

    const config = new AppConfigService(loadConfiguration({ ...env, NODE_ENV: 'test' }));

    pool = createPool({
      host: config.database.host,
      port: config.database.port,
      user: config.database.user,
      password: config.database.password,
      database: config.database.name,
      connectionLimit: 10,
      waitForConnections: true,
      queueLimit: 0,
      timezone: 'Z',
    });

    database = drizzle(pool);
    // Idempotent: with `MYSQL_INTEGRATION=1` the migration journal already
    // created the table; this keeps the spec runnable on a schema where the
    // migration has not been applied yet.
    await ensureSupplierSchema(database);

    repository = new DrizzleSupplierRepository(database);

    const [rows] = await pool.query('SELECT COUNT(*) AS count FROM __drizzle_migrations');
    migrationRowsBefore = Number((rows as Array<{ count: number }>)[0].count);
  });

  beforeEach(async () => {
    await deleteOwnRows();
  });

  afterAll(async () => {
    if (pool !== undefined) {
      await deleteOwnRows();
      await pool.end();
    }
  });

  /**
   * Deletes only the rows this spec created. It never drops the table and never
   * touches the migration journal, so a parallel or later spec is unaffected.
   */
  async function deleteOwnRows(): Promise<void> {
    await pool.query(`DELETE FROM ${TABLE} WHERE tenant_id IN (?, ?)`, [TENANT_A, TENANT_B]);
  }

  /**
   * A raw `INSERT` that never touches the domain, the use case or the adapter —
   * the write a bypassing script or another tool would perform. The database
   * alone must defend the constraints.
   */
  async function rawInsert(input: {
    readonly id?: string;
    readonly tenantId: string;
    readonly code: string;
    readonly name?: string;
    readonly identificationNumber?: string | null;
    readonly status?: string;
  }): Promise<string> {
    const id = input.id ?? randomUUID();
    const name = input.name ?? `Raw ${input.code}`;
    await pool.query(
      `INSERT INTO ${TABLE}
         (id, tenant_id, code, name, normalized_name, identification_number,
          contact_phone, contact_email, contact_address, contact_postal_code,
          status, revision, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, NULL, NULL, NULL, NULL, ?, 1, UTC_TIMESTAMP(3), UTC_TIMESTAMP(3))`,
      [
        id,
        input.tenantId,
        input.code,
        name,
        normalizePersianSearch(name),
        input.identificationNumber ?? null,
        input.status ?? 'active',
      ],
    );
    return id;
  }

  describe('the table’s own constraints', () => {
    it('publishes the tenant unique keys, the status check and the search index', async () => {
      const [rows] = await pool.query(`SHOW CREATE TABLE ${TABLE}`);
      const ddl = String((rows as Array<{ 'Create Table': string }>)[0]?.['Create Table'] ?? '');

      expect(ddl).toContain(
        `UNIQUE KEY \`${SUPPLIERS_TENANT_CODE_UNIQUE}\` (\`tenant_id\`,\`code\`)`,
      );
      expect(ddl).toContain(
        `UNIQUE KEY \`${SUPPLIERS_TENANT_IDENTIFICATION_UNIQUE}\` (\`tenant_id\`,\`identification_number\`)`,
      );
      expect(ddl).toContain(
        `KEY \`${SUPPLIERS_TENANT_NORMALIZED_NAME_INDEX}\` (\`tenant_id\`,\`normalized_name\`)`,
      );
      expect(ddl).toContain('CONSTRAINT `suppliers_status_check` CHECK');
      // `tenant_id` is the owner and may never be missing.
      expect(ddl).toContain('`tenant_id` varchar(64) NOT NULL');
    });

    it('refuses a duplicate code within one tenant even for a raw insert', async () => {
      await rawInsert({ tenantId: TENANT_A, code: 'SUP-001' });

      await expect(
        rawInsert({ tenantId: TENANT_A, code: 'SUP-001', name: 'Another name' }),
      ).rejects.toMatchObject({ code: 'ER_DUP_ENTRY' });

      await expect(countRows(TENANT_A)).resolves.toBe(1);
    });

    it('refuses a duplicate identification number within one tenant even for a raw insert', async () => {
      await rawInsert({ tenantId: TENANT_A, code: 'SUP-001', identificationNumber: '14001234567' });

      await expect(
        rawInsert({ tenantId: TENANT_A, code: 'SUP-002', identificationNumber: '14001234567' }),
      ).rejects.toMatchObject({ code: 'ER_DUP_ENTRY' });

      await expect(countRows(TENANT_A)).resolves.toBe(1);
    });

    it('allows the same code and identification number in another tenant', async () => {
      await rawInsert({ tenantId: TENANT_A, code: 'SUP-001', identificationNumber: '14001234567' });
      await rawInsert({ tenantId: TENANT_B, code: 'SUP-001', identificationNumber: '14001234567' });

      await expect(countRows(TENANT_A)).resolves.toBe(1);
      await expect(countRows(TENANT_B)).resolves.toBe(1);
    });

    it('allows many suppliers without an identification number in one tenant', async () => {
      await rawInsert({ tenantId: TENANT_A, code: 'SUP-001' });
      await rawInsert({ tenantId: TENANT_A, code: 'SUP-002' });
      await rawInsert({ tenantId: TENANT_A, code: 'SUP-003' });

      await expect(countRows(TENANT_A)).resolves.toBe(3);
    });

    it('rejects a status the domain does not define', async () => {
      await expect(
        rawInsert({ tenantId: TENANT_A, code: 'SUP-001', status: 'archived' }),
      ).rejects.toMatchObject({ code: expect.stringMatching(/DATA_TRUNCATED/) });
    });

    it('declares a down migration that only drops the table', async () => {
      expect(SUPPLIERS_DOWN_DDL).toEqual([`DROP TABLE IF EXISTS \`${TABLE}\``]);
    });
  });

  describe('translating database refusals into supplier errors', () => {
    it('raises SUPPLIER_CODE_DUPLICATE for a duplicate code without leaking driver text', async () => {
      await inTenant(TENANT_A, () => repository.add(aSupplier({ code: 'SUP-001', name: 'الف' })));

      const failure = await inTenant(TENANT_A, () =>
        repository
          .add(aSupplier({ code: 'sup-001', name: 'ب' }))
          .then(() => undefined)
          .catch((error: unknown) => error),
      );

      expect(failure).toBeInstanceOf(Error);
      const persistence =
        failure as import('../src/shared/persistence/persistence-error.js').PersistenceError;
      expect(persistence.kind).toBe(PersistenceFailureKind.CONFLICT);
      expect(persistence.operation).toBe('SupplierRepository.add');
      expect(persistence.cause).toBeInstanceOf(SupplierCodeDuplicateError);
      expect((persistence.cause as SupplierCodeDuplicateError).code).toBe(
        'SUPPLIER_CODE_DUPLICATE',
      );

      // The driver's own vocabulary stays out of the raised error and its
      // serialized form.
      expect(persistence.message).not.toContain('Duplicate entry');
      expect(persistence.message).not.toContain(SUPPLIERS_TENANT_CODE_UNIQUE);
      expect(JSON.stringify(persistence)).not.toContain('Duplicate entry');
      expect(JSON.stringify(persistence)).not.toContain('suppliers_tenant');
    });

    it('raises SUPPLIER_IDENTIFICATION_DUPLICATE for a duplicate identification number', async () => {
      await inTenant(TENANT_A, () =>
        repository.add(
          aSupplier({ code: 'SUP-001', name: 'الف', identificationNumber: '14001234567' }),
        ),
      );

      const failure = await inTenant(TENANT_A, () =>
        repository
          .add(
            aSupplier({
              code: 'SUP-002',
              name: 'ب',
              identificationNumber: '14001234567',
            }),
          )
          .then(() => undefined)
          .catch((error: unknown) => error),
      );

      const persistence =
        failure as import('../src/shared/persistence/persistence-error.js').PersistenceError;
      expect(persistence.kind).toBe(PersistenceFailureKind.CONFLICT);
      expect(persistence.cause).toBeInstanceOf(SupplierIdentificationDuplicateError);
      expect((persistence.cause as SupplierIdentificationDuplicateError).code).toBe(
        'SUPPLIER_IDENTIFICATION_DUPLICATE',
      );
      expect(persistence.message).not.toContain(SUPPLIERS_TENANT_IDENTIFICATION_UNIQUE);
    });

    it('translates a duplicate code hit by an update, not just an insert', async () => {
      const first = aSupplier({ code: 'SUP-001', name: 'الف' });
      const second = aSupplier({ code: 'SUP-002', name: 'ب' });

      await inTenant(TENANT_A, () => repository.add(first));
      await inTenant(TENANT_A, () => repository.add(second));

      // A rehydrated aggregate pointed at the first supplier's code: no public
      // mutator is needed to simulate a bypassing write.
      const conflicting = Supplier.rehydrate({
        ...second.snapshot(),
        code: 'SUP-001',
        normalizedName: normalizePersianSearch('ب'),
        updatedAt: LATER,
      } satisfies SupplierSnapshot);

      const failure = await inTenant(TENANT_A, () =>
        repository
          .update(conflicting, Revision.initial())
          .then(() => undefined)
          .catch((error: unknown) => error),
      );

      const persistence =
        failure as import('../src/shared/persistence/persistence-error.js').PersistenceError;
      expect(persistence.kind).toBe(PersistenceFailureKind.CONFLICT);
      expect(persistence.operation).toBe('SupplierRepository.update');
      expect(persistence.cause).toBeInstanceOf(SupplierCodeDuplicateError);
    });
  });

  describe('tenant isolation through the central scope', () => {
    it('stores the normalized name the domain computed and reads it back', async () => {
      const supplier = aSupplier({
        code: 'SUP-001',
        name: 'شركت كيميا',
        identificationNumber: '14001234567',
      });

      await inTenant(TENANT_A, () => repository.add(supplier));

      const stored = await inTenant(TENANT_A, () => repository.get(TENANT_A, supplier.id));
      expect(stored).toBeDefined();
      expect(stored?.revision.value).toBe(1);

      const snapshot = stored!.aggregate.snapshot();
      expect(snapshot.code).toBe('SUP-001');
      // Arabic kaf/yeh are folded to the Persian forms the domain normalizes to.
      expect(snapshot.normalizedName).toBe(normalizePersianSearch('شركت كيميا'));
      expect(snapshot.normalizedName).toBe('شرکت کیمیا');
      expect(snapshot.identificationNumber).toBe('14001234567');
    });

    it('cannot read another tenant’s row by a guessed id', async () => {
      const foreign = aSupplier({ tenantId: TENANT_B, code: 'SUP-001', name: 'شرکت ب' });
      await inTenant(TENANT_B, () => repository.add(foreign));

      // The id is real, but it does not belong to tenant A.
      await expect(
        inTenant(TENANT_A, () => repository.get(TENANT_A, foreign.id)),
      ).resolves.toBeUndefined();

      // The same call under the owning tenant finds it.
      await expect(
        inTenant(TENANT_B, () => repository.get(TENANT_B, foreign.id)),
      ).resolves.toBeDefined();
    });

    it('lists and searches only the active tenant’s rows', async () => {
      await inTenant(TENANT_A, () =>
        repository.add(aSupplier({ code: 'SUP-A', name: 'شرکت کیمیا' })),
      );
      await inTenant(TENANT_B, () =>
        repository.add(aSupplier({ tenantId: TENANT_B, code: 'SUP-B', name: 'شرکت کیمیا' })),
      );

      const listed = await inTenant(TENANT_A, () =>
        repository.list({ tenantId: TENANT_A, page: 1, pageSize: 20 }),
      );
      expect(listed.total).toBe(1);
      expect(listed.items.map((item) => item.aggregate.code.value)).toEqual(['SUP-A']);

      const searched = await inTenant(TENANT_A, () =>
        repository.search({ tenantId: TENANT_A, query: 'کیمیا', page: 1, pageSize: 20 }),
      );
      expect(searched.total).toBe(1);
      expect(searched.items[0]?.aggregate.id.value).toBeDefined();
      expect(searched.items.every((item) => item.aggregate.tenantId === TENANT_A)).toBe(true);
    });

    it('refuses to write an aggregate from another tenant', async () => {
      const foreign = aSupplier({ tenantId: TENANT_B, code: 'SUP-001', name: 'شرکت ب' });

      await expect(inTenant(TENANT_A, () => repository.add(foreign))).rejects.toBeInstanceOf(
        TenantIsolationViolationError,
      );

      await expect(countRows(TENANT_B)).resolves.toBe(0);
    });

    it('fails closed when no tenant scope is established', async () => {
      await expect(
        repository.get(TENANT_A, aSupplier({ code: 'SUP-001', name: 'الف' }).id),
      ).rejects.toBeInstanceOf(TenantContextMissingError);
    });
  });

  describe('search via the normalized name and its index', () => {
    it('matches Persian spelling variants within the tenant', async () => {
      await inTenant(TENANT_A, () =>
        repository.add(aSupplier({ code: 'SUP-001', name: 'شرکت کیمیا' })),
      );
      await inTenant(TENANT_A, () =>
        repository.add(aSupplier({ code: 'SUP-002', name: 'شرکت پارس' })),
      );

      // Arabic kaf + Arabic yeh typed instead of Persian keheh + yeh.
      const found = await inTenant(TENANT_A, () =>
        repository.search({ tenantId: TENANT_A, query: 'شركت كيميا', page: 1, pageSize: 20 }),
      );

      expect(found.total).toBe(1);
      expect(found.items[0]?.aggregate.code.value).toBe('SUP-001');
    });

    it('treats LIKE metacharacters as text instead of a wildcard', async () => {
      await inTenant(TENANT_A, () =>
        repository.add(aSupplier({ code: 'SUP-001', name: 'شرکت 100% کیمیا' })),
      );
      await inTenant(TENANT_A, () =>
        repository.add(aSupplier({ code: 'SUP-002', name: 'شرکت دیگر' })),
      );

      const literal = await inTenant(TENANT_A, () =>
        repository.search({ tenantId: TENANT_A, query: '100%', page: 1, pageSize: 20 }),
      );
      expect(literal.total).toBe(1);
      expect(literal.items[0]?.aggregate.code.value).toBe('SUP-001');

      const wildcard = await inTenant(TENANT_A, () =>
        repository.search({ tenantId: TENANT_A, query: '%', page: 1, pageSize: 20 }),
      );
      expect(wildcard.total).toBe(1);
    });

    it('uses the tenant-leading normalized-name index for a prefix search', async () => {
      // Enough rows that a full scan is visibly more expensive than the index.
      for (let index = 0; index < 120; index += 1) {
        await rawInsert({
          tenantId: index % 2 === 0 ? TENANT_A : TENANT_B,
          code: `SUP-${String(index).padStart(3, '0')}`,
          name: `Supplier ${index}`,
        });
      }
      await rawInsert({ tenantId: TENANT_A, code: 'SUP-999', name: 'Acme Trading' });

      const [plan] = await pool.query(
        `EXPLAIN SELECT * FROM ${TABLE}
          WHERE tenant_id = ? AND normalized_name LIKE ?`,
        [TENANT_A, 'acme%'],
      );

      const rows = plan as Array<{ key: string | null; type: string }>;
      expect(rows).toHaveLength(1);
      expect(rows[0]?.key).toBe(SUPPLIERS_TENANT_NORMALIZED_NAME_INDEX);
    });
  });

  describe('optimistic concurrency and races', () => {
    it('compare-and-swaps the revision and refuses a stale write', async () => {
      const supplier = aSupplier({ code: 'SUP-001', name: 'الف' });
      await inTenant(TENANT_A, () => repository.add(supplier));

      const loaded = await inTenant(TENANT_A, () => repository.get(TENANT_A, supplier.id));
      const first = loaded!.aggregate;
      first.deactivate(LATER).valueOrThrow();

      const receipt = await inTenant(TENANT_A, () => repository.update(first, loaded!.revision));
      expect(receipt.revision.value).toBe(2);

      // A second writer still holding the old revision loses.
      const failure = await inTenant(TENANT_A, () =>
        repository
          .update(first, loaded!.revision)
          .then(() => undefined)
          .catch((error: unknown) => error),
      );

      expect(isConcurrencyConflict(failure)).toBe(true);
      expect(staleRevisionOf(failure)?.expected).toBe(1);
      expect(staleRevisionOf(failure)?.actual).toBeUndefined();

      const reread = await inTenant(TENANT_A, () => repository.get(TENANT_A, supplier.id));
      expect(reread?.revision.value).toBe(2);
      expect(reread?.aggregate.isActive()).toBe(false);
    });

    it('leaves exactly one row when two creations of the same code race', async () => {
      const first = aSupplier({ code: 'SUP-RACE', name: 'الف' });
      const second = aSupplier({ code: 'SUP-RACE', name: 'ب' });

      const outcomes = await inTenant(TENANT_A, () =>
        Promise.allSettled([repository.add(first), repository.add(second)]),
      );

      const fulfilled = outcomes.filter((outcome) => outcome.status === 'fulfilled');
      const rejected = outcomes.filter(
        (outcome): outcome is PromiseRejectedResult => outcome.status === 'rejected',
      );

      expect(fulfilled).toHaveLength(1);
      expect(rejected).toHaveLength(1);
      expect(rejected[0]?.reason?.kind).toBe(PersistenceFailureKind.CONFLICT);
      expect(rejected[0]?.reason?.cause).toBeInstanceOf(SupplierCodeDuplicateError);

      await expect(countRows(TENANT_A)).resolves.toBe(1);
    });
  });

  describe('teardown discipline', () => {
    it('deletes only its own rows and leaves the table and journal intact', async () => {
      await rawInsert({ tenantId: TENANT_A, code: 'SUP-A' });
      await rawInsert({ tenantId: TENANT_B, code: 'SUP-B' });
      await rawInsert({ tenantId: '018f0d3e-6d0f-7a4b-9d4e-2b3c4d5e6f82', code: 'SUP-C' });

      await deleteOwnRows();

      await expect(countRows(TENANT_A)).resolves.toBe(0);
      await expect(countRows(TENANT_B)).resolves.toBe(0);
      await expect(countRows('018f0d3e-6d0f-7a4b-9d4e-2b3c4d5e6f82')).resolves.toBe(1);

      const [tables] = await pool.query(`SHOW TABLES LIKE ?`, [TABLE]);
      expect((tables as unknown[]).length).toBe(1);

      const [migrations] = await pool.query('SELECT COUNT(*) AS count FROM __drizzle_migrations');
      expect(Number((migrations as Array<{ count: number }>)[0].count)).toBe(migrationRowsBefore);

      // Leave the database as this spec found it.
      await pool.query(`DELETE FROM ${TABLE} WHERE tenant_id IN (?, ?)`, [
        '018f0d3e-6d0f-7a4b-9d4e-2b3c4d5e6f82',
        TENANT_A,
      ]);
    });
  });

  async function countRows(tenantId: string): Promise<number> {
    const [rows] = await pool.query(`SELECT COUNT(*) AS count FROM ${TABLE} WHERE tenant_id = ?`, [
      tenantId,
    ]);
    return Number((rows as Array<{ count: number }>)[0].count);
  }
});
