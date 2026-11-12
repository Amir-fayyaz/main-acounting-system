import type { AccountDto, AccountStatus, AccountType } from '../@types/account.types';
import { ACCOUNT_BANKS } from '../../lib/accounts.config';

const BRANCHES = ['دفتر مرکزی', 'شعبه ونک', 'شعبه اصفهان', 'شعبه تبریز'] as const;

/** مبالغ canonical با تنوع اندازه؛ موجودی اولیه‌ی هر حساب نمایشی. */
const BALANCES = [
  '1250000000.00',
  '845000000.00',
  '320000000.00',
  '9800000000.00',
  '47500000.00',
  '2300000000.00',
  '12000000.00',
  '675000000.00',
  '350000000.00',
  '5400000000.00',
] as const;

interface CashSeed {
  title: string;
  type: Extract<AccountType, 'cash' | 'petty-cash'>;
  branch: string;
}

const CASH_ACCOUNTS: readonly CashSeed[] = [
  { title: 'صندوق اصلی', type: 'cash', branch: 'دفتر مرکزی' },
  { title: 'صندوق شعبه ونک', type: 'cash', branch: 'شعبه ونک' },
  { title: 'صندوق شعبه اصفهان', type: 'cash', branch: 'شعبه اصفهان' },
  { title: 'صندوق شعبه تبریز', type: 'cash', branch: 'شعبه تبریز' },
  { title: 'تنخواه دفتر', type: 'petty-cash', branch: 'دفتر مرکزی' },
  { title: 'تنخواه شعبه ونک', type: 'petty-cash', branch: 'شعبه ونک' },
];

function buildIban(index: number): string {
  // IR + 24 رقم؛ بدون استفاده از number تا نمایش نمایی رخ ندهد.
  const accountPart = String(index + 1).padStart(6, '0');

  return `IR${accountPart}000000000000000000`;
}

function resolveStatus(index: number): AccountStatus {
  return index % 7 === 3 ? 'inactive' : 'active';
}

function buildBankAccounts(): AccountDto[] {
  return ACCOUNT_BANKS.flatMap((bank, bankIndex) =>
    BRANCHES.map((branch, branchIndex) => {
      const index = CASH_ACCOUNTS.length + bankIndex * BRANCHES.length + branchIndex;

      return {
        id: `account-${String(1001 + index).padStart(4, '0')}`,
        revision: 1 + (index % 3),
        title: `حساب جاری ${bank} ${branch}`,
        type: 'bank' as const,
        bank,
        iban: buildIban(index),
        branch,
        balance: {
          amount: BALANCES[index % BALANCES.length] ?? '0.00',
          currency: 'IRR' as const,
        },
        status: resolveStatus(index),
      };
    }),
  );
}

function buildCashAccounts(): AccountDto[] {
  return CASH_ACCOUNTS.map((seed, index) => ({
    id: `account-${String(1001 + index).padStart(4, '0')}`,
    revision: 1 + (index % 3),
    title: seed.title,
    type: seed.type,
    bank: null,
    iban: null,
    branch: seed.branch,
    balance: {
      amount: BALANCES[index % BALANCES.length] ?? '0.00',
      currency: 'IRR' as const,
    },
    status: resolveStatus(index),
  }));
}

/** حداقل ۲۴ حساب نمایشی با تنوع نوع، بانک، شعبه، موجودی و وضعیت. */
export function createMockAccountDtos(): AccountDto[] {
  return [...buildCashAccounts(), ...buildBankAccounts()];
}
