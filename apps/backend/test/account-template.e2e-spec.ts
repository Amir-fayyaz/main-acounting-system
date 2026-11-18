import { env } from 'node:process';

import { drizzle } from 'drizzle-orm/mysql2';
import { createPool, type Pool } from 'mysql2/promise';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { AppConfigService } from '../src/infrastructure/config/app-config.service.js';
import { loadConfiguration } from '../src/infrastructure/config/configuration.js';
import { loadDotEnvFiles } from '../src/infrastructure/config/dotenv.js';
import type { Database } from '../src/infrastructure/database/database.module.js';
import { DrizzleTransactionRunner } from '../src/infrastructure/database/drizzle-transaction-runner.js';
import { createTransactionBoundary } from '../src/shared/transaction/transaction-boundary.js';
import { createTenantContext } from '../src/shared/tenant/tenant-context.js';
import { TenantScope } from '../src/shared/tenant/tenant-scope.js';
import type { TransactionBoundary } from '../src/shared/transaction/transaction-boundary.js';
import { ActivateStandardChart } from '../src/modules/accounting/application/commands/activate-standard-chart.command.js';
import type {
  AccountAuditPort,
  AccountAuthorizationPort,
} from '../src/modules/accounting/application/ports/account.ports.js';
import { ActivateStandardChartUseCase } from '../src/modules/accounting/application/use-cases/activate-standard-chart.use-case.js';
import type { Account } from '../src/modules/accounting/domain/aggregates/account.js';
import type { AccountRepository } from '../src/modules/accounting/domain/repositories/account.repository.js';
import { STANDARD_CHART_TEMPLATE } from '../src/modules/accounting/domain/templates/standard-chart.template.js';
import { tenantReferenceFrom } from '../src/modules/accounting/domain/value-objects/tenant-reference.js';
import {
  ACCOUNT_TEMPLATE_APPLICATIONS_TABLE_NAME,
  ensureAccountTemplateSchema,
} from '../src/modules/accounting/infrastructure/persistence/account-template.schema.js';
import {
  ACCOUNTS_TABLE_NAME,
  ensureAccountSchema,
} from '../src/modules/accounting/infrastructure/persistence/account.schema.js';
import { DrizzleAccountTemplateApplicationRepository } from '../src/modules/accounting/infrastructure/persistence/drizzle-account-template.repository.js';
import { DrizzleAccountRepository } from '../src/modules/accounting/infrastructure/persistence/drizzle-account.repository.js';

const integrationEnabled = env.MYSQL_INTEGRATION === '1';

const TENANT_A = '018f0d3c-6d0f-7a4b-9d4e-2b3c4d5e6f70';
const TENANT_B = '018f0d3d-6d0f-7a4b-9d4e-2b3c4d5e6f71';

function inTenant<T>(tenantId: string, work: () => Promise<T>): Promise<T> {
  return TenantScope.run(createTenantContext(tenantId), work);
}

class AllowAllAuthorization implements AccountAuthorizationPort {
  public async assertCanManageAccounts(): Promise<void> {}
}

class RecordingAudit implements AccountAuditPort {
  public readonly entries: Array<{ action: string; tenantId: string }> = [];

  public async record(entry: { action: string; tenantId: string }): Promise<void> {
    this.entries.push({ action: entry.action, tenantId: entry.tenantId });
  }
}

class FailingAccountRepository implements AccountRepository {
  private addCalls = 0;

  public constructor(
    private readonly inner: AccountRepository,
    private readonly failOnCall: number,
  ) {}

  public get(...args: Parameters<AccountRepository['get']>) {
    return this.inner.get(...args);
  }

  public findByTenant(...args: Parameters<AccountRepository['findByTenant']>) {
    return this.inner.findByTenant(...args);
  }

  public loadTree(...args: Parameters<AccountRepository['loadTree']>) {
    return this.inner.loadTree(...args);
  }

  public async add(account: Account) {
    this.addCalls += 1;
    if (this.addCalls === this.failOnCall) {
      throw new Error('forced mid-activation failure');
    }
    return this.inner.add(account);
  }

  public update(...args: Parameters<AccountRepository['update']>) {
    return this.inner.update(...args);
  }

  public delete(...args: Parameters<AccountRepository['delete']>) {
    return this.inner.delete(...args);
  }
}

