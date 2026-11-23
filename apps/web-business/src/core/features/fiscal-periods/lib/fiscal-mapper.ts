import type {
  FiscalPeriod,
  FiscalPeriodDto,
  FiscalYear,
  FiscalYearDto,
  CreateFiscalYearPayload,
} from '../assets/@types';
import {
  formatIsoToJalaliFa,
  getJalaliYearBounds,
  getPeriodTitle,
  gregorianToJalali,
} from '../utils/fiscal-calendar';

/**
 * Maps a backend FiscalYearDto to the frontend UI FiscalYear model.
 */
export function mapFiscalYearDtoToModel(
  dto: FiscalYearDto,
  periods?: readonly FiscalPeriodDto[],
): FiscalYear {
  const yearPeriods = periods?.filter((p) => p.fiscalYearId === dto.id) ?? [];
  const openCount = yearPeriods.filter((p) => p.state === 'open').length;

  return {
    id: dto.id,
    title: dto.label,
    from: formatIsoToJalaliFa(dto.startDate),
    to: formatIsoToJalaliFa(dto.endDate),
    status: dto.status,
    tenantId: dto.tenantId,
    startDateIso: dto.startDate,
    endDateIso: dto.endDate,
    periodsCount: yearPeriods.length > 0 ? yearPeriods.length : undefined,
    openPeriodsCount: yearPeriods.length > 0 ? openCount : undefined,
  };
}

/**
 * Maps a backend FiscalPeriodDto to the frontend UI FiscalPeriod model.
 */
export function mapFiscalPeriodDtoToModel(
  dto: FiscalPeriodDto,
  activePeriodId?: string,
): FiscalPeriod {
  return {
    id: dto.id,
    yid: dto.fiscalYearId,
    name: getPeriodTitle(dto.jalaliYear, dto.sequence),
    from: formatIsoToJalaliFa(dto.startDate),
    to: formatIsoToJalaliFa(dto.endDate),
    status: dto.state === 'closed' ? 'closed' : 'open',
    sequence: dto.sequence,
    jalaliYear: dto.jalaliYear,
    startDateIso: dto.startDate,
    endDateIso: dto.endDate,
    isActive: activePeriodId !== undefined && activePeriodId === dto.id,
  };
}

/**
 * Prepares the payload for creating a new fiscal year in the backend API.
 * Ensures that the dates span exactly one Jalali year as required by the backend domain rule.
 */
export function buildCreateFiscalYearPayload(params: {
  label: string;
  jalaliYear?: number;
  startDateIso?: string;
  endDateIso?: string;
}): CreateFiscalYearPayload {
  let startDate = params.startDateIso;
  let endDate = params.endDateIso;

  if (!startDate || !endDate) {
    let jYear = params.jalaliYear;
    if (!jYear) {
      // Try to parse year from label or current year
      const match = params.label.match(/\d{4}/);
      jYear = match
        ? parseInt(match[0], 10)
        : gregorianToJalali(new Date().toISOString().slice(0, 10)).jYear;
    }
    const bounds = getJalaliYearBounds(jYear);
    startDate = bounds.startDate;
    endDate = bounds.endDate;
  }

  return {
    label: params.label.trim(),
    startDate,
    endDate,
  };
}
