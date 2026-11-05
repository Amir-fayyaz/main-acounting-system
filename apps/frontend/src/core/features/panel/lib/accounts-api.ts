import type { BankAccount } from '../assets/@types';
import { createMockBankAccounts } from '../assets/mock/finance';
import { createMockResource } from './mock-api-utils';

export type CreateBankAccountInput = Omit<BankAccount, 'id'>;

const accountsApi = createMockResource<BankAccount, CreateBankAccountInput>({
  initialData: createMockBankAccounts(),
  idPrefix: 'account',
  getSearchText: (account) =>
    [account.title, account.type, account.bankName, account.branchName].filter(Boolean).join(' '),
  createEntity: (input, id) => ({ ...input, id }),
});

export const listAccounts = accountsApi.list;
export const createAccount = accountsApi.create;
