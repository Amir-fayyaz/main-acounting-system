/**
 * Demo data for the DataTable v2 example page.
 *
 * `date` / `dueDate` are Gregorian ISO date-only strings (`YYYY-MM-DD`) — the
 * contract the table expects for data, filters, the URL, the API and CSV.
 * The UI renders them as Jalali dates.
 */
export type DemoInvoiceStatus = 'paid' | 'partial' | 'unpaid' | 'void';

export interface DemoInvoice {
  id: string;
  no: string;
  customer: string;
  date: string;
  dueDate: string;
  amount: number;
  tax: number;
  status: DemoInvoiceStatus;
}

interface DemoInvoiceSeed {
  customer: string;
  date: string;
  dueDate: string;
  amount: number;
  tax: number;
  status: DemoInvoiceStatus;
}

const SEEDS: DemoInvoiceSeed[] = [
  {
    customer: 'شرکت آرمان تجارت',
    date: '2026-08-03',
    dueDate: '2026-09-02',
    amount: 482000000,
    tax: 43500000,
    status: 'paid',
  },
  {
    customer: 'فروشگاه نوید',
    date: '2026-08-05',
    dueDate: '2026-09-04',
    amount: 127500000,
    tax: 11475000,
    status: 'partial',
  },
  {
    customer: 'بازرگانی پارس',
    date: '2026-08-09',
    dueDate: '2026-09-08',
    amount: 963000000,
    tax: 86700000,
    status: 'unpaid',
  },
  {
    customer: 'احمد کریمی',
    date: '2026-08-12',
    dueDate: '2026-09-11',
    amount: 28500000,
    tax: 2565000,
    status: 'paid',
  },
  {
    customer: 'مریم صادقی',
    date: '2026-08-16',
    dueDate: '2026-09-15',
    amount: 74000000,
    tax: 6660000,
    status: 'void',
  },
  {
    customer: 'گروه صنعتی البرز',
    date: '2026-08-20',
    dueDate: '2026-09-19',
    amount: 1348000000,
    tax: 121320000,
    status: 'partial',
  },
  {
    customer: 'داروخانه مهر',
    date: '2026-08-24',
    dueDate: '2026-09-23',
    amount: 51800000,
    tax: 4662000,
    status: 'unpaid',
  },
  {
    customer: 'پخش سپهر',
    date: '2026-08-28',
    dueDate: '2026-09-27',
    amount: 392000000,
    tax: 35280000,
    status: 'paid',
  },
  {
    customer: 'شرکت آرمان تجارت',
    date: '2026-09-01',
    dueDate: '2026-10-01',
    amount: 218000000,
    tax: 19620000,
    status: 'unpaid',
  },
  {
    customer: 'فروشگاه نوید',
    date: '2026-09-04',
    dueDate: '2026-10-04',
    amount: 64500000,
    tax: 5805000,
    status: 'paid',
  },
  {
    customer: 'بازرگانی پارس',
    date: '2026-09-08',
    dueDate: '2026-10-08',
    amount: 1750000000,
    tax: 157500000,
    status: 'partial',
  },
  {
    customer: 'رضا حیدری',
    date: '2026-09-12',
    dueDate: '2026-10-12',
    amount: 33800000,
    tax: 3042000,
    status: 'paid',
  },
  {
    customer: 'داروخانه مهر',
    date: '2026-09-15',
    dueDate: '2026-10-15',
    amount: 92700000,
    tax: 8343000,
    status: 'unpaid',
  },
  {
    customer: 'گروه صنعتی البرز',
    date: '2026-09-19',
    dueDate: '2026-10-19',
    amount: 561000000,
    tax: 50490000,
    status: 'void',
  },
  {
    customer: 'مریم صادقی',
    date: '2026-09-22',
    dueDate: '2026-10-22',
    amount: 41800000,
    tax: 3762000,
    status: 'paid',
  },
  {
    customer: 'احمد کریمی',
    date: '2026-09-26',
    dueDate: '2026-10-26',
    amount: 156000000,
    tax: 14040000,
    status: 'partial',
  },
  {
    customer: 'پخش سپهر',
    date: '2026-09-30',
    dueDate: '2026-10-30',
    amount: 284000000,
    tax: 25560000,
    status: 'unpaid',
  },
  {
    customer: 'شرکت آرمان تجارت',
    date: '2026-10-04',
    dueDate: '2026-11-03',
    amount: 803000000,
    tax: 72270000,
    status: 'paid',
  },
  {
    customer: 'فروشگاه نوید',
    date: '2026-10-08',
    dueDate: '2026-11-07',
    amount: 47600000,
    tax: 4284000,
    status: 'unpaid',
  },
  {
    customer: 'بازرگانی پارس',
    date: '2026-10-11',
    dueDate: '2026-11-10',
    amount: 1125000000,
    tax: 101250000,
    status: 'partial',
  },
  {
    customer: 'رضا حیدری',
    date: '2026-10-15',
    dueDate: '2026-11-14',
    amount: 22900000,
    tax: 2061000,
    status: 'paid',
  },
  {
    customer: 'داروخانه مهر',
    date: '2026-10-18',
    dueDate: '2026-11-17',
    amount: 38700000,
    tax: 3483000,
    status: 'void',
  },
];

export const DEMO_INVOICES: DemoInvoice[] = SEEDS.map((seed, index) => ({
  ...seed,
  id: `demo-invoice-${index + 1}`,
  no: String(1405100 + SEEDS.length - index),
}));
