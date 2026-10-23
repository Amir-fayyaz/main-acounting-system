import { randomUUID } from 'node:crypto';
import { env } from 'node:process';

import { drizzle } from 'drizzle-orm/mysql2';
import { createPool, type Pool, type RowDataPacket } from 'mysql2/promise';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { AppConfigService } from '../src/infrastructure/config/app-config.service.js';
import { loadConfiguration } from '../src/infrastructure/config/configuration.js';
import { loadDotEnvFiles } from '../src/infrastructure/config/dotenv.js';
import type { Database } from '../src/infrastructure/database/database.module.js';
import { DrizzleTransactionRunner } from '../src/infrastructure/database/drizzle-transaction-runner.js';
import type { AuditEntry } from '../src/modules/audit/application/ports/audit-recorder.port.js';
import type { ListTenantAuditRecordsParams } from '../src/modules/audit/application/queries/list-tenant-audit-records.query.js';
import { ListTenantAuditRecords } from '../src/modules/audit/application/queries/list-tenant-audit-records.query.js';
import { ListTenantAuditRecordsUseCase } from '../src/modules/audit/application/use-cases/list-tenant-audit-records.use-case.js';
import { RecordAuditEntryUseCase } from '../src/modules/audit/application/use-cases/record-audit-entry.use-case.js';
import { AuditRecord } from '../src/modules/audit/domain/aggregates/audit-record.js';
import { AuditActor } from '../src/modules/audit/domain/value-objects/audit-actor.js';
import { AuditAction } from '../src/modules/audit/domain/value-objects/audit-action.js';
import { AUDIT_REDACTION_MARKER } from '../src/modules/audit/domain/value-objects/audit-metadata.js';
import { AuditOutcome } from '../src/modules/audit/domain/value-objects/audit-outcome.js';
import { auditRecordIdFrom } from '../src/modules/audit/domain/value-objects/audit-record-id.js';
import { DrizzleAuditRecordQuery } from '../src/modules/audit/infrastructure/persistence/drizzle-audit-record-query.js';
import { DrizzleAuditRecordRepository } from '../src/modules/audit/infrastructure/persistence/drizzle-audit-record.repository.js';
import { ensureAuditRecordSchema } from '../src/modules/audit/infrastructure/persistence/audit-record.schema.js';
import {
  PersistenceError,
  PersistenceFailureKind,
} from '../src/shared/persistence/persistence-error.js';
import { createTenantContext } from '../src/shared/tenant/tenant-context.js';
import { TenantScope } from '../src/shared/tenant/tenant-scope.js';
import { DateTime } from '../src/shared/time/date-time.js';
import type { TransactionBoundary } from '../src/shared/transaction/transaction-boundary.js';
import { createTransactionBoundary } from '../src/shared/transaction/transaction-boundary.js';

/**
 * Audit persistence against a real MySQL server (AUD-001; SHR-004; SHR-005).
 *
 * The unit and HTTP tests prove the module over in-memory ports; these prove the
 * parts only a real server can:
 *
 * - the module's own table is created from its idempotent DDL, and a fact written
 *   through the published contract round-trips through Drizzle unchanged;
 * - an absent tenant is stored as `NULL`, not as an empty string, so a
 *   platform-level fact stays distinguishable from a tenant-scoped one;
 * - a read is scoped in SQL: another tenant's facts and a platform-level fact are
 *   never returned, whatever the criteria say;
 * - the page and the `total` come from the store (filtered, newest first), so the
 *   pagination envelope means what it claims;
 * - context is sanitized on the way in — credential material never reaches the
 *   column;
 * - a record joins the caller's transaction, so a rolled-back operation leaves no
 *   audit record behind and a committed one always has it;
 * - one identity can hold exactly one fact.
 *
 * Opt-in, so the required quality gate still runs without infrastructure:
 *
 * ```bash
 * pnpm infra:up
 * MYSQL_INTEGRATION=1 pnpm --filter @accounting-saas/backend test
 * ```
 *
 * The schema is applied by `ensureAuditRecordSchema` and dropped afterwards, so
 * the run leaves no migration implied.
 */
