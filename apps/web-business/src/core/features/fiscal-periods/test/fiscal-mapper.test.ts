import { describe, expect, it } from 'vitest';
import type { FiscalPeriodDto, FiscalYearDto } from '../assets/@types';
import {
  buildCreateFiscalYearPayload,
  mapFiscalPeriodDtoToModel,
  mapFiscalYearDtoToModel,
} from '../lib/fiscal-mapper';

describe('fiscal-mapper', () => {
  const mockYearDto: FiscalYearDto = {
    id: 'year-uuid-1',
    tenantId: 'tenant-uuid-1',
    label: 'FY1405',
    startDate: '2026-03-21',
    endDate: '2027-03-20',
    status: 'open',
    revision: 1,
    createdAt: '2026-11-01T00:00:00.000Z',
    updatedAt: '2026-11-01T00:00:00.000Z',
  };

  const mockPeriodDto: FiscalPeriodDto = {
    id: 'period-uuid-1',
    tenantId: 'tenant-uuid-1',
    fiscalYearId: 'year-uuid-1',
    jalaliYear: 1405,
    sequence: 1,
    startDate: '2026-03-21',
    endDate: '2026-04-19',
    state: 'open',
    createdAt: '2026-11-01T00:00:00.000Z',
    updatedAt: '2026-11-01T00:00:00.000Z',
  };

  it('maps FiscalYearDto to UI FiscalYear model', () => {
    const model = mapFiscalYearDtoToModel(mockYearDto, [mockPeriodDto]);
    expect(model.id).toBe('year-uuid-1');
    expect(model.title).toBe('FY1405');
    expect(model.from).toBe('۱۴۰۵/۰۱/۰۱');
    expect(model.to).toBe('۱۴۰۵/۱۲/۲۹');
    expect(model.status).toBe('open');
    expect(model.periodsCount).toBe(1);
    expect(model.openPeriodsCount).toBe(1);
  });

  it('maps FiscalPeriodDto to UI FiscalPeriod model', () => {
    const model = mapFiscalPeriodDtoToModel(mockPeriodDto, 'period-uuid-1');
    expect(model.id).toBe('period-uuid-1');
    expect(model.yid).toBe('year-uuid-1');
    expect(model.name).toBe('فروردین ۱۴۰۵');
    expect(model.from).toBe('۱۴۰۵/۰۱/۰۱');
    expect(model.status).toBe('open');
    expect(model.isActive).toBe(true);
  });

  it('builds CreateFiscalYearPayload with exactly 1 Jalali year bounds', () => {
    const payload = buildCreateFiscalYearPayload({
      label: 'سال مالی ۱۴۰۵',
      jalaliYear: 1405,
    });

    expect(payload.label).toBe('سال مالی ۱۴۰۵');
    expect(payload.startDate).toBe('2026-03-21');
    expect(payload.endDate).toBe('2027-03-20');
  });
});
