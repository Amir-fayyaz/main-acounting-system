import { describe, expect, it } from 'vitest';

import { createTenantContext } from '../../../../shared/tenant/tenant-context.js';
import { TenantScope } from '../../../../shared/tenant/tenant-scope.js';
import { PassthroughTransactionBoundary } from '../../../../../test/support/tenant-doubles.js';
import { Account } from '../../domain/aggregates/account.js';
import { AccountType } from '../../domain/value-objects/account-type.js';
import { NormalBalance } from '../../domain/value-objects/account-normal-balance.js';
import { AccountCode } from '../../domain/value-objects/account-code.js';
import { DateTime } from '../../../../shared/time/date-time.js';
import type { AccountRepository } from '../../domain/repositories/account.repository.js';
import type { Loaded, WriteReceipt } from '../../../../shared/persistence/repository-ports.js';
import { Revision } from '../../../../shared/persistence/revision.js';
import { AccountId } from '../../domain/value-objects/account-id.js';
import {
  AccountUsagePort,
  AccountAuditPort,
  AccountAuthorizationPort,
} from '../ports/account.ports.js';
import {
  CreateAccount,
  UpdateAccount,
  DeactivateAccount,
  ReactivateAccount,
  DeleteAccount,
} from '../commands/account.commands.js';
import {
  CreateAccountUseCase,
  UpdateAccountUseCase,
  DeactivateAccountUseCase,
  ReactivateAccountUseCase,
  DeleteAccountUseCase,
} from './account-management.use-case.js';

const TENANT_A = '018f0d3c-6d0f-7a4b-9d4e-2b3c4d5e6f70';

class InMemoryAccountRepository implements AccountRepository {
  private readonly records = new Map<string, { aggregate: Account; revision: Revision }>();

  public seed(account: Account, revision = Revision.initial()): void {
    this.records.set(account.id.value, { aggregate: account, revision });
  }

  public stored(id: string): Account | undefined {
    return this.records.get(id)?.aggregate;
  }

  public async get(id: AccountId): Promise<Loaded<Account> | undefined> {
    const found = this.records.get(id.value);
    return found === undefined
      ? undefined
      : { aggregate: found.aggregate, revision: found.revision };
  }

  public async findByTenant(): Promise<readonly Loaded<Account>[]> {
    return [...this.records.values()].map((record) => ({
      aggregate: record.aggregate,
      revision: record.revision,
    }));
  }

  public async add(account: Account): Promise<WriteReceipt> {
    this.records.set(account.id.value, { aggregate: account, revision: Revision.initial() });
    return { revision: Revision.initial() };
  }

  public async delete(account: Account): Promise<void> {
    this.records.delete(account.id.value);
  }

  public async update(account: Account, expectedRevision: Revision): Promise<WriteReceipt> {
    const current = this.records.get(account.id.value);
    if (current === undefined || !current.revision.equals(expectedRevision)) {
      throw new Error('stale revision');
    }

    const next = expectedRevision.next();
    this.records.set(account.id.value, { aggregate: account, revision: next });
    return { revision: next };
  }

  public async loadTree(): Promise<readonly never[]> {
    return [];
  }
}

class FakeUsagePort implements AccountUsagePort {
  public usedIds = new Set<string>();

  public async isUsed(accountId: string): Promise<boolean> {
    return this.usedIds.has(accountId);
  }
}

class RecordingAuditPort implements AccountAuditPort {
  public readonly entries: Array<{ action: string; accountId: string; tenantId: string }> = [];

  public async record(entry: {
    action: string;
    accountId: string;
    tenantId: string;
  }): Promise<void> {
    this.entries.push(entry);
  }
}

class AlwaysAllowedAuthorizationPort implements AccountAuthorizationPort {
  public async assertCanManageAccounts(tenantId: string): Promise<void> {
    void tenantId;
  }
}

function accountFactory(
  tenantId: string,
  code: string,
  name = 'Account',
  overrides: Partial<{
    parentId: string | null;
    active: boolean;
    postable: boolean;
    system: boolean;
  }> = {},
): Account {
  const now = DateTime.parse('2026-01-01T00:00:00.000Z');
  const base = {
    tenantId,
    code: AccountCode.from(code),
    name,
    type: AccountType.ASSET,
    normalBalance: NormalBalance.DEBIT,
    postable: false,
    active: true,
    system: false,
    now,
  };

  if (overrides.parentId !== undefined) {
    const parent = Account.create({
      ...base,
      id: overrides.parentId ?? undefined,
      tenantId,
      code: AccountCode.from('1000'),
      name: 'Parent',
      type: AccountType.ASSET,
      normalBalance: NormalBalance.DEBIT,
      postable: false,
      active: true,
      system: false,
      now,
    });
    return Account.createAsChild({
      parent,
      code: AccountCode.from(code),
      name,
      type: AccountType.ASSET,
      normalBalance: NormalBalance.DEBIT,
      postable: overrides.postable ?? false,
      active: overrides.active ?? true,
      system: overrides.system ?? false,
      now,
      tenantId,
      id: undefined,
    });
  }

  return Account.create({
    tenantId,
    code: AccountCode.from(code),
    name,
    type: AccountType.ASSET,
    normalBalance: NormalBalance.DEBIT,
    postable: overrides.postable ?? false,
    active: overrides.active ?? true,
    system: overrides.system ?? false,
    now,
  });
}

