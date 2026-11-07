import type {
  FiscalAuditLog,
  FiscalDemoMode,
  FiscalPeriod,
  FiscalPeriodsDataset,
  FiscalPeriodStatus,
  FiscalYear,
} from '../@types/fiscal-periods.types';

/** سال مالی جاری نمونه؛ امروز ۱۴۰۵/۰۸/۱۶ فرض شده است. */
export const FISCAL_YEAR_MOCK: FiscalYear = {
  id: 'year-1405',
  title: 'سال مالی ۱۴۰۵',
  from: '1405/01/01',
  to: '1405/12/29',
};

interface PeriodRange {
  name: string;
  from: string;
  to: string;
}

const PERIOD_RANGES: readonly PeriodRange[] = [
  { name: 'فروردین ۱۴۰۵', from: '1405/01/01', to: '1405/01/31' },
  { name: 'اردیبهشت ۱۴۰۵', from: '1405/02/01', to: '1405/02/31' },
  { name: 'خرداد ۱۴۰۵', from: '1405/03/01', to: '1405/03/31' },
  { name: 'تیر ۱۴۰۵', from: '1405/04/01', to: '1405/04/31' },
  { name: 'مرداد ۱۴۰۵', from: '1405/05/01', to: '1405/05/31' },
  { name: 'شهریور ۱۴۰۵', from: '1405/06/01', to: '1405/06/31' },
  { name: 'مهر ۱۴۰۵', from: '1405/07/01', to: '1405/07/30' },
  { name: 'آبان ۱۴۰۵', from: '1405/08/01', to: '1405/08/30' },
  { name: 'آذر ۱۴۰۵', from: '1405/09/01', to: '1405/09/30' },
  { name: 'دی ۱۴۰۵', from: '1405/10/01', to: '1405/10/30' },
  { name: 'بهمن ۱۴۰۵', from: '1405/11/01', to: '1405/11/30' },
  { name: 'اسفند ۱۴۰۵', from: '1405/12/01', to: '1405/12/29' },
];

/** وضعیت پایه: دوره‌های گذشته بسته، دوره‌ی جاری باز و «مرداد» بازگشایی‌شده است. */
const BASE_STATUSES: readonly FiscalPeriodStatus[] = [
  'closed',
  'closed',
  'closed',
  'closed',
  'reopened',
  'closed',
  'review',
  'open',
  'open',
  'open',
  'open',
  'open',
];

const FISCAL_AUDIT_LOG_MOCK: readonly FiscalAuditLog[] = [
  {
    id: 'log-2',
    at: '۱۴۰۵/۰۸/۱۲ ۱۰:۲۴',
    actor: 'علی رضایی',
    action: 'بازگشایی دوره',
    periodName: 'مرداد ۱۴۰۵',
    reason: 'اصلاح سند هزینه‌ی اجاره که با تاریخ اشتباه ثبت شده بود.',
  },
  {
    id: 'log-1',
    at: '۱۴۰۵/۰۸/۱۰ ۱۶:۰۵',
    actor: 'علی رضایی',
    action: 'بستن دوره',
    periodName: 'مرداد ۱۴۰۵',
  },
];

function buildPeriods(year: FiscalYear, statuses: readonly FiscalPeriodStatus[]): FiscalPeriod[] {
  return PERIOD_RANGES.map((range, index) => ({
    id: `${year.id}-period-${index + 1}`,
    yearId: year.id,
    name: range.name,
    from: range.from,
    to: range.to,
    status: statuses[index] ?? 'closed',
  }));
}

function statusesFor(mode: FiscalDemoMode): FiscalPeriodStatus[] {
  if (mode === 'noopen') return BASE_STATUSES.map(() => 'closed');

  if (mode === 'closednow') {
    // دوره‌ی جاری (آبان) هم بسته شده است تا حالت «بدون دوره‌ی باز» با یک دوره‌ی بسته دیده شود.
    return BASE_STATUSES.map((status, index) => (index === 7 ? 'closed' : status));
  }

  return [...BASE_STATUSES];
}

function buildDataset(mode: FiscalDemoMode): FiscalPeriodsDataset {
  if (mode === 'empty') {
    return { years: [], periods: [], logs: [] };
  }

  return {
    years: [{ ...FISCAL_YEAR_MOCK }],
    periods: buildPeriods(FISCAL_YEAR_MOCK, statusesFor(mode)),
    logs: FISCAL_AUDIT_LOG_MOCK.map((log) => ({ ...log })),
  };
}

export const FISCAL_PERIODS_MOCK_BY_MODE: Record<FiscalDemoMode, FiscalPeriodsDataset> = {
  normal: buildDataset('normal'),
  closednow: buildDataset('closednow'),
  noopen: buildDataset('noopen'),
  empty: buildDataset('empty'),
};

/** نسخه‌ی قابل تغییر (clone) تا state صفحه داده‌ی ماژول را تغییر ندهد. */
export function createMockDataset(mode: FiscalDemoMode = 'normal'): FiscalPeriodsDataset {
  const source = FISCAL_PERIODS_MOCK_BY_MODE[mode];

  return {
    years: source.years.map((year) => ({ ...year })),
    periods: source.periods.map((period) => ({ ...period })),
    logs: source.logs.map((log) => ({ ...log })),
  };
}