describe.skipIf(!integrationEnabled)('standard chart activation (integration)', () => {
  let pool: Pool;
  let database: Database;
  let repository: DrizzleAccountRepository;
  let applications: DrizzleAccountTemplateApplicationRepository;
  let boundary: TransactionBoundary;
  let audit: RecordingAudit;

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
    await ensureAccountSchema(database);
    await ensureAccountTemplateSchema(database);

    repository = new DrizzleAccountRepository(database);
    applications = new DrizzleAccountTemplateApplicationRepository(database);
    boundary = createTransactionBoundary(new DrizzleTransactionRunner(database));
    audit = new RecordingAudit();
  });

  beforeEach(async () => {
    await pool.query(`DELETE FROM ${ACCOUNT_TEMPLATE_APPLICATIONS_TABLE_NAME}`);
    await pool.query(`DELETE FROM ${ACCOUNTS_TABLE_NAME} ORDER BY \`level\` DESC`);
  });

  afterAll(async () => {
    if (pool !== undefined) {
      await pool.query(`DELETE FROM ${ACCOUNT_TEMPLATE_APPLICATIONS_TABLE_NAME}`);
      await pool.query(`DELETE FROM ${ACCOUNTS_TABLE_NAME} ORDER BY \`level\` DESC`);
      await pool.end();
    }
  });

  function useCase(accounts: AccountRepository = repository): ActivateStandardChartUseCase {
    return new ActivateStandardChartUseCase(
      accounts,
      applications,
      new AllowAllAuthorization(),
      audit,
      boundary,
    );
  }

  function command(): ActivateStandardChart {
    return new ActivateStandardChart({ templateVersion: STANDARD_CHART_TEMPLATE.version });
  }

  async function accountCountFor(tenantId: string): Promise<number> {
    return inTenant(tenantId, async () => {
      const accounts = await repository.findByTenant(tenantReferenceFrom(tenantId));
      return accounts.length;
    });
  }

  async function applicationCount(): Promise<number> {
    const [rows] = await pool.query(
      `SELECT COUNT(*) AS count FROM ${ACCOUNT_TEMPLATE_APPLICATIONS_TABLE_NAME}`,
    );
    return Number((rows as Array<{ count: number }>)[0]?.count ?? 0);
  }

  it('creates the full tree for the current tenant only', async () => {
    const outcome = await inTenant(TENANT_A, () => useCase().execute(command()));

    expect(outcome.isOk()).toBe(true);
    const view = outcome.valueOrThrow();
    expect(view.templateVersion).toBe(STANDARD_CHART_TEMPLATE.version);
    expect(view.createdCount).toBe(STANDARD_CHART_TEMPLATE.accounts.length);

    expect(await accountCountFor(TENANT_A)).toBe(STANDARD_CHART_TEMPLATE.accounts.length);
    expect(await accountCountFor(TENANT_B)).toBe(0);

    const tree = await inTenant(TENANT_A, () => repository.loadTree(tenantReferenceFrom(TENANT_A)));
    expect(tree.map((node) => node.account.code.value)).toEqual(['1', '2', '3', '4', '5']);
    expect(tree.every((node) => node.account.system)).toBe(true);
    expect(audit.entries).toContainEqual({
      action: 'account.template.activated',
      tenantId: TENANT_A,
    });
  });

  it('derives levels and parents, and only leaves are postable', async () => {
    await inTenant(TENANT_A, () => useCase().execute(command()));

    const accounts = await inTenant(TENANT_A, () =>
      repository.findByTenant(tenantReferenceFrom(TENANT_A)),
    );
    const byCode = new Map(accounts.map((entry) => [entry.aggregate.code.value, entry.aggregate]));

    for (const entry of STANDARD_CHART_TEMPLATE.accounts) {
      const account = byCode.get(entry.code);
      expect(account).toBeDefined();
      expect(account!.system).toBe(true);
      expect(account!.active).toBe(true);
      expect(account!.postable).toBe(entry.postable);

      if (entry.parentCode === null) {
        expect(account!.parentId).toBeNull();
        expect(account!.level).toBe(1);
      } else {
        const parent = byCode.get(entry.parentCode);
        expect(account!.parentId).toBe(parent!.id.value);
        expect(account!.level).toBe(parent!.level + 1);
      }
    }
  });

  it('is idempotent per tenant and template version', async () => {
    await inTenant(TENANT_A, () => useCase().execute(command()));
    const countAfterFirst = await accountCountFor(TENANT_A);

    const second = await inTenant(TENANT_A, () => useCase().execute(command()));

    expect(second.isOk()).toBe(false);
    expect(second.errorOrThrow().code).toBe('ACCOUNT_TEMPLATE_ALREADY_APPLIED');
    expect(await accountCountFor(TENANT_A)).toBe(countAfterFirst);
    expect(await applicationCount()).toBe(1);
  });

  it('leaves no partial chart when activation fails midway', async () => {
    const failing = new FailingAccountRepository(repository, 3);
    const outcome = inTenant(TENANT_A, () => useCase(failing).execute(command()));

    await expect(outcome).rejects.toThrow('forced mid-activation failure');
    expect(await accountCountFor(TENANT_A)).toBe(0);
    expect(await applicationCount()).toBe(0);
  });

  it('activates two tenants independently with the same codes', async () => {
    await inTenant(TENANT_A, () => useCase().execute(command()));
    await inTenant(TENANT_B, () => useCase().execute(command()));

    expect(await accountCountFor(TENANT_A)).toBe(STANDARD_CHART_TEMPLATE.accounts.length);
    expect(await accountCountFor(TENANT_B)).toBe(STANDARD_CHART_TEMPLATE.accounts.length);
    expect(await applicationCount()).toBe(2);
  });

  it('refuses activation when a template code already exists', async () => {
    const existing = await inTenant(TENANT_A, () => useCase().execute(command()));
    expect(existing.isOk()).toBe(true);

    await pool.query(`DELETE FROM ${ACCOUNT_TEMPLATE_APPLICATIONS_TABLE_NAME}`);

    const outcome = await inTenant(TENANT_A, () => useCase().execute(command()));

    expect(outcome.isOk()).toBe(false);
    expect(outcome.errorOrThrow().code).toBe('ACCOUNT_CODE_DUPLICATE');
  });
});
