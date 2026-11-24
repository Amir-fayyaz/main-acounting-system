'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import type {
  FiscalAuditLog,
  FiscalPeriod,
  FiscalPeriodStatus,
  FiscalStats,
  FiscalYear,
} from '../assets/@types';
import {
  buildMonthlyPeriods,
  createFiscalPeriod,
  getFiscalAuditLogs,
  recordAuditLog,
} from '../lib/fiscal-periods-api';
import {
  closeFiscalPeriodAction,
  loadFiscalPeriodsAction,
  loadFiscalYearsAction,
  reopenFiscalPeriodAction,
} from '../lib/fiscal-periods.actions';
import { toFiscalStats } from '../lib/fiscal-periods.mapper';
import { mapFiscalPeriodsError } from '../utils/mapFiscalPeriodsError';

export type FiscalMutationOutcome =
  { readonly ok: true } | { readonly ok: false; readonly message: string };

interface FiscalPeriodsData {
  readonly yearId: string;
  readonly periods: FiscalPeriod[];
}

type FiscalPeriodsStatus = 'loading' | 'ready' | 'error';

type LocalPeriodsByYear = Readonly<Record<string, FiscalPeriod[]>>;

export interface FiscalPeriodsController {
  readonly years: FiscalYear[];
  readonly selectedYearId: string;
  readonly selectedYear: FiscalYear | null;
  readonly periods: FiscalPeriod[];
  readonly stats: FiscalStats;
  readonly auditLogs: FiscalAuditLog[];
  readonly loading: boolean;
  readonly errorMessage: string | null;
  readonly selectYear: (yearId: string) => void;
  readonly reload: () => void;
  readonly closePeriod: (period: FiscalPeriod) => Promise<FiscalMutationOutcome>;
  readonly reopenPeriod: (period: FiscalPeriod, reason: string) => Promise<FiscalMutationOutcome>;
  readonly createPeriod: (periodData: Omit<FiscalPeriod, 'id'>) => Promise<FiscalMutationOutcome>;
  readonly generatePeriods: () => Promise<FiscalMutationOutcome>;
  readonly startReview: (period: FiscalPeriod) => Promise<FiscalMutationOutcome>;
  readonly revertToOpen: (period: FiscalPeriod) => Promise<FiscalMutationOutcome>;
}

const NO_YEAR_SELECTED = 'سال مالی انتخاب نشده است.';
const INVALID_YEAR_RANGE = 'بازه‌ی سال مالی انتخاب‌شده قابل تشخیص نیست.';