const integrationEnabled = env.MYSQL_INTEGRATION === '1';

const AUDIT_TABLE = 'audit_records';
const TENANT_A = '018f0d3c-6d0f-7a4b-9d4e-2b3c4d5e6f70';
const TENANT_B = '018f0d3c-6d0f-7a4b-9d4e-2b3c4d5e6f71';
const ACTOR = '018f0d3c-6d0f-7a4b-9d4e-2b3c4d5e6f72';
const OTHER_ACTOR = '018f0d3c-6d0f-7a4b-9d4e-2b3c4d5e6f73';

const NEVER_STORED = 's3cret-value-that-must-not-be-stored';

describe.skipIf(!integrationEnabled)('audit persistence (integration)', () => {
  let pool: Pool;
  let database: Database;
  let boundary: TransactionBoundary;
  let repository: DrizzleAuditRecordRepository;
  let recorder: RecordAuditEntryUseCase;
  let list: ListTenantAuditRecordsUseCase;

  beforeAll(async () => {
    loadDotEnvFiles();

    const config = new AppConfigService(
      loadConfiguration({
        NODE_ENV: 'test',
        MYSQL_HOST: env.MYSQL_HOST,
        MYSQL_PORT: env.MYSQL_PORT,
        MYSQL_DATABASE: env.MYSQL_DATABASE,
        MYSQL_USER: env.MYSQL_USER,
        MYSQL_PASSWORD: env.MYSQL_PASSWORD,
      }),
    );

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
    await ensureAuditRecordSchema(database);

    boundary = createTransactionBoundary(new DrizzleTransactionRunner(database));
    repository = new DrizzleAuditRecordRepository(database);
    recorder = new RecordAuditEntryUseCase(repository, boundary);
    list = new ListTenantAuditRecordsUseCase(new DrizzleAuditRecordQuery(database));
  });

  beforeEach(async () => {
    await pool.query(`DELETE FROM ${AUDIT_TABLE}`);
  });

  afterAll(async () => {
    if (pool !== undefined) {
      await pool.query(`DROP TABLE IF EXISTS ${AUDIT_TABLE}`);
      await pool.end();
    }
  });

  /** States a fact the way a consuming module does: inside a resolved tenant scope. */
  async function recordInTenant(tenantId: string, entry: AuditEntry): Promise<void> {
    await TenantScope.run(createTenantContext(tenantId), () => recorder.record(entry));
  }

  /** Reads a tenant's trail the way the retrieval use case does, under its scope. */
  async function readTenant(
    tenantId: string,
    params: Partial<ListTenantAuditRecordsParams> = {},
  ): ReturnType<ListTenantAuditRecordsUseCase['execute']> {
    return TenantScope.run(createTenantContext(tenantId), () =>
      list.execute(new ListTenantAuditRecords({ tenantId, page: 1, limit: 20, ...params })),
    );
  }

  /** A record with an explicit identity, for the cases that need to name one. */
  function aRecordWithId(id: string, overrides: Partial<Parameters<typeof AuditRecord.create>[0]>) {
    return AuditRecord.create({
      id: auditRecordIdFrom(id),
      action: AuditAction.from('user.signed_in'),
      outcome: AuditOutcome.from('success'),
      actor: AuditActor.user(ACTOR),
      occurredAt: DateTime.now(),
      ...overrides,
    });
  }

  it('creates its table from the module’s DDL and round-trips a fact unchanged', async () => {
    const occurredFrom = DateTime.now();

    await recordInTenant(TENANT_A, {
      action: 'purchase.approved',
      outcome: 'success',
      actorUserId: ACTOR,
      target: { type: 'purchase', id: '018f0d3c-6d0f-7a4b-9d4e-2b3c4d5e6f74' },
      metadata: { amount: '125000.00', currency: 'IRR', approved: true, note: null },
      correlationId: 'request-1',
      causationId: 'command-1',
    });

    const page = (await readTenant(TENANT_A)).valueOrThrow();
    expect(page.total).toBe(1);

    const [record] = page.records;
    expect(record).toMatchObject({
      tenantId: TENANT_A,
      actorType: 'user',
      actorUserId: ACTOR,
      action: 'purchase.approved',
      targetType: 'purchase',
      targetId: '018f0d3c-6d0f-7a4b-9d4e-2b3c4d5e6f74',
      outcome: 'success',
      correlationId: 'request-1',
      causationId: 'command-1',
      metadata: { amount: '125000.00', currency: 'IRR', approved: true, note: null },
    });

    // The instant survives the column with millisecond precision and a UTC zone.
    const stored = DateTime.parse(record.occurredAt).epochMillis;
    expect(stored).toBeGreaterThanOrEqual(occurredFrom.epochMillis - 1);
    expect(stored).toBeLessThanOrEqual(DateTime.now().epochMillis + 1);
  });

  it('stores an absent tenant as NULL and reads it back as absent', async () => {
    // A platform-level fact: no tenant scope was ever established.
    await recorder.record({
      action: 'user.signed_in',
      outcome: 'failure',
      metadata: { reason: 'INVALID_SECRET' },
    });

    const [rows] = await pool.query<
      (RowDataPacket & {
        tenant_id: string | null;
        actor_type: string;
        actor_user_id: string | null;
      })[]
    >(`SELECT tenant_id, actor_type, actor_user_id FROM ${AUDIT_TABLE}`);

    expect(rows).toHaveLength(1);
    expect(rows[0]?.tenant_id).toBeNull();
    // No actor means the system acted, which is a fact — not a missing one.
    expect(rows[0]).toMatchObject({ actor_type: 'system', actor_user_id: null });

    // And no tenant's trail may see it.
    expect((await readTenant(TENANT_A)).valueOrThrow().total).toBe(0);
  });

  it('never returns another tenant’s facts', async () => {
    await recordInTenant(TENANT_A, {
      action: 'user.signed_in',
      outcome: 'success',
      actorUserId: ACTOR,
    });
    await recordInTenant(TENANT_B, {
      action: 'user.signed_in',
      outcome: 'success',
      actorUserId: OTHER_ACTOR,
    });

    const seenByA = (await readTenant(TENANT_A)).valueOrThrow();
    const seenByB = (await readTenant(TENANT_B)).valueOrThrow();

    expect(seenByA.total).toBe(1);
    expect(seenByB.total).toBe(1);
    expect(seenByA.records.map((record) => record.tenantId)).toEqual([TENANT_A]);
    expect(seenByB.records.map((record) => record.tenantId)).toEqual([TENANT_B]);
    expect(seenByA.records[0]?.actorUserId).toBe(ACTOR);
    expect(seenByB.records[0]?.actorUserId).toBe(OTHER_ACTOR);
  });

  it('filters in SQL and counts the filtered set, newest first', async () => {
    const base = DateTime.parse('2026-10-16T09:00:00.000Z').epochMillis;

    await recordInTenant(TENANT_A, {
      action: 'company.created',
      outcome: 'success',
      actorUserId: ACTOR,
    });
    await recordInTenant(TENANT_A, {
      action: 'authorization.denied',
      outcome: 'denied',
      actorUserId: OTHER_ACTOR,
      target: { type: 'tenant', id: TENANT_A },
    });
    await recordInTenant(TENANT_A, {
      action: 'authorization.denied',
      outcome: 'denied',
      actorUserId: ACTOR,
      target: { type: 'tenant', id: TENANT_A },
    });

    // Overwrite the instants directly so the window and the order are provable
    // rather than dependent on how fast three inserts run or on the wall clock.
    await pool.query(`UPDATE ${AUDIT_TABLE} SET occurred_at = ?`, [new Date(base + 3_600_000)]);
    await pool.query(`UPDATE ${AUDIT_TABLE} SET occurred_at = ? WHERE action = ?`, [
      new Date(base),
      'company.created',
    ]);

    const byOutcome = (
      await readTenant(TENANT_A, { outcome: 'denied', page: 1, limit: 1 })
    ).valueOrThrow();
    // The total is the filtered count, not the page: two facts matched, one came back.
    expect(byOutcome.total).toBe(2);
    expect(byOutcome.records).toHaveLength(1);
    expect(byOutcome.records[0]?.outcome).toBe('denied');

    const byActor = (
      await readTenant(TENANT_A, { action: 'authorization.denied', actorUserId: ACTOR })
    ).valueOrThrow();
    expect(byActor.total).toBe(1);

    const byTarget = (
      await readTenant(TENANT_A, { targetType: 'tenant', targetId: TENANT_A })
    ).valueOrThrow();
    expect(byTarget.total).toBe(2);

    const window = (
      await readTenant(TENANT_A, {
        from: '2026-10-16T08:00:00.000Z',
        to: '2026-10-16T09:30:00.000Z',
      })
    ).valueOrThrow();
    expect(window.total).toBe(1);
    expect(window.records[0]?.action).toBe('company.created');

    const secondPage = (await readTenant(TENANT_A, { page: 2, limit: 2 })).valueOrThrow();
    expect(secondPage.total).toBe(3);
    expect(secondPage.records).toHaveLength(1);
  });

  it('refuses a second fact under an identity that already exists', async () => {
    const id = randomUUID();
    await TenantScope.run(createTenantContext(TENANT_A), () =>
      boundary.execute(() => repository.add(aRecordWithId(id, { tenantId: TENANT_A }))),
    );

    let failure: unknown;
    try {
      await TenantScope.run(createTenantContext(TENANT_A), () =>
        boundary.execute(() =>
          repository.add(
            aRecordWithId(id, {
              tenantId: TENANT_A,
              action: AuditAction.from('user.signed_out'),
              occurredAt: DateTime.now(),
            }),
          ),
        ),
      );
    } catch (error) {
      failure = error;
    }

    expect(failure).toBeInstanceOf(PersistenceError);
    expect((failure as PersistenceError).kind).toBe(PersistenceFailureKind.CONFLICT);

    // The first fact is untouched: an audit record cannot be rewritten in place.
    const page = (await readTenant(TENANT_A)).valueOrThrow();
    expect(page.records.map((record) => record.action)).toEqual(['user.signed_in']);
  });

  it('commits with the caller’s transaction and disappears with it', async () => {
    const committed = randomUUID();
    const rolledBack = randomUUID();

    await TenantScope.run(createTenantContext(TENANT_A), () =>
      boundary.execute(() => repository.add(aRecordWithId(committed, { tenantId: TENANT_A }))),
    );

    await expect(
      TenantScope.run(createTenantContext(TENANT_A), () =>
        boundary.execute(async () => {
          await repository.add(aRecordWithId(rolledBack, { tenantId: TENANT_A }));
          throw new Error('the business operation failed after recording');
        }),
      ),
    ).rejects.toThrow('the business operation failed after recording');

    const page = (await readTenant(TENANT_A)).valueOrThrow();
    expect(page.records.map((record) => record.id)).toEqual([committed]);
  });

  it('sanitizes context before it reaches the column', async () => {
    await recordInTenant(TENANT_A, {
      action: 'user.signed_in',
      outcome: 'success',
      actorUserId: ACTOR,
      metadata: {
        sessionId: 'session-1',
        password: NEVER_STORED,
        nested: { refreshToken: NEVER_STORED },
      },
    });

    // What the domain stored: the key keeps its place, the value is gone.
    const page = (await readTenant(TENANT_A)).valueOrThrow();
    expect(page.records[0]?.metadata).toEqual({
      sessionId: 'session-1',
      password: AUDIT_REDACTION_MARKER,
      nested: { refreshToken: AUDIT_REDACTION_MARKER },
    });

    // What the table holds: the secret never reached the row, in any column.
    const [rows] = await pool.query<(RowDataPacket & { metadata: string | null })[]>(
      `SELECT metadata FROM ${AUDIT_TABLE}`,
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]?.metadata ?? '').not.toContain(NEVER_STORED);
    expect(rows[0]?.metadata ?? '').toContain(AUDIT_REDACTION_MARKER);
  });
});
