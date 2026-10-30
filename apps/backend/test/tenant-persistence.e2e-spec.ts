import { env } from 'node:process';

import { drizzle } from 'drizzle-orm/mysql2';
import { createPool, type Pool } from 'mysql2/promise';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { AppConfigService } from '../src/infrastructure/config/app-config.service.js';
import { loadConfiguration } from '../src/infrastructure/config/configuration.js';
import { loadDotEnvFiles } from '../src/infrastructure/config/dotenv.js';
import type { Database } from '../src/infrastructure/database/database.module.js';
import { DrizzleTransactionRunner } from '../src/infrastructure/database/drizzle-transaction-runner.js';
import { ChangeTenantStatusUseCase } from '../src/modules/tenant/application/use-cases/change-tenant-status.use-case.js';
import { ChangeTenantStatus } from '../src/modules/tenant/application/commands/change-tenant-status.command.js';
import { CreateTenant } from '../src/modules/tenant/application/commands/create-tenant.command.js';
import { CreateTenantUseCase } from '../src/modules/tenant/application/use-cases/create-tenant.use-case.js';
import { GetTenantUseCase } from '../src/modules/tenant/application/use-cases/get-tenant.use-case.js';
import { GetTenant } from '../src/modules/tenant/application/queries/get-tenant.query.js';
import { UpdateTenantUseCase } from '../src/modules/tenant/application/use-cases/update-tenant.use-case.js';
import { UpdateTenant } from '../src/modules/tenant/application/commands/update-tenant.command.js';
import { tenantIdFrom } from '../src/modules/tenant/domain/value-objects/tenant-id.js';
import { DrizzleTenantRepository } from '../src/modules/tenant/infrastructure/persistence/drizzle-tenant.repository.js';
import { ensureTenantSchema } from '../src/modules/tenant/infrastructure/persistence/tenant.schema.js';
import { ConflictError } from '../src/shared/errors/category-errors.js';
import { toConflict } from '../src/shared/persistence/optimistic-concurrency.js';
import { Revision } from '../src/shared/persistence/revision.js';
import { createTenantContext } from '../src/shared/tenant/tenant-context.js';
import { TenantScope } from '../src/shared/tenant/tenant-scope.js';
import { TenantIsolationViolationError } from '../src/shared/tenant/tenant.errors.js';
import type { TransactionBoundary } from '../src/shared/transaction/transaction-boundary.js';
import { createTransactionBoundary } from '../src/shared/transaction/transaction-boundary.js';
import {
  OWNER_USER_ID,
  RecordingOwnerEnrollment,
  RecordingTenantEvents,
} from './support/tenant-doubles.js';

/**
 * Tenant persistence against a real MySQL server (IAM-001).
 *
 * The unit tests prove the use cases over an in-memory repository; these prove
 * the parts only a real server can: the module's own table is created from its
 * DDL, a tenant round-trips through Drizzle, an update advances the revision
 * exactly once, and two writers that read the same revision cannot both commit
 * — the loser's write is refused and reported as the shared conflict.
 *
 * Opt-in, so the required quality gate still runs without infrastructure:
 *
 * ```bash
 * pnpm infra:up
 * MYSQL_INTEGRATION=1 pnpm --filter @accounting-saas/backend test
 * ```
 *
 * The schema is applied by `ensureTenantSchema` (the module's idempotent,
 * versioned DDL) and dropped afterwards, so the run leaves no migration
 * implied.
 */
const integrationEnabled = env.MYSQL_INTEGRATION === '1';

const TENANT_TABLE = 'tenants';

/**
 * Runs `work` inside the scope of one tenant.
 *
 * A tenant's own record belongs to that tenant, so reading or changing it is
 * only possible from inside its scope (IAM-007).
 */
function inTenant<T>(tenantId: string, work: () => Promise<T>): Promise<T> {
  return TenantScope.run(createTenantContext(tenantId), work);
}

