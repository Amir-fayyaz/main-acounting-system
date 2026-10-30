import { env } from 'node:process';

import { drizzle } from 'drizzle-orm/mysql2';
import { createPool, type Pool, type RowDataPacket } from 'mysql2/promise';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { AppConfigService } from '../src/infrastructure/config/app-config.service.js';
import { loadConfiguration } from '../src/infrastructure/config/configuration.js';
import { loadDotEnvFiles } from '../src/infrastructure/config/dotenv.js';
import type { Database } from '../src/infrastructure/database/database.module.js';
import { DrizzleTransactionRunner } from '../src/infrastructure/database/drizzle-transaction-runner.js';
import { generateUserId } from '../src/modules/identity/domain/value-objects/user-id.js';
import { tenantReferenceFrom } from '../src/modules/identity/domain/value-objects/tenant-reference.js';
import { DrizzleActiveCompanyPreferenceRepository } from '../src/modules/identity/infrastructure/persistence/drizzle-active-company-preference.repository.js';
import {
  ACTIVE_COMPANY_TABLE_NAME,
  ensureActiveCompanySchema,
} from '../src/modules/identity/infrastructure/persistence/drizzle-active-company.schema.js';
import { EntityId } from '../src/shared/id/entity-id.js';
import { DateTime } from '../src/shared/time/date-time.js';
import { createTransactionBoundary } from '../src/shared/transaction/transaction-boundary.js';
import type { TransactionBoundary } from '../src/shared/transaction/transaction-boundary.js';

/**
 * Active-company persistence against a real MySQL server (IAM-009).
 *
 * The unit tests prove the selection rules over an in-memory port; these prove
 * what only a real server can: the table is created from the module's own DDL,
 * the preference round-trips, and the `user_id` primary key makes selection a
 * replacement rather than a second row.
 *
 * Opt-in, so the required quality gate still runs without infrastructure:
 *
 * ```bash
 * pnpm infra:up
 * MYSQL_INTEGRATION=1 pnpm --filter @accounting-saas/backend test
 * ```
 */
const integrationEnabled = env.MYSQL_INTEGRATION === '1';

describe.skipIf(!integrationEnabled)('active company persistence (integration)', () => {
  let pool: Pool;
  let database: Database;
  let boundary: TransactionBoundary;
  let preferences: DrizzleActiveCompanyPreferenceRepository;

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
    await ensureActiveCompanySchema(database);

    preferences = new DrizzleActiveCompanyPreferenceRepository(database);
    boundary = createTransactionBoundary(new DrizzleTransactionRunner(database));
  });

  beforeEach(async () => {
    await pool.query(`DELETE FROM ${ACTIVE_COMPANY_TABLE_NAME}`);
  });

  afterAll(async () => {
    if (pool !== undefined) {
      await pool.query(`DROP TABLE IF EXISTS ${ACTIVE_COMPANY_TABLE_NAME}`);
      await pool.end();
    }
  });

  it('answers no selection for a user that has never chosen a company', async () => {
    const userId = generateUserId();

    await expect(preferences.findActiveTenant(userId)).resolves.toBeUndefined();
  });

  it('stores the selected company inside the caller transaction', async () => {
    const userId = generateUserId();
    const tenantId = tenantReferenceFrom(EntityId.generate().value);
    const selectedAt = DateTime.now();

    await boundary.execute(async () => {
      await preferences.setActiveTenant(userId, tenantId, selectedAt);
    });

    const stored = await preferences.findActiveTenant(userId);
    expect(stored?.value).toBe(tenantId.value);
  });

  it('replaces the selection instead of keeping a second row', async () => {
    const userId = generateUserId();
    const first = tenantReferenceFrom(EntityId.generate().value);
    const second = tenantReferenceFrom(EntityId.generate().value);

    await preferences.setActiveTenant(userId, first, DateTime.now());
    await preferences.setActiveTenant(userId, second, DateTime.now());

    await expect(preferences.findActiveTenant(userId)).resolves.toMatchObject({
      value: second.value,
    });

    const [rows] = await pool.query<(RowDataPacket & { count: number })[]>(
      `SELECT COUNT(*) AS count FROM ${ACTIVE_COMPANY_TABLE_NAME} WHERE user_id = ?`,
      [userId.value],
    );
    expect(Number(rows[0]?.count)).toBe(1);
  });

  it('keeps one preference per user', async () => {
    const firstUser = generateUserId();
    const secondUser = generateUserId();
    const firstTenant = tenantReferenceFrom(EntityId.generate().value);
    const secondTenant = tenantReferenceFrom(EntityId.generate().value);

    await preferences.setActiveTenant(firstUser, firstTenant, DateTime.now());
    await preferences.setActiveTenant(secondUser, secondTenant, DateTime.now());

    await expect(preferences.findActiveTenant(firstUser)).resolves.toMatchObject({
      value: firstTenant.value,
    });
    await expect(preferences.findActiveTenant(secondUser)).resolves.toMatchObject({
      value: secondTenant.value,
    });
  });
});
