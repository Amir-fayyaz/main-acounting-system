import { describe, expect, it } from 'vitest';
import {
  aFiscalPeriod,
  InMemoryFiscalPeriodRepository,
} from '../../../../../test/support/fiscal-period-doubles.js';
import { aFiscalYear } from '../../../../../test/support/accounting-doubles.js';
import { tenantReferenceFrom } from '../../domain/value-objects/tenant-reference.js';
import { DefaultPeriodGuard } from './default-period-guard.service.js';
import { BusinessDate } from '../../../../shared/time/business-date.js';
import {
  PeriodClosedError,
  PeriodNotDefinedError,
} from '../../domain/errors/fiscal-period.errors.js';

const TENANT_A = '018f0d3c-6d0f-7a4b-9d4e-2b3c4d5e6f70';
const TENANT_B = '018f0d3d-6d0f-7a4b-9d4e-2b3c4d5e6f71';

describe('PeriodGuard.assertPostable (FIS-006)', () => {
  function harness() {
    const periods = new InMemoryFiscalPeriodRepository();
    const guard = new DefaultPeriodGuard(periods);
    return { periods, guard };
  }

  it('returns PostablePeriod for a date inside an open period', async () => {
    const { periods, guard } = harness();
    const year = aFiscalYear(tenantReferenceFrom(TENANT_A), 'FY1405');
    const period = aFiscalPeriod({
      tenantId: tenantReferenceFrom(TENANT_A),
      fiscalYearId: year.id,
      jalaliYear: 1405,
      sequence: 1,
      startDate: '2026-03-21',
      endDate: '2026-04-19',
      state: 'open',
    });
    periods.seed(period);

    const res = await guard.assertPostable(TENANT_A, BusinessDate.parse('2026-04-05'));

    expect(res.id).toBe(period.id.value);
    expect(res.fiscalYearId).toBe(year.id.value);
    expect(res.sequence).toBe(1);
    expect(res.startDate).toBe('2026-03-21');
    expect(res.endDate).toBe('2026-04-19');
  });

  it('returns PostablePeriod on exact boundary dates (first and last day)', async () => {
    const { periods, guard } = harness();
    const year = aFiscalYear(tenantReferenceFrom(TENANT_A), 'FY1405');
    const period = aFiscalPeriod({
      tenantId: tenantReferenceFrom(TENANT_A),
      fiscalYearId: year.id,
      jalaliYear: 1405,
      sequence: 2,
      startDate: '2026-04-20',
      endDate: '2026-05-20',
      state: 'open',
    });
    periods.seed(period);

    const startRes = await guard.assertPostable(TENANT_A, BusinessDate.parse('2026-04-20'));
    expect(startRes.id).toBe(period.id.value);

    const endRes = await guard.assertPostable(TENANT_A, BusinessDate.parse('2026-05-20'));
    expect(endRes.id).toBe(period.id.value);
  });

  it('accepts a standard JavaScript Date instance', async () => {
    const { periods, guard } = harness();
    const year = aFiscalYear(tenantReferenceFrom(TENANT_A), 'FY1405');
    const period = aFiscalPeriod({
      tenantId: tenantReferenceFrom(TENANT_A),
      fiscalYearId: year.id,
      jalaliYear: 1405,
      sequence: 1,
      startDate: '2026-03-21',
      endDate: '2026-04-19',
      state: 'open',
    });
    periods.seed(period);

    const jsDate = new Date('2026-04-01T10:00:00.000Z');
    const res = await guard.assertPostable(TENANT_A, jsDate);

    expect(res.id).toBe(period.id.value);
  });

  it('refuses with PERIOD_CLOSED when date is inside a closed period', async () => {
    const { periods, guard } = harness();
    const year = aFiscalYear(tenantReferenceFrom(TENANT_A), 'FY1405');
    const closedPeriod = aFiscalPeriod({
      tenantId: tenantReferenceFrom(TENANT_A),
      fiscalYearId: year.id,
      jalaliYear: 1405,
      sequence: 1,
      startDate: '2026-03-21',
      endDate: '2026-04-19',
      state: 'closed',
    });
    periods.seed(closedPeriod);

    await expect(guard.assertPostable(TENANT_A, BusinessDate.parse('2026-04-01'))).rejects.toThrow(
      PeriodClosedError,
    );
  });

  it('refuses with PERIOD_NOT_DEFINED when date is outside every fiscal year/period', async () => {
    const { periods, guard } = harness();
    const year = aFiscalYear(tenantReferenceFrom(TENANT_A), 'FY1405');
    const period = aFiscalPeriod({
      tenantId: tenantReferenceFrom(TENANT_A),
      fiscalYearId: year.id,
      jalaliYear: 1405,
      sequence: 1,
      startDate: '2026-03-21',
      endDate: '2026-04-19',
      state: 'open',
    });
    periods.seed(period);

    await expect(guard.assertPostable(TENANT_A, BusinessDate.parse('2025-01-01'))).rejects.toThrow(
      PeriodNotDefinedError,
    );
  });

  it('maintains tenant isolation: tenant A date is never resolved against tenant B period', async () => {
    const { periods, guard } = harness();
    const yearB = aFiscalYear(tenantReferenceFrom(TENANT_B), 'FY1405');
    const periodB = aFiscalPeriod({
      tenantId: tenantReferenceFrom(TENANT_B),
      fiscalYearId: yearB.id,
      jalaliYear: 1405,
      sequence: 1,
      startDate: '2026-03-21',
      endDate: '2026-04-19',
      state: 'open',
    });
    periods.seed(periodB);

    await expect(guard.assertPostable(TENANT_A, BusinessDate.parse('2026-04-01'))).rejects.toThrow(
      PeriodNotDefinedError,
    );
  });
});
