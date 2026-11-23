import { create } from 'zustand';
import type {
  FiscalAuditLog,
  FiscalPeriod,
  FiscalPeriodStatus,
  FiscalStats,
  FiscalYear,
} from '../assets/@types';
import {
  createFiscalPeriod as apiCreateFiscalPeriod,
  createFiscalYear as apiCreateFiscalYear,
  generateMonthlyPeriods as apiGenerateMonthlyPeriods,
  getFiscalAuditLogs as apiGetFiscalAuditLogs,
  getFiscalPeriods as apiGetFiscalPeriods,
  getFiscalStats as apiGetFiscalStats,
  getFiscalYears as apiGetFiscalYears,
  resetFiscalStore as apiResetFiscalStore,
  selectActiveFiscalPeriod as apiSelectActiveFiscalPeriod,
  updatePeriodStatus as apiUpdatePeriodStatus,
  type CreateFiscalYearInput,
} from '../lib/fiscal-periods-api';

export interface FiscalState {
  years: FiscalYear[];
  selectedYearId: string;
  periods: FiscalPeriod[];
  periodsByYear: Record<string, FiscalPeriod[]>;
  stats: FiscalStats;
  auditLogs: FiscalAuditLog[];
  loading: boolean;
  error: string | null;

  // Actions
  loadYears: (preferApi?: boolean) => Promise<FiscalYear[]>;
  setSelectedYearId: (yearId: string) => void;
  loadPeriodsForYear: (yearId: string, preferApi?: boolean) => Promise<FiscalPeriod[]>;
  loadAllYearsData: (preferApi?: boolean) => Promise<void>;
  createYear: (
    input: CreateFiscalYearInput,
    options?: { syncWithApi?: boolean },
  ) => Promise<FiscalYear>;
  createPeriod: (periodData: Omit<FiscalPeriod, 'id'>) => Promise<FiscalPeriod>;
  generateMonthlyPeriods: (yearId: string) => Promise<FiscalPeriod[]>;
  selectActivePeriod: (periodId: string, options?: { syncWithApi?: boolean }) => Promise<void>;
  updatePeriodStatus: (
    periodId: string,
    newStatus: FiscalPeriodStatus,
    reason?: string,
    options?: { syncWithApi?: boolean },
  ) => Promise<FiscalPeriod>;
  resetStore: () => void;
}

