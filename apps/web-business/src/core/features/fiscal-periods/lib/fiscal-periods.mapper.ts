import type { FiscalPeriod, FiscalStats, FiscalYear } from '../assets/@types';
import { MONTH_NAMES, toFaDigits } from '../utils/fiscal-date';
import { formatJalaliDate } from '../utils/jalali';
import type { FiscalPeriodDto, FiscalYearDto } from './fiscal-periods.schema';

function periodName(sequence: number, jalaliYear: number): string {
  const monthName = MONTH_NAMES[sequence - 1];

  return toFaDigits(monthName ? `${monthName} ${jalaliYear}` : `دوره ${sequence}`);
}

export function toFiscalYearView(dto: FiscalYearDto): FiscalYear {
  return {
    id: dto.id,
    title: dto.label,
    from: formatJalaliDate(dto.startDate),
    to: formatJalaliDate(dto.endDate),
  };
}

export function toFiscalPeriodView(dto: FiscalPeriodDto): FiscalPeriod {
  return {
    id: dto.id,
    yid: dto.fiscalYearId,
    name: periodName(dto.sequence, dto.jalaliYear),
    from: formatJalaliDate(dto.startDate),
    to: formatJalaliDate(dto.endDate),
    status: dto.state === 'closed' ? 'closed' : 'open',
  };
}

export function toFiscalStats(periods: readonly FiscalPeriod[]): FiscalStats {
  const closedCount = periods.filter((period) => period.status === 'closed').length;

  return {
    openCount: periods.length - closedCount,
    closedCount,
    totalCount: periods.length,
  };
}