export function useFiscalPeriods(): FiscalPeriodsController {
  const [years, setYears] = useState<FiscalYear[]>([]);
  const [selectedYearId, setSelectedYearId] = useState('');
  const [data, setData] = useState<FiscalPeriodsData | null>(null);
  const [status, setStatus] = useState<FiscalPeriodsStatus>('loading');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [reloadIndex, setReloadIndex] = useState(0);
  const [localPeriodsByYear, setLocalPeriodsByYear] = useState<LocalPeriodsByYear>({});
  const [auditLogs, setAuditLogs] = useState<FiscalAuditLog[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function loadYears() {
      setStatus('loading');
      setErrorMessage(null);

      const result = await loadFiscalYearsAction();
      if (cancelled) return;

      if (!result.ok) {
        setYears([]);
        setStatus('error');
        setErrorMessage(mapFiscalPeriodsError(result.error));
        return;
      }

      setYears(result.years);
      setStatus('ready');
      setSelectedYearId((current) =>
        result.years.some((year) => year.id === current) ? current : (result.years[0]?.id ?? ''),
      );
    }

    void loadYears();

    return () => {
      cancelled = true;
    };
  }, [reloadIndex]);

  useEffect(() => {
    if (!selectedYearId) return;

    let cancelled = false;

    async function loadPeriods(yearId: string) {
      setStatus('loading');
      setErrorMessage(null);

      const result = await loadFiscalPeriodsAction(yearId);
      if (cancelled) return;

      if (!result.ok) {
        setData(null);
        setStatus('error');
        setErrorMessage(mapFiscalPeriodsError(result.error));
        return;
      }

      setData({ yearId, periods: result.periods });
      setStatus('ready');
    }

    void loadPeriods(selectedYearId);

    return () => {
      cancelled = true;
    };
  }, [selectedYearId, reloadIndex]);

  useEffect(() => {
    let cancelled = false;

    async function loadAuditLogs() {
      const logs = await getFiscalAuditLogs();
      if (!cancelled) setAuditLogs(logs);
    }

    void loadAuditLogs();

    return () => {
      cancelled = true;
    };
  }, []);

  const apiPeriods = useMemo(
    () => (data !== null && data.yearId === selectedYearId ? data.periods : []),
    [data, selectedYearId],
  );

  const overridePeriods = useCallback(
    (yearId: string, update: (periods: FiscalPeriod[]) => FiscalPeriod[]) => {
      setLocalPeriodsByYear((current) => {
        const base = current[yearId] ?? (data?.yearId === yearId ? data.periods : []);

        return { ...current, [yearId]: update([...base]) };
      });
    },
    [data],
  );

  const refreshAuditLogs = useCallback(async () => {
    setAuditLogs(await getFiscalAuditLogs());
  }, []);

  const changeLocalStatus = useCallback(
    async (
      period: FiscalPeriod,
      nextStatus: FiscalPeriodStatus,
      action: string,
      reason = '',
    ): Promise<FiscalMutationOutcome> => {
      overridePeriods(period.yid, (periods) =>
        periods.map((item) => (item.id === period.id ? { ...item, status: nextStatus } : item)),
      );
      recordAuditLog(action, period.name, reason);
      await refreshAuditLogs();

      return { ok: true };
    },
    [overridePeriods, refreshAuditLogs],
  );

  const isLocalOnly = useCallback(
    (period: FiscalPeriod) => !apiPeriods.some((item) => item.id === period.id),
    [apiPeriods],
  );

  const reload = useCallback(() => {
    setReloadIndex((current) => current + 1);
  }, []);

  const closePeriod = useCallback(
    async (period: FiscalPeriod): Promise<FiscalMutationOutcome> => {
      if (isLocalOnly(period)) return changeLocalStatus(period, 'closed', 'بستن دوره');

      const result = await closeFiscalPeriodAction(period.id);
      if (!result.ok) return { ok: false, message: mapFiscalPeriodsError(result.error) };

      setLocalPeriodsByYear((current) => {
        const yearPeriods = current[period.yid];
        if (yearPeriods === undefined) return current;

        return {
          ...current,
          [period.yid]: yearPeriods.map((item) =>
            item.id === period.id ? { ...item, status: 'closed' } : item,
          ),
        };
      });
      setReloadIndex((current) => current + 1);

      return { ok: true };
    },
    [changeLocalStatus, isLocalOnly],
  );

  const reopenPeriod = useCallback(
    async (period: FiscalPeriod, reason: string): Promise<FiscalMutationOutcome> => {
      if (isLocalOnly(period)) {
        return changeLocalStatus(period, 'reopened', 'بازگشایی دوره', reason);
      }

      const result = await reopenFiscalPeriodAction(period.id, reason);
      if (!result.ok) return { ok: false, message: mapFiscalPeriodsError(result.error) };

      setLocalPeriodsByYear((current) => {
        const yearPeriods = current[period.yid];
        if (yearPeriods === undefined) return current;

        return {
          ...current,
          [period.yid]: yearPeriods.map((item) =>
            item.id === period.id ? { ...item, status: 'open' } : item,
          ),
        };
      });
      setReloadIndex((current) => current + 1);

      return { ok: true };
    },
    [changeLocalStatus, isLocalOnly],
  );

  const createPeriod = useCallback(
    async (periodData: Omit<FiscalPeriod, 'id'>): Promise<FiscalMutationOutcome> => {
      const created = await createFiscalPeriod(periodData);

      overridePeriods(periodData.yid, (periods) => [...periods, created]);
      await refreshAuditLogs();

      return { ok: true };
    },
    [overridePeriods, refreshAuditLogs],
  );

  const generatePeriods = useCallback(async (): Promise<FiscalMutationOutcome> => {
    const year = years.find((item) => item.id === selectedYearId);
    if (!year) return { ok: false, message: NO_YEAR_SELECTED };

    const jalaliYear = Number.parseInt(year.from.slice(0, 4), 10);
    if (!Number.isFinite(jalaliYear)) return { ok: false, message: INVALID_YEAR_RANGE };

    overridePeriods(year.id, () => buildMonthlyPeriods(year.id, jalaliYear));
    recordAuditLog('تولید ۱۲ دوره‌ی ماهانه', year.title);
    await refreshAuditLogs();

    return { ok: true };
  }, [overridePeriods, refreshAuditLogs, selectedYearId, years]);

  const startReview = useCallback(
    (period: FiscalPeriod) => changeLocalStatus(period, 'review', 'شروع بازبینی'),
    [changeLocalStatus],
  );

  const revertToOpen = useCallback(
    (period: FiscalPeriod) => changeLocalStatus(period, 'open', 'بازگشت به باز'),
    [changeLocalStatus],
  );

  const selectedYear = useMemo(
    () => years.find((year) => year.id === selectedYearId) ?? null,
    [selectedYearId, years],
  );

  const periods = localPeriodsByYear[selectedYearId] ?? apiPeriods;
  const stats = useMemo(() => toFiscalStats(periods), [periods]);

  return {
    years,
    selectedYearId,
    selectedYear,
    periods,
    stats,
    auditLogs,
    loading: status === 'loading',
    errorMessage,
    selectYear: setSelectedYearId,
    reload,
    closePeriod,
    reopenPeriod,
    createPeriod,
    generatePeriods,
    startReview,
    revertToOpen,
  };
}
