import type {
  FiscalAuditLog,
  FiscalPeriod,
  FiscalPeriodDraft,
  FiscalPeriodStats,
  FiscalYear,
} from '../assets/@types/fiscal-periods.types';
import {
  daysInJalaliMonth,
  formatJalaliParts,
  getMonthName,
  nextJalaliDay,
  parseJalaliDate,
} from './jalali-date';
import { isPeriodPostable } from './fiscal-period.config';
import { toPersianDigits } from '../utils/format';

export function selectYearPeriods(
  periods: readonly FiscalPeriod[],
  yearId: string | null,
): FiscalPeriod[] {
  if (!yearId) return [];

  return periods
    .filter((period) => period.yearId === yearId)
    .sort((first, second) => first.from.localeCompare(second.from));
}

export function selectPeriodStats(periods: readonly FiscalPeriod[]): FiscalPeriodStats {
  return {
    total: periods.length,
    open: periods.filter((period) => isPeriodPostable(period.status)).length,
    closed: periods.filter((period) => period.status === 'closed').length,
  };
}

export function selectRecentLogs(logs: readonly FiscalAuditLog[], limit = 8): FiscalAuditLog[] {
  return logs.slice(0, limit);
}

/**
 * پیشنهاد بازه‌ی دوره‌ی بعدی: از روز بعدِ پایان آخرین دوره تا پایان همان ماه.
 */
export function createSuggestedPeriodDraft(
  year: FiscalYear | null,
  periods: readonly FiscalPeriod[],
): FiscalPeriodDraft {
  if (!year) return { name: '', from: '', to: '' };

  const lastPeriod = periods.at(-1);
  const from = lastPeriod ? nextJalaliDay(lastPeriod.to) : year.from;

  if (from > year.to) return { name: '', from: year.from, to: year.to };

  const parts = parseJalaliDate(from);
  if (!parts) return { name: '', from: year.from, to: year.to };

  const monthEnd = formatJalaliParts({
    year: parts.year,
    month: parts.month,
    day: daysInJalaliMonth(parts.year, parts.month),
  });

  return {
    name: `${getMonthName(parts.month)} ${toPersianDigits(parts.year)}`,
    from,
    to: monthEnd > year.to ? year.to : monthEnd,
  };
}
