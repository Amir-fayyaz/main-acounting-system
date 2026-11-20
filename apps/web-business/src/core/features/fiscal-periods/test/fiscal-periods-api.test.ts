import { beforeEach, describe, expect, it } from 'vitest';
import {
  createFiscalPeriod,
  generateMonthlyPeriods,
  getFiscalAuditLogs,
  getFiscalPeriods,
  getFiscalStats,
  getFiscalYears,
  resetFiscalStore,
  updatePeriodStatus,
} from '../lib/fiscal-periods-api';

describe('fiscal-periods-api', () => {
  beforeEach(() => {
    resetFiscalStore();
  });

  it('retrieves initial fiscal years and periods', async () => {
    const years = await getFiscalYears();
    expect(years.length).toBeGreaterThan(0);

    const periods = await getFiscalPeriods(years[0].id);
    expect(periods.length).toBe(12);

    const stats = await getFiscalStats(years[0].id);
    expect(stats.totalCount).toBe(12);
    expect(stats.openCount).toBeGreaterThan(0);
    expect(stats.closedCount).toBeGreaterThan(0);
  });

  it('transitions period status and creates audit log', async () => {
    const years = await getFiscalYears();
    const periods = await getFiscalPeriods(years[0].id);
    const targetPeriod = periods.find((p) => p.status === 'open')!;

    // Review
    const reviewed = await updatePeriodStatus(targetPeriod.id, 'review');
    expect(reviewed.status).toBe('review');

    // Close
    const closed = await updatePeriodStatus(targetPeriod.id, 'closed');
    expect(closed.status).toBe('closed');

    // Reopen with reason
    const reopened = await updatePeriodStatus(
      targetPeriod.id,
      'reopened',
      'اصلاح سند هزینه‌ای مهم',
    );
    expect(reopened.status).toBe('reopened');

    const logs = await getFiscalAuditLogs();
    expect(logs[0].action).toBe('بازگشایی دوره');
    expect(logs[0].reason).toBe('اصلاح سند هزینه‌ای مهم');
  });

  it('creates a new period', async () => {
    const years = await getFiscalYears();
    const created = await createFiscalPeriod({
      yid: years[0].id,
      name: 'دوره تکمیلی',
      from: '۱۴۰۵/۱۲/۲۹',
      to: '۱۴۰۵/۱۲/۲۹',
      status: 'open',
    });

    expect(created.name).toBe('دوره تکمیلی');
    const periods = await getFiscalPeriods(years[0].id);
    expect(periods.some((p) => p.id === created.id)).toBe(true);
  });

  it('generates 12 monthly periods for an empty year', async () => {
    const years = await getFiscalYears();
    const generated = await generateMonthlyPeriods(years[1].id);
    expect(generated.length).toBe(12);
    expect(generated[0].name).toContain('فروردین');
    expect(generated[11].name).toContain('اسفند');
  });
});
