import { isApiError } from '@repo/web/api';
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
import { MONTH_NAMES, toFaDigits } from '../utils/fiscal-date';
import {
  getJalaliYearBounds,
  gregorianToJalali,
  jalaliDaysInMonth,
} from '../utils/fiscal-calendar';
import {
  closeFiscalPeriodApi,
  createFiscalYearApi,
  getActiveTenantId,
  listFiscalPeriodsApi,
  listFiscalYearsApi,
  reopenFiscalPeriodApi,
  selectActivePeriodApi,
} from './fiscal-api';
import {
  buildCreateFiscalYearPayload,
  mapFiscalPeriodDtoToModel,
  mapFiscalYearDtoToModel,
} from './fiscal-mapper';

let years = createInitialFiscalYears();
let periods = createInitialFiscalPeriods();
let logs = createInitialAuditLogs();
let activePeriodId: string | null = periods.find((p) => p.status === 'open')?.id ?? null;

export function resetFiscalStore(): void {
  years = createInitialFiscalYears();
  periods = createInitialFiscalPeriods();
  logs = createInitialAuditLogs();
  activePeriodId = periods.find((p) => p.status === 'open')?.id ?? null;
}

export async function getFiscalYears(options: { preferApi?: boolean } = {}): Promise<FiscalYear[]> {
  if (options.preferApi) {
    try {
      const response = await listFiscalYearsApi();
      if (response && Array.isArray(response.data)) {
        const mapped = response.data.map((dto) => mapFiscalYearDtoToModel(dto));
        if (mapped.length > 0) {
          years = mapped;
          return [...years];
        }
      }
    } catch {
      // Fallback to local store on failure
    }
  }

  return [...years];
}

export async function getFiscalPeriods(
  yearId: string,
  options: { preferApi?: boolean } = {},
): Promise<FiscalPeriod[]> {
  if (options.preferApi) {
    try {
      const response = await listFiscalPeriodsApi(getActiveTenantId(), yearId);
      if (response && Array.isArray(response.data)) {
        const mapped = response.data.map((dto) =>
          mapFiscalPeriodDtoToModel(dto, activePeriodId ?? undefined),
        );
        if (mapped.length > 0) {
          periods = [...periods.filter((p) => p.yid !== yearId), ...mapped];
          return mapped;
        }
      }
    } catch {
      // Fallback to local store on failure
    }
  }

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

export interface CreateFiscalYearInput {
  title: string;
  from?: string;
  to?: string;
  jalaliYear?: number;
  autoGeneratePeriods?: boolean;
}

/**
 * Creates a new fiscal year.
 * When syncWithApi is enabled or possible, calls backend API.
 */
export async function createFiscalYear(
  input: CreateFiscalYearInput,
  options: { syncWithApi?: boolean } = {},
): Promise<FiscalYear> {
  const title = input.title.trim();

  // Determine Jalali year number
  let jYear = input.jalaliYear;
  if (!jYear) {
    const match = title.match(/\d{4}/);
    jYear = match
      ? parseInt(match[0], 10)
      : gregorianToJalali(new Date().toISOString().slice(0, 10)).jYear;
  }

  if (options.syncWithApi) {
    try {
      const payload = buildCreateFiscalYearPayload({
        label: title,
        jalaliYear: jYear,
      });

      const dto = await createFiscalYearApi(getActiveTenantId(), payload);

      // Fetch the generated periods from backend
      const periodsResponse = await listFiscalPeriodsApi(getActiveTenantId(), dto.id);
      const generatedPeriods = periodsResponse.data.map((pDto) => mapFiscalPeriodDtoToModel(pDto));

      const model = mapFiscalYearDtoToModel(dto, periodsResponse.data);

      years = [model, ...years.filter((y) => y.id !== model.id)];
      periods = [...periods.filter((p) => p.yid !== model.id), ...generatedPeriods];

      const nowFa = new Date().toLocaleDateString('fa-IR');
      logs = [
        {
          id: `log-${Date.now()}`,
          action: 'ایجاد سال مالی',
          period: model.title,
          reason: '',
          who: 'مدیر سیستم',
          at: nowFa,
        },
        ...logs,
      ];

      return model;
    } catch (err: unknown) {
      if (isApiError(err) && err.status >= 400 && err.status < 500) {
        throw err;
      }
      // API call failed due to offline server/network; fall back to local store
    }
  }

  // Local fallback creation
  const bounds = getJalaliYearBounds(jYear);
  const from = input.from || `${toFaDigits(jYear)}/۰۱/۰۱`;
  const lastDay = jalaliDaysInMonth(jYear, 12);
  const to = input.to || `${toFaDigits(jYear)}/۱۲/${toFaDigits(lastDay)}`;

  const newYear: FiscalYear = {
    id: `fy-${jYear}-${Date.now()}`,
    title,
    from,
    to,
    status: 'open',
    startDateIso: bounds.startDate,
    endDateIso: bounds.endDate,
  };

  years = [newYear, ...years];

  if (input.autoGeneratePeriods !== false) {
    const generated = await generateMonthlyPeriods(newYear.id);
    newYear.periodsCount = generated.length;
    newYear.openPeriodsCount = generated.length;
  }

  const nowFa = new Date().toLocaleDateString('fa-IR');
  logs = [
    {
      id: `log-${Date.now()}`,
      action: 'ایجاد سال مالی',
      period: newYear.title,
      reason: '',
      who: 'مدیر سیستم',
      at: nowFa,
    },
    ...logs,
  ];

  return newYear;
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

export async function selectActiveFiscalPeriod(
  periodId: string,
  options: { syncWithApi?: boolean } = {},
): Promise<void> {
  if (options.syncWithApi) {
    try {
      await selectActivePeriodApi(getActiveTenantId(), periodId);
    } catch (err: unknown) {
      if (isApiError(err) && err.status >= 400 && err.status < 500) {
        throw err;
      }
    }
  }

  activePeriodId = periodId;
  const p = periods.find((x) => x.id === periodId);
  if (p) {
    const nowFa = new Date().toLocaleDateString('fa-IR');
    logs = [
      {
        id: `log-${Date.now()}`,
        action: 'انتخاب دوره فعال',
        period: p.name,
        reason: '',
        who: 'مدیر مالی',
        at: nowFa,
      },
      ...logs,
    ];
  }
}

export async function updatePeriodStatus(
  periodId: string,
  newStatus: FiscalPeriodStatus,
  reason = '',
  options: { syncWithApi?: boolean } = {},
): Promise<FiscalPeriod> {
  if (options.syncWithApi) {
    try {
      if (newStatus === 'closed') {
        await closeFiscalPeriodApi(getActiveTenantId(), periodId);
      } else if (newStatus === 'reopened') {
        await reopenFiscalPeriodApi(getActiveTenantId(), periodId, { reason });
      }
    } catch (err: unknown) {
      if (isApiError(err) && err.status >= 400 && err.status < 500) {
        throw err;
      }
    }
  }

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
      sequence: i + 1,
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
