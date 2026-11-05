import type { AuditEvent, Branch, PanelUser, Person } from '../@types';
import { createId, makeMoney } from './mock-utils';

const branchNames = ['دفتر مرکزی', 'شعبه ونک', 'شعبه اصفهان', 'شعبه تبریز'];
const peopleNames = [
  'شرکت آرمان تجارت',
  'فروشگاه نوید',
  'بازرگانی پارس',
  'احمد کریمی',
  'مریم صادقی',
  'گروه صنعتی البرز',
  'داروخانه مهر',
  'رضا حیدری',
  'پخش سپهر',
  'سارا محمدی',
  'تولیدی آریا',
  'کامران اکبری',
];

export function createMockPeople(): Person[] {
  return peopleNames.map((name, index) => ({
    id: createId('person', index + 1),
    name,
    kind: (['customer', 'supplier', 'both'] as const)[index % 3],
    phone: `۰۹۱۲۱۲۳۴۵${String(index).padStart(2, '۰')}`,
    branchName: branchNames[index % branchNames.length],
    receivable: makeMoney(['125000000.00', '0.00', '45000000.00'][index % 3]),
    payable: makeMoney(['0.00', '82000000.00', '15000000.00'][index % 3]),
    currency: 'IRR',
  }));
}

export function createMockBranches(): Branch[] {
  return branchNames.map((name, index) => ({
    id: createId('branch', index + 1),
    code: String(101 + index),
    name,
    managerName: ['علی رضایی', 'مریم صادقی', 'رضا حیدری', 'سارا محمدی'][index],
    cashRegisterCount: index + 1,
    userCount: 4 + index * 2,
    monthlySales: makeMoney(
      ['2400000000.00', '1850000000.00', '1320000000.00', '970000000.00'][index],
    ),
    currency: 'IRR',
    status: index === 3 ? 'inactive' : 'active',
  }));
}

export function createMockUsers(): PanelUser[] {
  const users = [
    ['علی رضایی', 'مدیر مالی'],
    ['مریم صادقی', 'حسابدار ارشد'],
    ['رضا حیدری', 'صندوقدار'],
    ['سارا محمدی', 'حسابدار'],
    ['کامران اکبری', 'مدیر شعبه'],
    ['نگار فرهادی', 'ناظر (فقط مشاهده)'],
  ] as const;

  return users.map(([name, role], index) => ({
    id: createId('user', index + 1),
    name,
    email: `user${index + 1}@example.com`,
    role,
    branchName: branchNames[index % branchNames.length],
    status: index === 5 ? 'inactive' : 'active',
  }));
}

export function createMockAuditEvents(): AuditEvent[] {
  const actions = [
    'ورود کاربر به سامانه',
    'ثبت فاکتور فروش',
    'ثبت سند حسابداری',
    'تغییر وضعیت چک',
    'تغییر سطح دسترسی',
  ];
  const targets = ['فاکتور ۲۲۰۱', 'سند ۱۴۰۵۰۲۴', 'چک ۱۰۲۳', 'حساب بانک ملت'];

  return Array.from({ length: 20 }, (_, index) => ({
    id: createId('audit', index + 1),
    occurredAt: `۱۴۰۵/۰۸/${String(5 - (index % 5)).padStart(2, '۰')} · ${String(9 + (index % 8)).padStart(2, '۰')}:۳۰`,
    actorName: ['علی رضایی', 'مریم صادقی', 'رضا حیدری'][index % 3],
    action: actions[index % actions.length],
    target: targets[index % targets.length],
    result: index % 9 === 0 ? 'failure' : 'success',
  }));
}
