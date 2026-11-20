import type { BankAccount, Cheque, Invoice, JournalEntry, Purchase } from '../@types';
import { padFaDay } from '../../utils/persian-digits';
import { createId, makeMoney } from './mock-utils';

const branches = ['دفتر مرکزی', 'شعبه ونک', 'شعبه اصفهان', 'شعبه تبریز'];
const banks = ['ملی', 'ملت', 'سامان', 'پاسارگاد', 'صادرات'];
const people = [
  'شرکت آرمان تجارت',
  'فروشگاه نوید',
  'بازرگانی پارس',
  'احمد کریمی',
  'مریم صادقی',
  'گروه صنعتی البرز',
  'داروخانه مهر',
  'رضا حیدری',
];

const invoiceStatuses: Invoice['status'][] = ['settled', 'partially-settled', 'unsettled'];

export function createMockBankAccounts(): BankAccount[] {
  const cashAccounts: BankAccount[] = [
    {
      id: createId('account', 1),
      title: 'صندوق اصلی',
      type: 'cash',
      bankName: null,
      accountNumber: null,
      branchName: branches[0],
      balance: makeMoney('1340000000.00'),
      currency: 'IRR',
      status: 'active',
    },
    {
      id: createId('account', 2),
      title: 'صندوق شعبه ونک',
      type: 'cash',
      bankName: null,
      accountNumber: null,
      branchName: branches[1],
      balance: makeMoney('420000000.00'),
      currency: 'IRR',
      status: 'active',
    },
    {
      id: createId('account', 3),
      title: 'تنخواه دفتر',
      type: 'petty-cash',
      bankName: null,
      accountNumber: null,
      branchName: branches[0],
      balance: makeMoney('85000000.00'),
      currency: 'IRR',
      status: 'active',
    },
  ];

  const bankAccounts = banks.map((bank, index): BankAccount => ({
    id: createId('account', index + 4),
    title: `حساب جاری ${bank}`,
    type: 'bank',
    bankName: bank,
    accountNumber: `IR${String(index + 1).padStart(24, '0')}`,
    branchName: branches[index % branches.length],
    balance: makeMoney(
      ['18200000000.00', '12600000000.00', '7400000000.00', '6100000000.00', '3900000000.00'][
        index
      ],
    ),
    currency: 'IRR',
    status: index === 4 ? 'inactive' : 'active',
  }));

  return [...cashAccounts, ...bankAccounts];
}

export function createMockJournalEntries(): JournalEntry[] {
  const descriptions = [
    'فروش نقدی',
    'پرداخت اجاره',
    'دریافت از مشتری',
    'خرید کالا',
    'پرداخت حقوق',
    'انتقال بین حساب‌ها',
  ];

  return Array.from({ length: 24 }, (_, index) => ({
    id: createId('journal', index + 1),
    number: String(1405000 + 24 - index),
    date: `۱۴۰۵/۰۸/${padFaDay(5 - (index % 5))}`,
    description: descriptions[index % descriptions.length],
    amount: makeMoney(['25000000.00', '84000000.00', '125000000.00', '46000000.00'][index % 4]),
    currency: 'IRR',
    status: index % 7 === 0 ? 'draft' : 'balanced',
  }));
}

export function createMockCheques(): Cheque[] {
  const statuses: Cheque['status'][] = [
    'pending',
    'collected',
    'near-due',
    'returned',
    'overdue',
    'endorsed',
  ];

  return Array.from({ length: 18 }, (_, index) => ({
    id: createId('cheque', index + 1),
    direction: index % 2 === 0 ? 'received' : 'issued',
    sayadId: String(1200000000000000 + index * 103),
    counterparty: people[index % people.length],
    bankName: banks[index % banks.length],
    amount: makeMoney(['85000000.00', '120000000.00', '45000000.00', '210000000.00'][index % 4]),
    dueDate: `۱۴۰۵/۰۸/${padFaDay(8 + (index % 20))}`,
    currency: 'IRR',
    status: statuses[index % statuses.length],
  }));
}

export function createMockInvoices(): Invoice[] {
  return Array.from({ length: 18 }, (_, index) => {
    const sampleIndex = index % 3;
    const total = ['125000000.00', '340000000.00', '85000000.00'][sampleIndex];
    const paid = ['125000000.00', '50000000.00', '0.00'][sampleIndex];
    const remaining = ['0.00', '290000000.00', '85000000.00'][sampleIndex];
    const status = invoiceStatuses[sampleIndex];

    return {
      id: createId('invoice', index + 1),
      number: String(2200 + 18 - index),
      customerName: people[index % people.length],
      issueDate: `۱۴۰۵/۰۸/${padFaDay(5 - (index % 5))}`,
      total: makeMoney(total),
      paid: makeMoney(paid),
      remaining: makeMoney(remaining),
      currency: 'IRR',
      status,
    };
  });
}

export function createMockPurchases(): Purchase[] {
  return Array.from({ length: 16 }, (_, index) => ({
    id: createId('purchase', index + 1),
    number: String(830 + 16 - index),
    supplierName: people[(index + 3) % people.length],
    issueDate: `۱۴۰۵/۰۸/${padFaDay(4 - (index % 4))}`,
    total: makeMoney(['72000000.00', '165000000.00', '94000000.00'][index % 3]),
    currency: 'IRR',
    dueDate: `۱۴۰۵/۰۹/${padFaDay(2 + (index % 20))}`,
    status: invoiceStatuses[index % invoiceStatuses.length],
  }));
}

export function createMockPosTerminals(): import('../@types').PosTerminal[] {
  return Array.from({ length: 8 }, (_, index) => ({
    id: createId('pos', index + 1),
    title: `POS ${branches[index % branches.length]}`,
    terminalNumber: String(81000000 + index * 137),
    merchantNumber: String(1000000000 + index * 271),
    bankName: banks[index % banks.length],
    feePercentage: ['۰٫۵', '۰٫۷', '۱'][index % 3],
    settlementAccount: `IR${String(index + 20).padStart(24, '0')}`,
    activatedAt: `۱۴۰۵/۰۷/${padFaDay(10 + index)}`,
    status: index === 6 ? 'inactive' : 'active',
  }));
}

export function createMockTrialBalance(): import('../@types').TrialBalanceRow[] {
  const accounts = [
    ['۱۱۰۱', 'صندوق'],
    ['۱۱۰۲', 'بانک ملت'],
    ['۱۱۰۳', 'بانک ملی'],
    ['۱۲۰۱', 'حساب‌های دریافتنی'],
    ['۱۳۰۱', 'موجودی کالا'],
    ['۲۱۰۱', 'حساب‌های پرداختنی'],
    ['۳۱۰۱', 'سرمایه'],
    ['۴۱۰۱', 'فروش کالا'],
    ['۵۱۰۱', 'بهای تمام‌شده'],
    ['۵۲۰۱', 'هزینه اجاره'],
  ];

  return accounts.map(([code, name], index) => ({
    id: createId('trial', index + 1),
    code,
    name,
    debit: makeMoney(
      index < 5 ? ['125000000.00', '84000000.00', '46000000.00'][index % 3] : '0.00',
    ),
    credit: makeMoney(
      index < 5 ? '0.00' : ['125000000.00', '84000000.00', '46000000.00'][index % 3],
    ),
    currency: 'IRR',
  }));
}