describe.skipIf(!integrationEnabled)('tenant persistence (integration)', () => {
  let pool: Pool;
  let database: Database;
  let boundary: TransactionBoundary;
  let repository: DrizzleTenantRepository;

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
    await ensureTenantSchema(database);

    repository = new DrizzleTenantRepository(database);
    boundary = createTransactionBoundary(new DrizzleTransactionRunner(database));
  });

  beforeEach(async () => {
    await pool.query(`DELETE FROM ${TENANT_TABLE}`);
  });

  afterAll(async () => {
    if (pool !== undefined) {
      await pool.query(`DROP TABLE IF EXISTS ${TENANT_TABLE}`);
      await pool.end();
    }
  });

  it('round-trips a tenant and keeps its identity reusable as a tenant context', async () => {
    const events = new RecordingTenantEvents();
    const create = new CreateTenantUseCase(
      repository,
      new RecordingOwnerEnrollment(),
      events,
      boundary,
    );

    const created = await TenantScope.runAsSystem(() =>
      create.execute(new CreateTenant({ ownerUserId: OWNER_USER_ID, name: 'Acme Trading Co.' })),
    );
    expect(created.isOk()).toBe(true);
    const view = created.valueOrThrow();

    const get = new GetTenantUseCase(repository);
    const fetched = await TenantScope.run(createTenantContext(view.id), () =>
      get.execute(new GetTenant({ tenantId: view.id })),
    );

    expect(fetched.valueOrThrow()).toMatchObject({
      id: view.id,
      name: 'Acme Trading Co.',
      status: 'active',
      revision: 1,
    });

    // The tenant identity is a valid tenant identity — same abstraction, no
    // second mechanism.
    expect(createTenantContext(view.id).tenantId).toBe(view.id);
  });

  it('advances the revision by exactly one on an accepted update', async () => {
    const events = new RecordingTenantEvents();
    const create = new CreateTenantUseCase(
      repository,
      new RecordingOwnerEnrollment(),
      events,
      boundary,
    );
    const update = new UpdateTenantUseCase(repository, events, boundary);

    const created = (
      await TenantScope.runAsSystem(() => create.execute(new CreateTenant({ ownerUserId: OWNER_USER_ID, name: 'Before' })))
    ).valueOrThrow();

    const updated = await TenantScope.run(createTenantContext(created.id), () =>
      update.execute(
        new UpdateTenant({ tenantId: created.id, name: 'After', expectedRevision: 1 }),
      ),
    );

    expect(updated.valueOrThrow()).toMatchObject({ name: 'After', revision: 2 });
    const stored = await inTenant(created.id, () => repository.get(tenantIdFrom(created.id)));
    expect(stored?.revision.value).toBe(2);
  });

  it('refuses the second of two writes that read the same revision, keeping the winner', async () => {
    const events = new RecordingTenantEvents();
    const create = new CreateTenantUseCase(
      repository,
      new RecordingOwnerEnrollment(),
      events,
      boundary,
    );
    const changeStatus = new ChangeTenantStatusUseCase(repository, events, boundary);

    const created = (
      await TenantScope.runAsSystem(() => create.execute(new CreateTenant({ ownerUserId: OWNER_USER_ID, name: 'Contended' })))
    ).valueOrThrow();
    const id = tenantIdFrom(created.id);

    // Both writers observe revision 1.
    const first = await inTenant(created.id, () => repository.get(id));
    const second = await inTenant(created.id, () => repository.get(id));
    expect(first?.revision.value).toBe(1);
    expect(second?.revision.value).toBe(1);

    // First write wins: update the profile against revision 1.
    const winner = await TenantScope.run(createTenantContext(created.id), () =>
      new UpdateTenantUseCase(repository, events, boundary).execute(
        new UpdateTenant({ tenantId: created.id, name: 'Winner', expectedRevision: 1 }),
      ),
    );
    expect(winner.valueOrThrow().revision).toBe(2);

    // Second write still believes revision 1: the domain-level concurrency test
    // through the use case refuses it as a conflict.
    const loser = await TenantScope.run(createTenantContext(created.id), () =>
      changeStatus.execute(
        new ChangeTenantStatus({
          tenantId: created.id,
          status: 'inactive',
          expectedRevision: 1,
        }),
      ),
    );
    expect(loser.isFail()).toBe(true);
    expect(loser.errorOrThrow()).toBeInstanceOf(ConflictError);

    const stored = await inTenant(created.id, () => repository.get(id));
    expect(stored?.revision.value).toBe(2);
    expect(stored?.aggregate.name.value).toBe('Winner');
    expect(stored?.aggregate.status.value).toBe('active');
  });

  it('reports a lost race as a distinguishable stale revision at the adapter boundary', async () => {
    const events = new RecordingTenantEvents();
    const create = new CreateTenantUseCase(
      repository,
      new RecordingOwnerEnrollment(),
      events,
      boundary,
    );
    const created = (
      await TenantScope.runAsSystem(() => create.execute(new CreateTenant({ ownerUserId: OWNER_USER_ID, name: 'Racy' })))
    ).valueOrThrow();
    const id = tenantIdFrom(created.id);

    const observed = await inTenant(created.id, () => repository.get(id));
    expect(observed).toBeDefined();

    await inTenant(created.id, () =>
      boundary.execute(() => repository.update(observed!.aggregate, Revision.initial())),
    );

    let failure: unknown;
    try {
      await inTenant(created.id, () =>
        boundary.execute(() => repository.update(observed!.aggregate, Revision.initial())),
      );
    } catch (error) {
      failure = error;
    }

    const conflict = toConflict(failure);
    expect(conflict).toBeInstanceOf(ConflictError);
    expect(conflict?.details[0]).toMatchObject({ code: 'STALE_REVISION', expected: 1 });
    expect((await inTenant(created.id, () => repository.get(id)))?.revision.value).toBe(2);
  });

  it('refuses to read or change a tenant from another tenant’s scope', async () => {
    const events = new RecordingTenantEvents();
    const create = new CreateTenantUseCase(
      repository,
      new RecordingOwnerEnrollment(),
      events,
      boundary,
    );
    const created = (
      await TenantScope.runAsSystem(() => create.execute(new CreateTenant({ ownerUserId: OWNER_USER_ID, name: 'Owned Co.' })))
    ).valueOrThrow();
    const other = (
      await TenantScope.runAsSystem(() => create.execute(new CreateTenant({ ownerUserId: OWNER_USER_ID, name: 'Other Co.' })))
    ).valueOrThrow();

    // The record exists, but not for the other tenant.
    await expect(
      inTenant(other.id, () => repository.get(tenantIdFrom(created.id))),
    ).rejects.toBeInstanceOf(TenantIsolationViolationError);

    // A write of another tenant's aggregate is refused before the statement.
    const stored = await inTenant(created.id, () => repository.get(tenantIdFrom(created.id)));
    await expect(
      inTenant(other.id, () =>
        boundary.execute(() => repository.update(stored!.aggregate, Revision.initial())),
      ),
    ).rejects.toBeInstanceOf(TenantIsolationViolationError);

    // The record is untouched.
    const unchanged = await inTenant(created.id, () => repository.get(tenantIdFrom(created.id)));
    expect(unchanged?.revision.value).toBe(1);
    expect(unchanged?.aggregate.name.value).toBe('Owned Co.');
  });

  it('refuses to create a tenant from inside a tenant scope', async () => {
    const events = new RecordingTenantEvents();
    const create = new CreateTenantUseCase(
      repository,
      new RecordingOwnerEnrollment(),
      events,
      boundary,
    );

    await expect(
      inTenant('018f0d3c-6d0f-7a4b-9d4e-2b3c4d5e6f70', () =>
        create.execute(new CreateTenant({ ownerUserId: OWNER_USER_ID, name: 'Escalated Co.' })),
      ),
    ).rejects.toBeInstanceOf(TenantIsolationViolationError);
  });
});
