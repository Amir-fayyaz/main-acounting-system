import { beforeEach, describe, expect, it } from 'vitest';
import { useFiscalStore } from '../store/useFiscalStore';

describe('useFiscalStore (Zustand)', () => {
  beforeEach(() => {
    useFiscalStore.getState().resetStore();
  });

  it('initializes with clean default state', () => {
    const state = useFiscalStore.getState();
    expect(state.years).toEqual([]);
    expect(state.selectedYearId).toBe('');
    expect(state.periods).toEqual([]);
    expect(state.loading).toBe(false);
  });

  it('loads fiscal years and sets default selected year', async () => {
    const years = await useFiscalStore.getState().loadYears(false);

    expect(years.length).toBeGreaterThan(0);
    const state = useFiscalStore.getState();
    expect(state.years.length).toBeGreaterThan(0);
    expect(state.selectedYearId).toBe(years[0].id);
    expect(state.periods.length).toBeGreaterThan(0);
  });

  it('switches selected year and loads its periods', async () => {
    await useFiscalStore.getState().loadYears(false);
    const state = useFiscalStore.getState();

    if (state.years.length > 1) {
      const secondYear = state.years[1];
      useFiscalStore.getState().setSelectedYearId(secondYear.id);

      await useFiscalStore.getState().loadPeriodsForYear(secondYear.id, false);
      const updated = useFiscalStore.getState();
      expect(updated.selectedYearId).toBe(secondYear.id);
      expect(updated.periods.every((p) => p.yid === secondYear.id)).toBe(true);
    }
  });

  it('creates a new fiscal year and updates reactive store state', async () => {
    await useFiscalStore.getState().loadYears(false);
    const initialCount = useFiscalStore.getState().years.length;

    const created = await useFiscalStore.getState().createYear(
      {
        title: 'سال مالی ۱۴۰۸',
        jalaliYear: 1408,
        autoGeneratePeriods: true,
      },
      { syncWithApi: false },
    );

    expect(created.title).toBe('سال مالی ۱۴۰۸');
    const state = useFiscalStore.getState();
    expect(state.years.length).toBe(initialCount + 1);
    expect(state.selectedYearId).toBe(created.id);
    expect(state.periods.length).toBe(12);
  });

  it('updates period status and reflects in reactive stats', async () => {
    await useFiscalStore.getState().loadYears(false);
    const state = useFiscalStore.getState();
    const openPeriod = state.periods.find((p) => p.status === 'open');

    if (openPeriod) {
      await useFiscalStore.getState().updatePeriodStatus(openPeriod.id, 'closed', '', {
        syncWithApi: false,
      });

      const updated = useFiscalStore.getState();
      const updatedPeriod = updated.periods.find((p) => p.id === openPeriod.id);
      expect(updatedPeriod?.status).toBe('closed');
    }
  });
});
