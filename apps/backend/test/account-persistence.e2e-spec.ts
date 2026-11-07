import { randomUUID } from 'node:crypto';
import { env } from 'node:process';

import { sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/mysql2';
import { createPool, type Pool } from 'mysql2/promise';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { AppConfigService } from '../src/infrastructure/config/app-config.service.js';
import { loadConfiguration } from '../src/infrastructure/config/configuration.js';
import { loadDotEnvFiles } from '../src/infrastructure/config/dotenv.js';
import type { Database } from '../src/infrastructure/database/database.module.js';
import { PersistenceFailureKind } from '../src/shared/persistence/persistence-error.js';
import {
  isConcurrencyConflict,
  staleRevisionOf,
} from '../src/shared/persistence/optimistic-concurrency.js';
import { Revision } from '../src/shared/persistence/revision.js';
import { DateTime } from '../src/shared/time/date-time.js';
import { Account } from '../src/modules/accounting/domain/aggregates/account.js';
import { AccountCode } from '../src/modules/accounting/domain/value-objects/account-code.js';
import { AccountType } from '../src/modules/accounting/domain/value-objects/account-type.js';
import { NormalBalance } from '../src/modules/accounting/domain/value-objects/account-normal-balance.js';
import { tenantReferenceFrom } from '../src/modules/accounting/domain/value-objects/tenant-reference.js';
import {
  ACCOUNTS_DOWN_DDL,
  ACCOUNTS_TABLE_NAME,
  ensureAccountSchema,
} from '../src/modules/accounting/infrastructure/persistence/account.schema.js';
import { DrizzleAccountRepository } from '../src/modules/accounting/infrastructure/persistence/drizzle-account.repository.js';
import { createTenantContext } from '../src/shared/tenant/tenant-context.js';
import { TenantScope } from '../src/shared/tenant/tenant-scope.js';
import {
  TenantContextMissingError,
  TenantIsolationViolationError,
} from '../src/shared/tenant/tenant.errors.js';

/**
 * Account persistence against a real MySQL server (ACC-001.2).
 *
 * The domain spec (ACC-001.1) proves the invariants; these prove the parts only
 * a real store can:
 *
 * - **the database refuses a duplicate code inside one company** — and allows
 *   the same code in another company;
 * - **a parent from another tenant cannot be referenced** — the composite
 *   `(tenant_id, parent_id)` foreign key refuses it even for a write that never
 *   touched the domain;
 * - **a stale revision is rejected** and the winning row is left untouched
 *   (SHR-008);
 * - **the tree is loaded in one query** — counted on the pool, not assumed — and
 *   assembled into the hierarchy the domain describes;
 * - **tenant isolation** holds for every read and write of the port (IAM-007);
 * - **the migration is reversible** — the down DDL drops what the up DDL
 *   created, and the up DDL applies again cleanly afterwards.
 *
 * Opt-in, so the required quality gate still runs without infrastructure:
 *
 * ```bash
 * pnpm infra:up
 * MYSQL_INTEGRATION=1 pnpm --filter @accounting-saas/backend test
 * ```
 */
const integrationEnabled = env.MYSQL_INTEGRATION === '1';

const TABLE = ACCOUNTS_TABLE_NAME;

const TENANT_A = '018f0d3c-6d0f-7a4b-9d4e-2b3c4d5e6f70';
const TENANT_B = '018f0d3d-6d0f-7a4b-9d4e-2b3c4d5e6f71';

const NOW = DateTime.parse('2026-11-01T08:00:00.000Z');
const LATER = DateTime.parse('2026-11-02T09:30:00.000Z');

/** Runs `work` inside the scope of one tenant. */
function inTenant<T>(tenantId: string, work: () => Promise<T>): Promise<T> {
  return TenantScope.run(createTenantContext(tenantId), work);
}

/** Builds a root account for the given tenant. */
function aRootAccount(input: {
  readonly tenantId?: string;
  readonly code: string;
  readonly name?: string;
  readonly type?: AccountType;
  readonly normalBalance?: NormalBalance;
  readonly postable?: boolean;
  readonly system?: boolean;
}): Account {
  return Account.create({
    tenantId: input.tenantId ?? TENANT_A,
    code: AccountCode.from(input.code),
    name: input.name ?? `Account ${input.code}`,
    type: input.type ?? AccountType.ASSET,
    normalBalance: input.normalBalance ?? NormalBalance.DEBIT,
    postable: input.postable ?? false,
    active: !(input.system ?? false),
    system: input.system ?? false,
    now: NOW,
  });
}

/** Builds a child account under `parent`, inheriting its type and balance. */
function aChildAccount(
  parent: Account,
  input: { readonly code: string; readonly name?: string; readonly postable?: boolean },
): Account {
  return Account.createAsChild({
    parent,
    tenantId: parent.tenantId,
    code: AccountCode.from(input.code),
    name: input.name ?? `Account ${input.code}`,
    type: parent.type,
    normalBalance: parent.normalBalance,
    postable: input.postable ?? false,
    active: true,
    system: false,
    now: NOW,
  });
}

describe.skipIf(!integrationEnabled)('account persistence (integration)', () => {
  let pool: Pool;
  let database: Database;
  let repository: DrizzleAccountRepository;

  beforeAll(async () => {
    loadDotEnvFiles();

    // `loadDotEnvFiles` folded the workspace `.env` into the process
    // environment, so the raw configuration is already complete; only the
    // environment name is forced, so the spec never depends on how it was
    // launched. Naming the credential variables here would duplicate (and
    // drift from) the vocabulary that `secrets.ts` already declares.
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
    await ensureAccountSchema(database);

    repository = new DrizzleAccountRepository(database);
  });

  beforeEach(async () => {
    // Children reference parents, so the deepest rows go first.
    await pool.query(`DELETE FROM ${TABLE} ORDER BY \`level\` DESC`);
  });

  afterAll(async () => {
    if (pool !== undefined) {
      await pool.query(`DELETE FROM ${TABLE} ORDER BY \`level\` DESC`);
      await pool.end();
    }
  });

  /**
   * A raw `INSERT` that never touches the domain, the use case or the adapter —
   * the write a bypassing script or another tool would perform. The database
   * alone must defend the constraints.
   */
  async function rawInsert(input: {
    readonly id?: string;
    readonly tenantId: string;
    readonly code: string;
    readonly level?: number;
    readonly parentId?: string | null;
  }): Promise<string> {
    const id = input.id ?? randomUUID();
    await pool.query(
      `INSERT INTO ${TABLE}
         (id, tenant_id, code, name, \`level\`, parent_id, type, normal_balance,
          postable, active, \`system\`, revision, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, 'asset', 'debit', 0, 1, 0, 1, UTC_TIMESTAMP(3), UTC_TIMESTAMP(3))`,
      [
        id,
        input.tenantId,
        input.code,
        `Raw ${input.code}`,
        input.level ?? 1,
        input.parentId ?? null,
      ],
    );
    return id;
  }

  describe('the table’s own constraints', () => {
    it('publishes the unique keys, the composite parent foreign key and the tree index', async () => {
      const [rows] = await pool.query(`SHOW CREATE TABLE ${TABLE}`);
      const ddl = String((rows as Array<{ 'Create Table': string }>)[0]?.['Create Table'] ?? '');

      // One code per company.
      expect(ddl).toContain('UNIQUE KEY `accounts_tenant_code_unique` (`tenant_id`,`code`)');
      // The key the composite parent foreign key references.
      expect(ddl).toContain('UNIQUE KEY `accounts_tenant_id_unique` (`tenant_id`,`id`)');
      // Tree loading: one index leading with the tenant and the parent.
      expect(ddl).toContain('KEY `accounts_tenant_parent_index` (`tenant_id`,`parent_id`)');
      // The parent must be an account of the same tenant.
      expect(ddl).toMatch(
        /CONSTRAINT `accounts_tenant_parent_fk` FOREIGN KEY \(`tenant_id`, `parent_id`\) REFERENCES `accounts` \(`tenant_id`, `id`\)/,
      );
      // Shape rules the database can check on its own row.
      expect(ddl).toContain('CONSTRAINT `accounts_level_check` CHECK');
      expect(ddl).toContain('CONSTRAINT `accounts_level_parent_check` CHECK');
    });

    it('refuses a duplicate code within one tenant at the database level', async () => {
      await rawInsert({ tenantId: TENANT_A, code: '1000' });

      await expect(rawInsert({ tenantId: TENANT_A, code: '1000' })).rejects.toMatchObject({
        code: 'ER_DUP_ENTRY',
      });

      const [rows] = await pool.query(`SELECT COUNT(*) AS count FROM ${TABLE}`);
      expect(Number((rows as Array<{ count: number }>)[0].count)).toBe(1);
    });

    it('allows the same code in two different tenants', async () => {
      await rawInsert({ tenantId: TENANT_A, code: '1000' });
      await rawInsert({ tenantId: TENANT_B, code: '1000' });

      const [rows] = await pool.query(`SELECT COUNT(*) AS count FROM ${TABLE}`);
      expect(Number((rows as Array<{ count: number }>)[0].count)).toBe(2);
    });

    it('refuses a parent that belongs to another tenant', async () => {
      const foreignParentId = await rawInsert({ tenantId: TENANT_A, code: '1000' });

      // A row of tenant B whose parent only exists in tenant A. The composite
      // key includes the tenant, so this is not even a candidate parent.
      await expect(
        rawInsert({ tenantId: TENANT_B, code: '1100', level: 2, parentId: foreignParentId }),
      ).rejects.toMatchObject({ code: 'ER_NO_REFERENCED_ROW_2' });

      const [rows] = await pool.query(`SELECT COUNT(*) AS count FROM ${TABLE}`);
      expect(Number((rows as Array<{ count: number }>)[0].count)).toBe(1);
    });

    it('refuses a level/parent shape the aggregate would never create', async () => {
      await expect(
        rawInsert({ tenantId: TENANT_A, code: '1000', level: 2, parentId: null }),
      ).rejects.toMatchObject({ code: 'ER_CHECK_CONSTRAINT_VIOLATED' });

      await expect(
        rawInsert({ tenantId: TENANT_A, code: '1001', level: 0, parentId: null }),
      ).rejects.toMatchObject({ code: 'ER_CHECK_CONSTRAINT_VIOLATED' });
    });
  });

  describe('round-tripping through the port and its mapper', () => {
    it('stores a root account, reads it back, and reports the initial revision', async () => {
      const account = aRootAccount({ code: '1000', name: 'Cash' });

      const receipt = await inTenant(TENANT_A, () => repository.add(account));

      expect(receipt.revision.value).toBe(Revision.initial().value);

      const stored = await inTenant(TENANT_A, () => repository.get(account.id));

      expect(stored).toBeDefined();
      expect(stored?.revision.value).toBe(1);

      const snapshot = stored!.aggregate.snapshot();
      expect(snapshot.id).toBe(account.id.value);
      expect(snapshot.tenantId).toBe(TENANT_A);
      expect(snapshot.code).toBe('1000');
      expect(snapshot.name).toBe('Cash');
      expect(snapshot.level).toBe(1);
      expect(snapshot.parentId).toBeNull();
      expect(snapshot.type).toBe('asset');
      expect(snapshot.normalBalance).toBe('debit');
      expect(snapshot.postable).toBe(false);
      expect(snapshot.active).toBe(true);
      expect(snapshot.system).toBe(false);
      // The instants keep their moment through DATETIME(3), not a re-derived one.
      expect(snapshot.createdAt.toDate().toISOString()).toBe(NOW.toDate().toISOString());
      expect(snapshot.updatedAt.toDate().toISOString()).toBe(NOW.toDate().toISOString());
      expect(stored?.aggregate.tenantId).toBe(TENANT_A);
      expect(stored?.aggregate.parentId).toBeNull();
      expect(stored?.aggregate.level).toBe(1);
    });

    it('stores a child account with its derived level, type and normal balance', async () => {
      const parent = aRootAccount({ code: '1000' });
      await inTenant(TENANT_A, () => repository.add(parent));

      const child = aChildAccount(parent, { code: '1100', postable: true });
      await inTenant(TENANT_A, () => repository.add(child));

      const stored = await inTenant(TENANT_A, () => repository.get(child.id));

      expect(stored?.aggregate.level).toBe(2);
      expect(stored?.aggregate.parentId).toBe(parent.id.value);
      expect(stored?.aggregate.type.value).toBe('asset');
      expect(stored?.aggregate.normalBalance.value).toBe('debit');
      expect(stored?.aggregate.postable).toBe(true);
    });

    it('reports a duplicate code as a conflict, never as an overwrite', async () => {
      await inTenant(TENANT_A, () => repository.add(aRootAccount({ code: '1000' })));

      const duplicate = aRootAccount({ code: '1000', name: 'Other cash' });

      await expect(inTenant(TENANT_A, () => repository.add(duplicate))).rejects.toMatchObject({
        kind: PersistenceFailureKind.CONFLICT,
      });

      const [rows] = await pool.query(
        `SELECT name FROM ${TABLE} WHERE tenant_id = ? AND code = ?`,
        [TENANT_A, '1000'],
      );
      expect((rows as Array<{ name: string }>)[0]?.name).toBe('Account 1000');
    });

    it('allows the same code in another tenant through the port', async () => {
      await inTenant(TENANT_A, () => repository.add(aRootAccount({ code: '1000' })));
      await inTenant(TENANT_B, () =>
        repository.add(aRootAccount({ code: '1000', tenantId: TENANT_B })),
      );

      const a = await inTenant(TENANT_A, () =>
        repository.findByTenant(tenantReferenceFrom(TENANT_A)),
      );
      const b = await inTenant(TENANT_B, () =>
        repository.findByTenant(tenantReferenceFrom(TENANT_B)),
      );

      expect(a.map((loaded) => loaded.aggregate.code.value)).toEqual(['1000']);
      expect(b.map((loaded) => loaded.aggregate.code.value)).toEqual(['1000']);
    });
  });

  describe('optimistic concurrency', () => {
    it('rejects a stale update and leaves the winning row untouched', async () => {
      const account = aRootAccount({ code: '1000', name: 'Cash' });
      await inTenant(TENANT_A, () => repository.add(account));

      // Two readers see the same revision, as two concurrent use cases would.
      const first = await inTenant(TENANT_A, () => repository.get(account.id));
      const second = await inTenant(TENANT_A, () => repository.get(account.id));
      expect(first?.revision.value).toBe(1);
      expect(second?.revision.value).toBe(1);

      const winner = first!.aggregate;
      winner.rename('Cash on hand', LATER);
      const receipt = await inTenant(TENANT_A, () => repository.update(winner, first!.revision));
      expect(receipt.revision.value).toBe(2);

      const loser = second!.aggregate;
      loser.rename('Petty cash', LATER);
      const stale = await inTenant(TENANT_A, () =>
        repository.update(loser, second!.revision),
      ).catch((error: unknown) => error);

      expect(isConcurrencyConflict(stale)).toBe(true);
      expect(staleRevisionOf(stale)).toMatchObject({ expected: 1 });

      const stored = await inTenant(TENANT_A, () => repository.get(account.id));
      expect(stored?.revision.value).toBe(2);
      expect(stored?.aggregate.name).toBe('Cash on hand');
    });

    it('advances the revision by exactly one per accepted write', async () => {
      const account = aRootAccount({ code: '1000' });
      await inTenant(TENANT_A, () => repository.add(account));

      let loaded = await inTenant(TENANT_A, () => repository.get(account.id));
      for (const expected of [1, 2, 3]) {
        expect(loaded?.revision.value).toBe(expected);
        const next = loaded!.aggregate;
        next.rename(`Cash ${expected}`, LATER);
        const receipt = await inTenant(TENANT_A, () => repository.update(next, loaded!.revision));
        expect(receipt.revision.value).toBe(expected + 1);
        loaded = await inTenant(TENANT_A, () => repository.get(account.id));
      }

      expect(loaded?.revision.value).toBe(4);
    });
  });

  describe('tree loading', () => {
    /** Seeds 1000 → {1100 → 1110, 1200} for tenant A and a root for tenant B. */
    async function seedForest(): Promise<Account> {
      const root = aRootAccount({ code: '1000' });
      const child = aChildAccount(root, { code: '1100' });
      const grandchild = aChildAccount(child, { code: '1110', postable: true });
      const otherChild = aChildAccount(root, { code: '1200', postable: true });

      await inTenant(TENANT_A, async () => {
        await repository.add(root);
        await repository.add(child);
        await repository.add(grandchild);
        await repository.add(otherChild);
      });
      await inTenant(TENANT_B, () =>
        repository.add(aRootAccount({ tenantId: TENANT_B, code: '2000' })),
      );

      return root;
    }

    it('assembles the hierarchy from a single query — no N+1', async () => {
      await seedForest();

      // Count the statements the repository actually issues: the pool is the
      // only driver surface the adapter can reach, so a per-node follow-up
      // would be visible here.
      const originalQuery = pool.query.bind(pool) as (...args: never[]) => unknown;
      const originalExecute = pool.execute.bind(pool) as (...args: never[]) => unknown;
      let statements = 0;

      const countingQuery = (...args: never[]): unknown => {
        statements += 1;
        return (originalQuery as (...inner: never[]) => unknown)(...args);
      };
      const countingExecute = (...args: never[]): unknown => {
        statements += 1;
        return (originalExecute as (...inner: never[]) => unknown)(...args);
      };

      (pool as unknown as { query: unknown }).query = countingQuery;
      (pool as unknown as { execute: unknown }).execute = countingExecute;

      let tree;
      try {
        tree = await inTenant(TENANT_A, () => repository.loadTree(tenantReferenceFrom(TENANT_A)));
      } finally {
        (pool as unknown as { query: unknown }).query = originalQuery;
        (pool as unknown as { execute: unknown }).execute = originalExecute;
      }

      expect(statements).toBe(1);

      expect(tree.map((node) => node.account.code.value)).toEqual(['1000']);
      const [root] = tree;
      expect(root?.children.map((node) => node.account.code.value)).toEqual(['1100', '1200']);
      expect(root?.children[0]?.children.map((node) => node.account.code.value)).toEqual(['1110']);
      expect(root?.children[0]?.children[0]?.children).toEqual([]);
      // Every node carries the revision its row was read at.
      expect(root?.revision.value).toBe(1);
      expect(root?.children[0]?.children[0]?.revision.value).toBe(1);
    });

    it('loads only the scope’s own chart', async () => {
      await seedForest();

      const tree = await inTenant(TENANT_B, () =>
        repository.loadTree(tenantReferenceFrom(TENANT_B)),
      );

      expect(tree.map((node) => node.account.code.value)).toEqual(['2000']);
    });

    it('lists a tenant’s accounts in code order', async () => {
      await seedForest();

      const flat = await inTenant(TENANT_A, () =>
        repository.findByTenant(tenantReferenceFrom(TENANT_A)),
      );

      expect(flat.map((loaded) => loaded.aggregate.code.value)).toEqual([
        '1000',
        '1100',
        '1110',
        '1200',
      ]);
    });
  });

  describe('tenant isolation', () => {
    it('cannot read another tenant’s account by id — it is simply not there', async () => {
      const foreign = aRootAccount({ tenantId: TENANT_B, code: '2000' });
      await inTenant(TENANT_B, () => repository.add(foreign));

      const read = await inTenant(TENANT_A, () => repository.get(foreign.id));

      expect(read).toBeUndefined();
    });

    it('refuses to read another tenant’s chart by criterion', async () => {
      await expect(
        inTenant(TENANT_A, () => repository.findByTenant(tenantReferenceFrom(TENANT_B))),
      ).rejects.toBeInstanceOf(TenantIsolationViolationError);

      await expect(
        inTenant(TENANT_A, () => repository.loadTree(tenantReferenceFrom(TENANT_B))),
      ).rejects.toBeInstanceOf(TenantIsolationViolationError);
    });

    it('refuses to store another tenant’s account', async () => {
      const foreign = aRootAccount({ tenantId: TENANT_B, code: '2000' });

      await expect(inTenant(TENANT_A, () => repository.add(foreign))).rejects.toBeInstanceOf(
        TenantIsolationViolationError,
      );

      const [rows] = await pool.query(`SELECT COUNT(*) AS count FROM ${TABLE}`);
      expect(Number((rows as Array<{ count: number }>)[0].count)).toBe(0);
    });

    it('refuses to update another tenant’s account', async () => {
      const foreign = aRootAccount({ tenantId: TENANT_B, code: '2000' });
      await inTenant(TENANT_B, () => repository.add(foreign));

      const loaded = await inTenant(TENANT_B, () => repository.get(foreign.id));
      const foreignAggregate = loaded!.aggregate;
      foreignAggregate.rename('Hijacked', LATER);

      await expect(
        inTenant(TENANT_A, () => repository.update(foreignAggregate, loaded!.revision)),
      ).rejects.toBeInstanceOf(TenantIsolationViolationError);

      const [rows] = await pool.query(`SELECT name FROM ${TABLE} WHERE id = ?`, [foreign.id.value]);
      expect((rows as Array<{ name: string }>)[0]?.name).toBe('Account 2000');
    });

    it('refuses every tenant-scoped read with no scope at all — fail closed', async () => {
      await expect(repository.findByTenant(tenantReferenceFrom(TENANT_A))).rejects.toBeInstanceOf(
        TenantContextMissingError,
      );

      await expect(repository.loadTree(tenantReferenceFrom(TENANT_A))).rejects.toBeInstanceOf(
        TenantContextMissingError,
      );

      await expect(repository.get(aRootAccount({ code: '1000' }).id)).rejects.toBeInstanceOf(
        TenantContextMissingError,
      );
    });
  });

  describe('migration reversibility', () => {
    it('drops what the up DDL created and applies again cleanly', async () => {
      // The up migration is already applied (global setup / beforeAll). Seed a
      // row so the reversal provably removes data-bearing state.
      await inTenant(TENANT_A, () => repository.add(aRootAccount({ code: '1000' })));

      for (const statement of ACCOUNTS_DOWN_DDL) {
        await database.execute(sql.raw(statement));
      }

      const [afterDown] = await pool.query(`SHOW TABLES LIKE '${TABLE}'`);
      expect((afterDown as unknown[]).length).toBe(0);
      // The adapter's statements now fail, because the table is gone — the
      // reversal removed the schema, not just the rows.
      await expect(
        inTenant(TENANT_A, () => repository.findByTenant(tenantReferenceFrom(TENANT_A))),
      ).rejects.toBeDefined();

      // Applying the up DDL again restores the schema, empty and usable.
      await ensureAccountSchema(database);
      const [afterUp] = await pool.query(`SHOW TABLES LIKE '${TABLE}'`);
      expect((afterUp as unknown[]).length).toBe(1);

      const [rows] = await pool.query(`SELECT COUNT(*) AS count FROM ${TABLE}`);
      expect(Number((rows as Array<{ count: number }>)[0].count)).toBe(0);

      const fresh = aRootAccount({ code: '1000' });
      const receipt = await inTenant(TENANT_A, () => repository.add(fresh));
      expect(receipt.revision.value).toBe(1);
    });
  });
});