export const useFiscalStore = create<FiscalState>((set, get) => ({
  years: [],
  selectedYearId: '',
  periods: [],
  periodsByYear: {},
  stats: { openCount: 0, closedCount: 0, totalCount: 0 },
  auditLogs: [],
  loading: false,
  error: null,

  loadYears: async (preferApi = true) => {
    set({ loading: true, error: null });
    try {
      const yearList = await apiGetFiscalYears({ preferApi });
      const currentSelected = get().selectedYearId;
      const nextSelected =
        currentSelected && yearList.some((y) => y.id === currentSelected)
          ? currentSelected
          : yearList[0]?.id || '';

      set({ years: yearList, selectedYearId: nextSelected, loading: false });

      if (nextSelected) {
        await get().loadPeriodsForYear(nextSelected, preferApi);
      }

      return yearList;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'خطا در بارگذاری سال‌های مالی';
      set({ error: msg, loading: false });
      return [];
    }
  },

  setSelectedYearId: (yearId: string) => {
    if (get().selectedYearId === yearId) return;
    set({ selectedYearId: yearId });
    get().loadPeriodsForYear(yearId, true);
  },

  loadPeriodsForYear: async (yearId: string, preferApi = true) => {
    if (!yearId) return [];
    set({ loading: true, error: null });
    try {
      const [periodsList, statsData, logsList] = await Promise.all([
        apiGetFiscalPeriods(yearId, { preferApi }),
        apiGetFiscalStats(yearId),
        apiGetFiscalAuditLogs(),
      ]);

      set((state) => ({
        periods: periodsList,
        periodsByYear: {
          ...state.periodsByYear,
          [yearId]: periodsList,
        },
        stats: statsData,
        auditLogs: logsList,
        loading: false,
      }));

      return periodsList;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'خطا در بارگذاری دوره‌های مالی';
      set({ error: msg, loading: false });
      return [];
    }
  },

  loadAllYearsData: async (preferApi = true) => {
    set({ loading: true, error: null });
    try {
      const yearList = await apiGetFiscalYears({ preferApi });
      const currentSelected = get().selectedYearId;
      const nextSelected =
        currentSelected && yearList.some((y) => y.id === currentSelected)
          ? currentSelected
          : yearList[0]?.id || '';

      const periodMap: Record<string, FiscalPeriod[]> = {};
      await Promise.all(
        yearList.map(async (y) => {
          const periods = await apiGetFiscalPeriods(y.id, { preferApi });
          periodMap[y.id] = periods;
        }),
      );

      const activePeriods = nextSelected ? periodMap[nextSelected] || [] : [];
      const statsData = nextSelected
        ? await apiGetFiscalStats(nextSelected)
        : { openCount: 0, closedCount: 0, totalCount: 0 };
      const logsList = await apiGetFiscalAuditLogs();

      set({
        years: yearList,
        selectedYearId: nextSelected,
        periodsByYear: periodMap,
        periods: activePeriods,
        stats: statsData,
        auditLogs: logsList,
        loading: false,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'خطا در بارگذاری اطلاعات مالی';
      set({ error: msg, loading: false });
    }
  },

  createYear: async (input: CreateFiscalYearInput, options = { syncWithApi: true }) => {
    set({ loading: true, error: null });
    try {
      const newYear = await apiCreateFiscalYear(input, options);
      const updatedYears = await apiGetFiscalYears({ preferApi: options.syncWithApi });
      const yearId = newYear.id;

      const periods = await apiGetFiscalPeriods(yearId, { preferApi: options.syncWithApi });
      const logs = await apiGetFiscalAuditLogs();

      set((state) => ({
        years: updatedYears,
        selectedYearId: yearId,
        periods,
        periodsByYear: {
          ...state.periodsByYear,
          [yearId]: periods,
        },
        auditLogs: logs,
        loading: false,
      }));

      return newYear;
    } catch (err: unknown) {
      set({ loading: false });
      throw err;
    }
  },

  createPeriod: async (periodData: Omit<FiscalPeriod, 'id'>) => {
    set({ loading: true, error: null });
    try {
      const newPeriod = await apiCreateFiscalPeriod(periodData);
      const yearId = periodData.yid;
      const [periodsList, statsData, logsList] = await Promise.all([
        apiGetFiscalPeriods(yearId),
        apiGetFiscalStats(yearId),
        apiGetFiscalAuditLogs(),
      ]);

      set((state) => ({
        periods: periodsList,
        periodsByYear: {
          ...state.periodsByYear,
          [yearId]: periodsList,
        },
        stats: statsData,
        auditLogs: logsList,
        loading: false,
      }));

      return newPeriod;
    } catch (err: unknown) {
      set({ loading: false });
      throw err;
    }
  },

  generateMonthlyPeriods: async (yearId: string) => {
    set({ loading: true, error: null });
    try {
      const generated = await apiGenerateMonthlyPeriods(yearId);
      const [statsData, logsList] = await Promise.all([
        apiGetFiscalStats(yearId),
        apiGetFiscalAuditLogs(),
      ]);

      set((state) => ({
        periods: generated,
        periodsByYear: {
          ...state.periodsByYear,
          [yearId]: generated,
        },
        stats: statsData,
        auditLogs: logsList,
        loading: false,
      }));

      return generated;
    } catch (err: unknown) {
      set({ loading: false });
      throw err;
    }
  },

  selectActivePeriod: async (periodId: string, options = { syncWithApi: true }) => {
    try {
      await apiSelectActiveFiscalPeriod(periodId, options);
      const selectedYearId = get().selectedYearId;
      const [periodsList, logsList] = await Promise.all([
        apiGetFiscalPeriods(selectedYearId),
        apiGetFiscalAuditLogs(),
      ]);

      set((state) => ({
        periods: periodsList,
        periodsByYear: {
          ...state.periodsByYear,
          [selectedYearId]: periodsList,
        },
        auditLogs: logsList,
      }));
    } catch (err: unknown) {
      throw err;
    }
  },

  updatePeriodStatus: async (
    periodId: string,
    newStatus: FiscalPeriodStatus,
    reason = '',
    options = { syncWithApi: true },
  ) => {
    try {
      const updated = await apiUpdatePeriodStatus(periodId, newStatus, reason, options);
      const selectedYearId = get().selectedYearId;
      const [periodsList, statsData, logsList] = await Promise.all([
        apiGetFiscalPeriods(selectedYearId),
        apiGetFiscalStats(selectedYearId),
        apiGetFiscalAuditLogs(),
      ]);

      set((state) => ({
        periods: periodsList,
        periodsByYear: {
          ...state.periodsByYear,
          [selectedYearId]: periodsList,
        },
        stats: statsData,
        auditLogs: logsList,
      }));

      return updated;
    } catch (err: unknown) {
      throw err;
    }
  },

  resetStore: () => {
    apiResetFiscalStore();
    set({
      years: [],
      selectedYearId: '',
      periods: [],
      periodsByYear: {},
      stats: { openCount: 0, closedCount: 0, totalCount: 0 },
      auditLogs: [],
      loading: false,
      error: null,
    });
  },
}));
