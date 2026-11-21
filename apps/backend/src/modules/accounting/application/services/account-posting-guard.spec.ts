import { describe, expect, it } from 'vitest';

import { createTenantContext } from '../../../../shared/tenant/tenant-context.js';
import { TenantScope } from '../../../../shared/tenant/tenant-scope.js';
import { TenantContextMissingError } from '../../../../shared/tenant/tenant.errors.js';
import type { Loaded, WriteReceipt } from '../../../../shared/persistence/repository-ports.js';
import { Revision } from '../../../../shared/persistence/revision.js';
import { DateTime } from '../../../../shared/time/date-time.js';
import { Account } from '../../domain/aggregates/account.js';
import type {
  AccountRepository,
  AccountTreeNode,
} from '../../domain/repositories/account.repository.js';
import { AccountCode } from '../../domain/value-objects/account-code.js';
import { accountIdFrom, type AccountId } from '../../domain/value-objects/account-id.js';
import { AccountType } from '../../domain/value-objects/account-type.js';
import { NormalBalance } from '../../domain/value-objects/account-normal-balance.js';
import type { TenantReference } from '../../domain/value-objects/tenant-reference.js';
import { DefaultAccountPostingGuard } from './default-account-posting-guard.service.js';

/**
 * AccountPostingGuard (ACC-001.6).
 *
 * The guard has one job: turn an account id into "may be posted to" or one of
 * three stable refusals. These tests cover every combination of the three
 * checks (existence, active, postable), the tenant boundary (a foreign account
 * must be indistinguishable from a missing one) and the batch form (all
 * failures in one error, duplicates checked once).
 */

const TENANT_A = '018f0d3c-6d0f-7a4b-9d4e-2b3c4d5e6f70';
const TENANT_B = '018f0d3d-6d0f-7a4b-9d4e-2b3c4d5e6f71';
const NOW = DateTime.parse('2026-11-01T08:00:00.000Z');

/** In-memory port double; maps are keyed by id exactly like the adapter. */
class InMemoryAccountRepository implements AccountRepository {
  private readonly accounts = new Map<string, Account>();

  public seed(...accounts: Account[]): void {
    for (const account of accounts) {
      this.accounts.set(account.id.value, account);
    }
  }

  public async get(id: AccountId): Promise<Loaded<Account> | undefined> {
    const account = this.accounts.get(id.value);
    return account === undefined ? undefined : { aggregate: account, revision: Revision.initial() };
  }

  public async findByTenant(tenantId: TenantReference): Promise<readonly Loaded<Account>[]> {
    return [...this.accounts.values()]
      .filter((account) => account.tenantId === tenantId.value)
      .map((account) => ({ aggregate: account, revision: Revision.initial() }));
  }

  public async loadTree(): Promise<readonly AccountTreeNode[]> {
    return [];
  }

  public async add(): Promise<WriteReceipt> {
    return { revision: Revision.initial() };
  }

  public async update(): Promise<WriteReceipt> {
    return { revision: Revision.initial() };
  }

  public async delete(): Promise<void> {}
}

function anAccount(input: {
  readonly tenantId?: string;
  readonly code: string;
  readonly active?: boolean;
  readonly postable?: boolean;
}): Account {
  return Account.create({
    tenantId: input.tenantId ?? TENANT_A,
    code: AccountCode.from(input.code),
    name: `Account ${input.code}`,
    type: AccountType.ASSET,
    normalBalance: NormalBalance.DEBIT,
    postable: input.postable ?? true,
    active: input.active ?? true,
    system: false,
    now: NOW,
  });
}

function inTenant<T>(tenantId: string, work: () => Promise<T>): Promise<T> {
  return TenantScope.run(createTenantContext(tenantId), work);
}

function guardFor(repository: AccountRepository): DefaultAccountPostingGuard {
  return new DefaultAccountPostingGuard(repository);
}

