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
import { MONTH_NAMES, parsePersianDigits, toFaDigits } from '../utils/fiscal-date';

let years = createInitialFiscalYears();
let periods = createInitialFiscalPeriods();
let logs = createInitialAuditLogs();
let logSequence = 0;

export function resetFiscalStore(): void {
  years = createInitialFiscalYears();
  periods = createInitialFiscalPeriods();
  logs = createInitialAuditLogs();
  logSequence = 0;
}

export function recordAuditLog(action: string, period: string, reason = ''): void {
  logSequence += 1;

  logs = [
    {
      id: `log-${Date.now()}-${logSequence}`,
      action,
      period,
      reason,
      who: 'علی رضایی',
      at: new Date().toLocaleDateString('fa-IR'),
    },
    ...logs,
  ];
}

export function buildMonthlyPeriods(yearId: string, jalaliYear: number): FiscalPeriod[] {
  const yearNum = toFaDigits(String(jalaliYear));

  return MONTH_NAMES.map((name, index) => {
    const month = String(index + 1).padStart(2, '0');
    const lastDay = index < 6 ? '31' : index < 11 ? '30' : '29';

    return {
      id: `gen-${yearId}-${month}`,
      yid: yearId,
      name: `${name} ${yearNum}`,
      from: `${yearNum}/${month}/01`,
      to: `${yearNum}/${month}/${lastDay}`,
      status: 'open',
    };
  });
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
  recordAuditLog('ایجاد دوره', newPeriod.name);

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

  recordAuditLog(action, updated.name, reason);

  return updated;
}

export async function generateMonthlyPeriods(yearId: string): Promise<FiscalPeriod[]> {
  const year = years.find((y) => y.id === yearId);
  if (!year) throw new Error('سال مالی پیدا نشد');

  const jalaliYear = Number(parsePersianDigits(year.from.slice(0, 4)));
  const newPeriods = buildMonthlyPeriods(yearId, jalaliYear);

  periods = [...periods.filter((p) => p.yid !== yearId), ...newPeriods];
  recordAuditLog('تولید ۱۲ دوره‌ی ماهانه', year.title);

  return newPeriods;
}
