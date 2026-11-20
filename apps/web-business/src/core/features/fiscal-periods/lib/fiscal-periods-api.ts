import type {
  FiscalAuditLog,
  FiscalPeriod,
  FiscalPeriodStatus,
  FiscalStats,
  FiscalYear,
} from '../assets/@types';
import {
  createInitialAuditLogs,
  createInitialFiscalPeriods,
  createInitialFiscalYears,
} from '../assets/mock/fiscal';
import { MONTH_NAMES } from '../utils/fiscal-date';

let years = createInitialFiscalYears();
let periods = createInitialFiscalPeriods();
let logs = createInitialAuditLogs();

export function resetFiscalStore(): void {
  years = createInitialFiscalYears();
  periods = createInitialFiscalPeriods();
  logs = createInitialAuditLogs();
}

export async function getFiscalYears(): Promise<FiscalYear[]> {
  return [...years];
}

export async function getFiscalPeriods(yearId: string): Promise<FiscalPeriod[]> {
  return periods.filter((p) => p.yid === yearId);
}

export async function getFiscalStats(yearId: string): Promise<FiscalStats> {
  const yearPeriods = periods.filter((p) => p.yid === yearId);
  const openCount = yearPeriods.filter(
    (p) => p.status === 'open' || p.status === 'reopened',
  ).length;
  const closedCount = yearPeriods.filter((p) => p.status === 'closed').length;

  return {
    openCount,
    closedCount,
    totalCount: yearPeriods.length,
  };
}

export async function getFiscalAuditLogs(): Promise<FiscalAuditLog[]> {
  return [...logs];
}

export async function createFiscalPeriod(
  periodData: Omit<FiscalPeriod, 'id'>,
): Promise<FiscalPeriod> {
  const newPeriod: FiscalPeriod = {
    ...periodData,
    id: `period-${Date.now()}`,
  };

  periods = [...periods, newPeriod];

  const nowFa = new Date().toLocaleDateString('fa-IR');
  logs = [
    {
      id: `log-${Date.now()}`,
      action: 'ایجاد دوره',
      period: newPeriod.name,
      reason: '',
      who: 'علی رضایی',
      at: nowFa,
    },
    ...logs,
  ];

  return newPeriod;
}

export async function updatePeriodStatus(
  periodId: string,
  newStatus: FiscalPeriodStatus,
  reason = '',
): Promise<FiscalPeriod> {
  const index = periods.findIndex((p) => p.id === periodId);
  if (index === -1) {
    throw new Error('دوره مالی پیدا نشد');
  }

  const current = periods[index];
  const updated: FiscalPeriod = {
    ...current,
    status: newStatus,
  };

  periods[index] = updated;

  let action = '';
  if (newStatus === 'closed') action = 'بستن دوره';
  else if (newStatus === 'reopened') action = 'بازگشایی دوره';
  else if (newStatus === 'review') action = 'شروع بازبینی';
  else if (newStatus === 'open') action = 'بازگشت به باز';

  const nowFa = new Date().toLocaleDateString('fa-IR');
  logs = [
    {
      id: `log-${Date.now()}`,
      action,
      period: updated.name,
      reason,
      who: 'علی رضایی',
      at: nowFa,
    },
    ...logs,
  ];

  return updated;
}

export async function generateMonthlyPeriods(yearId: string): Promise<FiscalPeriod[]> {
  const year = years.find((y) => y.id === yearId);
  if (!year) throw new Error('سال مالی پیدا نشد');

  const yearNum = year.from.slice(0, 4);
  const newPeriods: FiscalPeriod[] = MONTH_NAMES.map((name, i) => {
    const month = String(i + 1).padStart(2, '0');
    const lastDay = i < 6 ? '31' : i < 11 ? '30' : '29';

    return {
      id: `gen-${yearId}-${month}`,
      yid: yearId,
      name: `${name} ${yearNum}`,
      from: `${yearNum}/${month}/01`,
      to: `${yearNum}/${month}/${lastDay}`,
      status: 'open',
    };
  });

  periods = [...periods.filter((p) => p.yid !== yearId), ...newPeriods];

  const nowFa = new Date().toLocaleDateString('fa-IR');
  logs = [
    {
      id: `log-${Date.now()}`,
      action: 'تولید ۱۲ دوره‌ی ماهانه',
      period: year.title,
      reason: '',
      who: 'علی رضایی',
      at: nowFa,
    },
    ...logs,
  ];

  return newPeriods;
}
