'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type {
  FiscalAuditLog,
  FiscalDemoMode,
  FiscalPeriod,
  FiscalPeriodDraft,
  FiscalPeriodsDataset,
  FiscalPeriodStats,
  FiscalPeriodStatus,
  FiscalYear,
} from '../assets/@types/fiscal-periods.types';
import { createMockDataset, FISCAL_YEAR_MOCK } from '../assets/mock/fiscal-periods.mock';
import {
  selectPeriodStats,
  selectRecentLogs,
  selectYearPeriods,
} from '../lib/fiscal-period.selectors';
import { generatePeriodRanges, normalizeJalaliDate } from '../lib/jalali-date';
import { formatAuditTimestamp } from '../utils/format';

const CLOSING_DELAY_MS = 900;
const CURRENT_ACTOR = 'علی رضایی';

function createLogEntry(input: {
  action: string;
  periodName: string;
  reason?: string;
}): FiscalAuditLog {
  return {
    id: `log-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    at: formatAuditTimestamp(),
    actor: CURRENT_ACTOR,
    action: input.action,
    periodName: input.periodName,
    ...(input.reason ? { reason: input.reason } : {}),
  };
}

function createPeriodId(yearId: string, existing: readonly FiscalPeriod[]): string {
  let index = existing.length + 1;

  while (existing.some((period) => period.id === `${yearId}-period-${index}`)) {
    index += 1;
  }

  return `${yearId}-period-${index}`;
}

export interface UseFiscalPeriodsResult {
  demoMode: FiscalDemoMode;
  setDemoMode: (mode: FiscalDemoMode) => void;
  years: FiscalYear[];
  selectedYear: FiscalYear | null;
  selectedYearId: string | null;
  selectYear: (yearId: string) => void;
  periods: FiscalPeriod[];
  stats: FiscalPeriodStats;
  logs: FiscalAuditLog[];
  createPeriod: (draft: FiscalPeriodDraft) => void;
  generateMonthlyPeriods: () => void;
  startReview: (periodId: string) => void;
  returnToOpen: (periodId: string) => void;
  closePeriod: (periodId: string) => void;
  reopenPeriod: (periodId: string, reason: string) => void;
}

export function useFiscalPeriods(): UseFiscalPeriodsResult {
  const [dataset, setDataset] = useState<FiscalPeriodsDataset>(() => createMockDataset('normal'));
  const [demoMode, setDemoModeState] = useState<FiscalDemoMode>('normal');
  const [selectedYearId, setSelectedYearId] = useState<string | null>(FISCAL_YEAR_MOCK.id);
  const closingTimersRef = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());

  useEffect(() => {
    const timers = closingTimersRef.current;

    return () => {
      timers.forEach((timer) => clearTimeout(timer));
      timers.clear();
    };
  }, []);

  const setDemoMode = useCallback((mode: FiscalDemoMode) => {
    const nextDataset = createMockDataset(mode);

    setDemoModeState(mode);
    setDataset(nextDataset);
    setSelectedYearId(nextDataset.years[0]?.id ?? null);
  }, []);

  const selectedYear = useMemo<FiscalYear | null>(() => {
    return dataset.years.find((year) => year.id === selectedYearId) ?? dataset.years[0] ?? null;
  }, [dataset.years, selectedYearId]);

  const periods = useMemo(
    () => selectYearPeriods(dataset.periods, selectedYear?.id ?? null),
    [dataset.periods, selectedYear],
  );

  const stats = useMemo(() => selectPeriodStats(periods), [periods]);
  const logs = useMemo(() => selectRecentLogs(dataset.logs), [dataset.logs]);

  const changePeriodStatus = useCallback(
    (periodId: string, status: FiscalPeriodStatus, log: { action: string; reason?: string }) => {
      setDataset((current) => {
        const period = current.periods.find((item) => item.id === periodId);
        if (!period) return current;

        return {
          ...current,
          periods: current.periods.map((item) =>
            item.id === periodId ? { ...item, status } : item,
          ),
          logs: [
            createLogEntry({
              action: log.action,
              periodName: period.name,
              ...(log.reason ? { reason: log.reason } : {}),
            }),
            ...current.logs,
          ],
        };
      });
    },
    [],
  );

  const createPeriod = useCallback(
    (draft: FiscalPeriodDraft) => {
      setDataset((current) => {
        const year =
          current.years.find((item) => item.id === selectedYearId) ?? current.years[0] ?? null;
        if (!year) return current;

        const from = normalizeJalaliDate(draft.from);
        const to = normalizeJalaliDate(draft.to);
        if (!from || !to) return current;

        const period: FiscalPeriod = {
          id: createPeriodId(year.id, current.periods),
          yearId: year.id,
          name: draft.name.trim(),
          from,
          to,
          status: 'open',
        };

        return {
          ...current,
          periods: [...current.periods, period],
          logs: [
            createLogEntry({ action: 'ایجاد دوره', periodName: period.name }),
            ...current.logs,
          ],
        };
      });
    },
    [selectedYearId],
  );

  const generateMonthlyPeriods = useCallback(() => {
    setDataset((current) => {
      const year =
        current.years.find((item) => item.id === selectedYearId) ?? current.years[0] ?? null;
      if (!year) return current;

      if (current.periods.some((period) => period.yearId === year.id)) return current;

      const generated: FiscalPeriod[] = generatePeriodRanges(year.from, year.to, 'monthly').map(
        (range, index) => ({
          id: `${year.id}-period-${index + 1}`,
          yearId: year.id,
          name: range.name,
          from: range.from,
          to: range.to,
          status: 'open',
        }),
      );

      return {
        ...current,
        periods: [...current.periods, ...generated],
        logs: [
          createLogEntry({
            action: 'تولید دوره‌های ماهانه',
            periodName: `${generated.length} دوره در ${year.title}`,
          }),
          ...current.logs,
        ],
      };
    });
  }, [selectedYearId]);

  const startReview = useCallback(
    (periodId: string) => {
      changePeriodStatus(periodId, 'review', { action: 'شروع بازبینی دوره' });
    },
    [changePeriodStatus],
  );

  const returnToOpen = useCallback(
    (periodId: string) => {
      changePeriodStatus(periodId, 'open', { action: 'بازگشت دوره به باز' });
    },
    [changePeriodStatus],
  );

  const closePeriod = useCallback(
    (periodId: string) => {
      setDataset((current) => ({
        ...current,
        periods: current.periods.map((period) =>
          period.id === periodId ? { ...period, status: 'closing' } : period,
        ),
      }));

      const timer = setTimeout(() => {
        closingTimersRef.current.delete(timer);
        changePeriodStatus(periodId, 'closed', { action: 'بستن دوره' });
      }, CLOSING_DELAY_MS);

      closingTimersRef.current.add(timer);
    },
    [changePeriodStatus],
  );

  const reopenPeriod = useCallback(
    (periodId: string, reason: string) => {
      changePeriodStatus(periodId, 'reopened', {
        action: 'بازگشایی دوره',
        reason: reason.trim(),
      });
    },
    [changePeriodStatus],
  );

  return {
    demoMode,
    setDemoMode,
    years: dataset.years,
    selectedYear,
    selectedYearId: selectedYear?.id ?? null,
    selectYear: setSelectedYearId,
    periods,
    stats,
    logs,
    createPeriod,
    generateMonthlyPeriods,
    startReview,
    returnToOpen,
    closePeriod,
    reopenPeriod,
  };
}
