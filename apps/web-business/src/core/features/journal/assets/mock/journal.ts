import type { ChartAccount, JournalEntry } from '../@types';

export const CHART_OF_ACCOUNTS: ChartAccount[] = [
  { code: '۱۱۰۱', name: 'صندوق', label: '۱۱۰۱ - صندوق' },
  { code: '۱۱۰۲', name: 'بانک ملت', label: '۱۱۰۲ - بانک ملت' },
  { code: '۱۱۰۳', name: 'بانک ملی', label: '۱۱۰۳ - بانک ملی' },
  { code: '۱۲۰۱', name: 'حساب‌های دریافتنی', label: '۱۲۰۱ - حساب‌های دریافتنی' },
  { code: '۱۳۰۱', name: 'موجودی کالا', label: '۱۳۰۱ - موجودی کالا' },
  { code: '۲۱۰۱', name: 'حساب‌های پرداختنی', label: '۲۱۰۱ - حساب‌های پرداختنی' },
  { code: '۳۱۰۱', name: 'سرمایه', label: '۳۱۰۱ - سرمایه' },
  { code: '۴۱۰۱', name: 'فروش کالا', label: '۴۱۰۱ - فروش کالا' },
  {
    code: '۵۱۰۱',
    name: 'بهای تمام‌شده کالای فروش‌رفته',
    label: '۵۱۰۱ - بهای تمام‌شده کالای فروش‌رفته',
  },
  { code: '۵۲۰۱', name: 'هزینه اجاره', label: '۵۲۰۱ - هزینه اجاره' },
];

const DESCRIPTIONS = [
  'فروش نقدی',
  'پرداخت اجاره',
  'دریافت از مشتری',
  'خرید کالا',
  'پرداخت حقوق',
  'انتقال بین حساب‌ها',
];

const AMOUNTS = [
  '25000000.00',
  '84000000.00',
  '125000000.00',
  '46000000.00',
  '310000000.00',
  '18000000.00',
];

export function createInitialJournalEntries(): JournalEntry[] {
  return Array.from({ length: 24 }, (_, index) => {
    const entryNumber = 1405024 - index;
    const day = String(Math.max(1, 28 - index)).padStart(2, '0');
    const isDraft = index === 3 || index === 11 || index === 19;

    return {
      id: `journal-${String(index + 1).padStart(4, '0')}`,
      number: String(entryNumber),
      date: `۱۴۰۵/۰۸/${day}`,
      description: DESCRIPTIONS[index % DESCRIPTIONS.length],
      amount: AMOUNTS[index % AMOUNTS.length],
      currency: 'IRR',
      status: isDraft ? 'draft' : 'balanced',
    };
  });
}
