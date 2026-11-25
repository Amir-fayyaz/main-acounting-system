import { describe, expect, it } from 'vitest';

import { createTenantContext } from '../../../../shared/tenant/tenant-context.js';
import { TenantScope } from '../../../../shared/tenant/tenant-scope.js';
import { DateTime } from '../../../../shared/time/date-time.js';
import { Account } from '../../domain/aggregates/account.js';
import { AccountCode } from '../../domain/value-objects/account-code.js';
import { AccountType } from '../../domain/value-objects/account-type.js';
import { NormalBalance } from '../../domain/value-objects/account-normal-balance.js';
import { InMemoryAccountRepository } from '../../../../../test/support/account-doubles.js';
import { GetAccountTreeUseCase, ListAccountsUseCase } from './account-query.use-case.js';

const TENANT_A = '018f0d3c-6d0f-7a4b-9d4e-2b3c4d5e6f70';
const TENANT_B = '018f0d3d-6d0f-7a4b-9d4e-2b3c4d5e6f71';
const NOW = DateTime.parse('2026-11-01T08:00:00.000Z');

function root(tenantId: string, code: string, name: string, postable = false): Account {
  return Account.create({
    tenantId,
    code: AccountCode.from(code),
    name,
    type: AccountType.ASSET,
    normalBalance: NormalBalance.DEBIT,
    postable,
    active: true,
    system: false,
    now: NOW,
  });
}

function child(parent: Account, code: string, name: string, postable = true): Account {
  return Account.createAsChild({
    parent,
    tenantId: parent.tenantId,
    code: AccountCode.from(code),
    name,
    type: parent.type,
    normalBalance: parent.normalBalance,
    postable,
    active: true,
    system: false,
    now: NOW,
  });
}

function inTenant<T>(tenantId: string, work: () => Promise<T>): Promise<T> {
  return TenantScope.run(createTenantContext(tenantId), work);
}

describe('ListAccountsUseCase', () => {
  it('searches code and name with Persian normalization and combines filters', async () => {
    const repository = new InMemoryAccountRepository();
    const bank = root(TENANT_A, '1100', 'بانک ملت');
    const cash = child(bank, '1101', 'صندوق', true);
    repository.seed(bank);
    repository.seed(cash);

    const list = new ListAccountsUseCase(repository);

    const kaf = await inTenant(TENANT_A, () => list.execute({ search: 'بانك' }));
    expect(kaf.valueOrThrow().map((account) => account.code)).toEqual(['1100']);

    const digits = await inTenant(TENANT_A, () => list.execute({ search: '۱۱۰۱' }));
    expect(digits.valueOrThrow().map((account) => account.code)).toEqual(['1101']);

    const postable = await inTenant(TENANT_A, () => list.execute({ postable: true }));
    expect(postable.valueOrThrow().map((account) => account.code)).toEqual(['1101']);
  });

  it("never lists another company's accounts", async () => {
    const repository = new InMemoryAccountRepository();
    repository.seed(root(TENANT_A, '1100', 'بانک'));
    repository.seed(root(TENANT_B, '1100', 'بانک دیگر'));

    const list = new ListAccountsUseCase(repository);
    const result = await inTenant(TENANT_A, () => list.execute({}));

    expect(result.valueOrThrow()).toHaveLength(1);
    expect(result.valueOrThrow()[0]?.tenantId).toBe(TENANT_A);
  });
});

describe('GetAccountTreeUseCase', () => {
  it('returns the whole forest, then one subtree by root id', async () => {
    const repository = new InMemoryAccountRepository();
    const bank = root(TENANT_A, '1100', 'بانک');
    const cash = child(bank, '1101', 'صندوق');
    repository.seed(bank);
    repository.seed(cash);

    const tree = new GetAccountTreeUseCase(repository);

    const all = await inTenant(TENANT_A, () => tree.execute({}));
    expect(all.valueOrThrow().roots).toHaveLength(1);
    expect(all.valueOrThrow().roots[0]?.children).toHaveLength(1);

    const subtree = await inTenant(TENANT_A, () => tree.execute({ rootId: bank.id.value }));
    expect(subtree.valueOrThrow().roots).toHaveLength(1);
    expect(subtree.valueOrThrow().roots[0]?.code).toBe('1100');
  });

  it('treats a foreign root id as missing', async () => {
    const repository = new InMemoryAccountRepository();
    const foreign = root(TENANT_B, '1100', 'بانک');
    repository.seed(foreign);

    const tree = new GetAccountTreeUseCase(repository);
    const result = await inTenant(TENANT_A, () => tree.execute({ rootId: foreign.id.value }));

    expect(result.isFail()).toBe(true);
    expect(result.errorOrThrow().code).toBe('ACCOUNT_NOT_FOUND');
  });
});
