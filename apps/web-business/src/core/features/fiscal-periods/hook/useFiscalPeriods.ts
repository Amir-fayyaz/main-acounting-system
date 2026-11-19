'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import type { FiscalPeriod, FiscalStats, FiscalYear } from '../assets/@types';
import {
  closeFiscalPeriodAction,
  loadFiscalPeriodsAction,
  loadFiscalYearsAction,
  reopenFiscalPeriodAction,
} from '../lib/fiscal-periods.actions';
import { mapFiscalPeriodsError } from '../utils/mapFiscalPeriodsError';

export type FiscalMutationOutcome =
  { readonly ok: true } | { readonly ok: false; readonly message: string };

interface FiscalPeriodsData {
  readonly yearId: string;
  readonly periods: FiscalPeriod[];
  readonly stats: FiscalStats;
}

type FiscalPeriodsStatus = 'loading' | 'ready' | 'error';

const EMPTY_STATS: FiscalStats = { openCount: 0, closedCount: 0, totalCount: 0 };

export interface FiscalPeriodsController {
  readonly years: FiscalYear[];
  readonly selectedYearId: string;
  readonly selectedYear: FiscalYear | null;
  readonly periods: FiscalPeriod[];
  readonly stats: FiscalStats;
  readonly loading: boolean;
  readonly errorMessage: string | null;
  readonly selectYear: (yearId: string) => void;
  readonly reload: () => void;
  readonly closePeriod: (period: FiscalPeriod) => Promise<FiscalMutationOutcome>;
  readonly reopenPeriod: (period: FiscalPeriod, reason: string) => Promise<FiscalMutationOutcome>;
}

export function useFiscalPeriods(): FiscalPeriodsController {
  const [years, setYears] = useState<FiscalYear[]>([]);
  const [selectedYearId, setSelectedYearId] = useState('');
  const [data, setData] = useState<FiscalPeriodsData | null>(null);
  const [status, setStatus] = useState<FiscalPeriodsStatus>('loading');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [reloadIndex, setReloadIndex] = useState(0);

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

      setData({ yearId, periods: result.periods, stats: result.stats });
      setStatus('ready');
    }

    void loadPeriods(selectedYearId);

    return () => {
      cancelled = true;
    };
  }, [selectedYearId, reloadIndex]);

  const reload = useCallback(() => {
    setReloadIndex((current) => current + 1);
  }, []);

  const closePeriod = useCallback(async (period: FiscalPeriod): Promise<FiscalMutationOutcome> => {
    const result = await closeFiscalPeriodAction(period.id);
    if (!result.ok) return { ok: false, message: mapFiscalPeriodsError(result.error) };

    setReloadIndex((current) => current + 1);

    return { ok: true };
  }, []);

  const reopenPeriod = useCallback(
    async (period: FiscalPeriod, reason: string): Promise<FiscalMutationOutcome> => {
      const result = await reopenFiscalPeriodAction(period.id, reason);
      if (!result.ok) return { ok: false, message: mapFiscalPeriodsError(result.error) };

      setReloadIndex((current) => current + 1);

      return { ok: true };
    },
    [],
  );

  const selectedYear = useMemo(
    () => years.find((year) => year.id === selectedYearId) ?? null,
    [selectedYearId, years],
  );

  const selectedPeriods = data !== null && data.yearId === selectedYearId ? data.periods : [];

  return {
    years,
    selectedYearId,
    selectedYear,
    periods: selectedPeriods,
    stats: data !== null && data.yearId === selectedYearId ? data.stats : EMPTY_STATS,
    loading: status === 'loading',
    errorMessage,
    selectYear: setSelectedYearId,
    reload,
    closePeriod,
    reopenPeriod,
  };
}