function inTenant<T>(tenantId: string, work: () => Promise<T>): Promise<T> {
  return TenantScope.run(createTenantContext(tenantId), work);
}

describe('Account management use cases', () => {
  it('creates an account and records an audit entry', async () => {
    const repository = new InMemoryAccountRepository();
    const audit = new RecordingAuditPort();
    const auth = new AlwaysAllowedAuthorizationPort();
    const boundary = new PassthroughTransactionBoundary();
    const createAccount = new CreateAccountUseCase(repository, auth, audit, boundary);

    const outcome = await inTenant(TENANT_A, () =>
      createAccount.execute(
        new CreateAccount({
          code: '1000',
          name: 'Cash',
          type: 'asset',
          normalBalance: 'debit',
          active: true,
          postable: false,
          system: false,
        }),
      ),
    );

    expect(outcome.isOk()).toBe(true);
    expect(outcome.valueOrThrow().code).toBe('1000');
    expect(outcome.valueOrThrow().tenantId).toBe(TENANT_A);
    expect(audit.entries).toHaveLength(1);
    expect(audit.entries[0]?.action).toBe('account.created');
  });

  it('refuses to update a used account', async () => {
    const repository = new InMemoryAccountRepository();
    const used = new FakeUsagePort();
    const audit = new RecordingAuditPort();
    const auth = new AlwaysAllowedAuthorizationPort();
    const boundary = new PassthroughTransactionBoundary();
    const update = new UpdateAccountUseCase(repository, used, auth, audit, boundary);

    const seed = accountFactory(TENANT_A, '1000');
    const accountId = seed.id.value;
    used.usedIds.add(accountId);
    repository.seed(seed);

    const outcome = await inTenant(TENANT_A, () =>
      update.execute(
        new UpdateAccount({
          id: accountId,
          code: '1050',
          revision: 0,
        }),
      ),
    );

    expect(outcome.isFail()).toBe(true);
    expect(outcome.errorOrThrow().code).toBe('ACCOUNT_IN_USE');
  });

  it('refuses to deactivate an account with active children', async () => {
    const repository = new InMemoryAccountRepository();
    const used = new FakeUsagePort();
    const audit = new RecordingAuditPort();
    const auth = new AlwaysAllowedAuthorizationPort();
    const boundary = new PassthroughTransactionBoundary();
    const deactivate = new DeactivateAccountUseCase(repository, used, auth, audit, boundary);

    const parent = accountFactory(TENANT_A, '1000');
    const childWithParent = Account.createAsChild({
      parent,
      code: AccountCode.from('1010'),
      name: 'Child',
      type: AccountType.ASSET,
      normalBalance: NormalBalance.DEBIT,
      postable: false,
      active: true,
      system: false,
      now: DateTime.parse('2026-01-01T00:00:00.000Z'),
      tenantId: TENANT_A,
    });

    repository.seed(parent);
    repository.seed(childWithParent);

    const outcome = await inTenant(TENANT_A, () =>
      deactivate.execute(new DeactivateAccount({ id: parent.id.value, revision: 0 })),
    );

    expect(outcome.isFail()).toBe(true);
    expect(outcome.errorOrThrow().code).toBe('ACCOUNT_HAS_ACTIVE_CHILDREN');
  });

  it('refuses to reactivate when its parent is inactive', async () => {
    const repository = new InMemoryAccountRepository();
    const used = new FakeUsagePort();
    const audit = new RecordingAuditPort();
    const auth = new AlwaysAllowedAuthorizationPort();
    const boundary = new PassthroughTransactionBoundary();
    const reactivate = new ReactivateAccountUseCase(repository, used, auth, audit, boundary);

    const parent = accountFactory(TENANT_A, '1000', 'Parent', { active: false });
    const child = Account.createAsChild({
      parent,
      code: AccountCode.from('1010'),
      name: 'Child',
      type: AccountType.ASSET,
      normalBalance: NormalBalance.DEBIT,
      postable: false,
      active: false,
      system: false,
      now: DateTime.parse('2026-01-01T00:00:00.000Z'),
      tenantId: TENANT_A,
    });

    repository.seed(parent);
    repository.seed(child);

    const outcome = await inTenant(TENANT_A, () =>
      reactivate.execute(new ReactivateAccount({ id: child.id.value, revision: 0 })),
    );

    expect(outcome.isFail()).toBe(true);
    expect(outcome.errorOrThrow().code).toBe('ACCOUNT_PARENT_INACTIVE');
  });

  it('deletes only unused, childless, non-system accounts', async () => {
    const repository = new InMemoryAccountRepository();
    const used = new FakeUsagePort();
    const audit = new RecordingAuditPort();
    const auth = new AlwaysAllowedAuthorizationPort();
    const boundary = new PassthroughTransactionBoundary();
    const deleteAccount = new DeleteAccountUseCase(repository, used, auth, audit, boundary);

    const account = accountFactory(TENANT_A, '2000', 'Sales', {
      system: false,
      postable: false,
      active: true,
    });
    repository.seed(account);

    const outcome = await inTenant(TENANT_A, () =>
      deleteAccount.execute(new DeleteAccount({ id: account.id.value })),
    );

    expect(outcome.isOk()).toBe(true);
    expect(repository.stored(account.id.value)).toBeUndefined();
  });
});