describe('AccountPostingGuard — one account', () => {
  it('accepts an existing, active, postable account', async () => {
    const account = anAccount({ code: '1100' });
    const repository = new InMemoryAccountRepository();
    repository.seed(account);

    await expect(
      inTenant(TENANT_A, () => guardFor(repository).assertPostable(account.id)),
    ).resolves.toBeUndefined();
  });

  it('rejects a missing account with ACCOUNT_NOT_FOUND', async () => {
    const repository = new InMemoryAccountRepository();

    const failure = await inTenant(TENANT_A, () =>
      guardFor(repository).assertPostable(accountIdFrom('018f0d3c-0000-7a4b-9d4e-2b3c4d5e6f00')),
    ).catch((error: unknown) => error);

    expect(failure).toMatchObject({
      code: 'ACCOUNT_NOT_FOUND',
      category: 'NOT_FOUND',
      details: [
        {
          code: 'ACCOUNT_NOT_FOUND',
          field: 'id',
          accountId: '018f0d3c-0000-7a4b-9d4e-2b3c4d5e6f00',
        },
      ],
    });
  });

  it('rejects an inactive account with ACCOUNT_INACTIVE', async () => {
    const account = anAccount({ code: '1100', active: false });
    const repository = new InMemoryAccountRepository();
    repository.seed(account);

    await expect(
      inTenant(TENANT_A, () => guardFor(repository).assertPostable(account.id)),
    ).rejects.toMatchObject({ code: 'ACCOUNT_INACTIVE', category: 'BUSINESS_RULE' });
  });

  it('rejects a non-postable account with ACCOUNT_NOT_POSTABLE', async () => {
    const account = anAccount({ code: '1100', postable: false });
    const repository = new InMemoryAccountRepository();
    repository.seed(account);

    await expect(
      inTenant(TENANT_A, () => guardFor(repository).assertPostable(account.id)),
    ).rejects.toMatchObject({ code: 'ACCOUNT_NOT_POSTABLE', category: 'BUSINESS_RULE' });
  });

  it('decides existence before lifecycle and lifecycle before postability', async () => {
    const inactiveAndNotPostable = anAccount({ code: '1100', active: false, postable: false });
    const repository = new InMemoryAccountRepository();
    repository.seed(inactiveAndNotPostable);

    await expect(
      inTenant(TENANT_A, () => guardFor(repository).assertPostable(inactiveAndNotPostable.id)),
    ).rejects.toMatchObject({ code: 'ACCOUNT_INACTIVE' });
  });

  it('answers a foreign-tenant account exactly as a missing one', async () => {
    const foreign = anAccount({ tenantId: TENANT_B, code: '2000' });
    const repository = new InMemoryAccountRepository();
    repository.seed(foreign);

    const foreignFailure = await inTenant(TENANT_A, () =>
      guardFor(repository).assertPostable(foreign.id),
    ).catch((error: unknown) => error);

    const missingFailure = await inTenant(TENANT_A, () =>
      guardFor(repository).assertPostable(accountIdFrom('018f0d3c-0000-7a4b-9d4e-2b3c4d5e6f00')),
    ).catch((error: unknown) => error);

    // Same code, category and message — the response cannot confirm that the
    // id exists in another company.
    expect(foreignFailure).toMatchObject({
      code: 'ACCOUNT_NOT_FOUND',
      category: 'NOT_FOUND',
      message: (missingFailure as { message: string }).message,
    });
  });

  it('still refuses a foreign account when the adapter is not tenant-aware', async () => {
    // The double deliberately returns every stored row, including tenant B's,
    // to prove the guard compares the aggregate's tenant itself.
    const foreign = anAccount({ tenantId: TENANT_B, code: '2000', postable: true });
    const repository = new InMemoryAccountRepository();
    repository.seed(foreign);

    await expect(
      inTenant(TENANT_A, () => guardFor(repository).assertPostable(foreign.id)),
    ).rejects.toMatchObject({ code: 'ACCOUNT_NOT_FOUND' });
  });

  it.each([
    { exists: false, active: true, postable: true, expected: 'ACCOUNT_NOT_FOUND' },
    { exists: false, active: false, postable: false, expected: 'ACCOUNT_NOT_FOUND' },
    { exists: true, active: false, postable: true, expected: 'ACCOUNT_INACTIVE' },
    { exists: true, active: false, postable: false, expected: 'ACCOUNT_INACTIVE' },
    { exists: true, active: true, postable: false, expected: 'ACCOUNT_NOT_POSTABLE' },
    { exists: true, active: true, postable: true, expected: undefined },
  ])(
    'maps exists=$exists, active=$active, postable=$postable to $expected',
    async ({ exists, active, postable, expected }) => {
      const repository = new InMemoryAccountRepository();
      const id = accountIdFrom('018f0d3c-0000-7a4b-9d4e-2b3c4d5e6f10');

      if (exists) {
        const account = anAccount({ code: '1100', active, postable });
        repository.seed(account);
        const outcome = await inTenant(TENANT_A, () =>
          guardFor(repository).assertPostable(account.id),
        ).then(
          () => undefined,
          (error: unknown) => error as { code: string },
        );
        expect(outcome?.code).toBe(expected);
        return;
      }

      const outcome = await inTenant(TENANT_A, () => guardFor(repository).assertPostable(id)).then(
        () => undefined,
        (error: unknown) => error as { code: string },
      );
      expect(outcome?.code).toBe(expected);
    },
  );

  it('fails closed with no tenant scope', async () => {
    await expect(
      guardFor(new InMemoryAccountRepository()).assertPostable(
        accountIdFrom('018f0d3c-0000-7a4b-9d4e-2b3c4d5e6f10'),
      ),
    ).rejects.toBeInstanceOf(TenantContextMissingError);
  });
});

describe('AccountPostingGuard — batches', () => {
  it('accepts an empty batch and a batch of valid accounts', async () => {
    const first = anAccount({ code: '1100' });
    const second = anAccount({ code: '1200' });
    const repository = new InMemoryAccountRepository();
    repository.seed(first, second);
    const guard = guardFor(repository);

    await expect(inTenant(TENANT_A, () => guard.assertAllPostable([]))).resolves.toBeUndefined();
    await expect(
      inTenant(TENANT_A, () => guard.assertAllPostable([first.id, second.id])),
    ).resolves.toBeUndefined();
  });

  it('reports every failing account in one error', async () => {
    const valid = anAccount({ code: '1100' });
    const inactive = anAccount({ code: '1200', active: false });
    const notPostable = anAccount({ code: '1300', postable: false });
    const missingId = accountIdFrom('018f0d3c-0000-7a4b-9d4e-2b3c4d5e6f00');
    const repository = new InMemoryAccountRepository();
    repository.seed(valid, inactive, notPostable);

    const outcome = await inTenant(TENANT_A, () =>
      guardFor(repository).assertAllPostable([valid.id, inactive.id, notPostable.id, missingId]),
    ).then(
      () => undefined,
      (error: unknown) => error,
    );

    expect(outcome).toMatchObject({
      code: 'ACCOUNT_INACTIVE',
      details: [
        { code: 'ACCOUNT_INACTIVE', accountId: inactive.id.value },
        { code: 'ACCOUNT_NOT_POSTABLE', accountId: notPostable.id.value },
        { code: 'ACCOUNT_NOT_FOUND', accountId: missingId.value },
      ],
    });
  });

  it('treats a foreign account exactly like a missing one in a batch', async () => {
    const foreign = anAccount({ tenantId: TENANT_B, code: '2000' });
    const repository = new InMemoryAccountRepository();
    repository.seed(foreign);

    const outcome = await inTenant(TENANT_A, () =>
      guardFor(repository).assertAllPostable([foreign.id]),
    ).then(
      () => undefined,
      (error: unknown) => error,
    );

    expect(outcome).toMatchObject({
      code: 'ACCOUNT_NOT_FOUND',
      details: [{ code: 'ACCOUNT_NOT_FOUND', accountId: foreign.id.value }],
    });
  });

  it('checks a duplicated id once', async () => {
    const inactive = anAccount({ code: '1200', active: false });
    const repository = new InMemoryAccountRepository();
    repository.seed(inactive);

    const outcome = await inTenant(TENANT_A, () =>
      guardFor(repository).assertAllPostable([inactive.id, inactive.id]),
    ).then(
      () => undefined,
      (error: unknown) => error as { details: readonly unknown[] },
    );

    expect(outcome?.details).toHaveLength(1);
  });

  it('fails closed with no tenant scope', async () => {
    await expect(
      guardFor(new InMemoryAccountRepository()).assertAllPostable([]),
    ).rejects.toBeInstanceOf(TenantContextMissingError);
  });
});
