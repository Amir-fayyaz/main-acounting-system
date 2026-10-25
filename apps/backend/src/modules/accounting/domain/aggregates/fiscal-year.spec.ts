import { describe, expect, it } from 'vitest';

import { InvalidPrimitiveError } from '../../../../shared/primitives/invalid-primitive-error.js';
import { BusinessDate } from '../../../../shared/time/business-date.js';
import { DateTime } from '../../../../shared/time/date-time.js';
import {
  FiscalYearAlreadyClosedError,
  FiscalYearInvalidRangeError,
  FiscalYearOverlapError,
} from '../errors/fiscal-year.errors.js';
import { FiscalYearLabel } from '../value-objects/fiscal-year-label.js';
import { FiscalYearRange } from '../value-objects/fiscal-year-range.js';
import { FiscalYearStatus } from '../value-objects/fiscal-year-status.js';
import {
  tenantReferenceFrom,
  type TenantReference,
} from '../value-objects/tenant-reference.js';
import { FiscalYear } from './fiscal-year.js';

const NOW = DateTime.parse('2026-10-03T08:00:00.000Z');
const LATER = DateTime.parse('2026-10-04T08:00:00.000Z');

const TENANT_A: TenantReference = tenantReferenceFrom('018f0d3c-6d0f-7a4b-9d4e-2b3c4d5e6f70');
const TENANT_B: TenantReference = tenantReferenceFrom('018f0d3d-6d0f-7a4b-9d4e-2b3c4d5e6f71');

function range(startDate: string, endDate: string): FiscalYearRange {
  return FiscalYearRange.of(BusinessDate.parse(startDate), BusinessDate.parse(endDate));
}

function createFiscalYear(
  input: {
    tenantId?: TenantReference;
    label?: string;
    range?: FiscalYearRange;
    now?: DateTime;
  } = {},
  existing: readonly FiscalYear[] = [],
): FiscalYear {
  return FiscalYear.create(
    {
      tenantId: input.tenantId ?? TENANT_A,
      label: FiscalYearLabel.from(input.label ?? 'FY2024'),
      range: input.range ?? range('2024-01-01', '2024-12-31'),
      now: input.now ?? NOW,
    },
    existing,
  );
}

describe('FiscalYear aggregate', () => {
  describe('creation', () => {
    it('creates a valid year in the open state with both timestamps at creation', () => {
      const fiscalYear = createFiscalYear();

      expect(fiscalYear.status).toBe(FiscalYearStatus.OPEN);
      expect(fiscalYear.isOpen()).toBe(true);
      expect(fiscalYear.label.value).toBe('FY2024');
      expect(fiscalYear.range.startDate.toIsoString()).toBe('2024-01-01');
      expect(fiscalYear.range.endDate.toIsoString()).toBe('2024-12-31');
      expect(fiscalYear.tenantId.equals(TENANT_A)).toBe(true);
      expect(fiscalYear.createdAt.equals(NOW)).toBe(true);
      expect(fiscalYear.updatedAt.equals(NOW)).toBe(true);
    });

    it('generates a stable, UUID-shaped identity that never changes', () => {
      const fiscalYear = createFiscalYear();
      const id = fiscalYear.id.value;

      expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
      expect(fiscalYear.id.value).toBe(id);

      fiscalYear.close(LATER);

      expect(fiscalYear.id.value).toBe(id);
    });

    it('never reuses an identity for another year', () => {
      expect(createFiscalYear().id.equals(createFiscalYear().id)).toBe(false);
    });

    it('accepts a year adjacent to an existing one — no common day', () => {
      const existing = createFiscalYear({ label: 'FY2024' });

      const next = createFiscalYear(
        { label: 'FY2025', range: range('2025-01-01', '2025-12-31') },
        [existing],
      );

      expect(next.label.value).toBe('FY2025');
    });
  });

  describe('the overlap invariant', () => {
    it('refuses a year overlapping an existing year of the same tenant', () => {
      const existing = createFiscalYear({ label: 'FY2024' });

      expect(() =>
        createFiscalYear(
          { label: 'FY2024-h2', range: range('2024-06-01', '2025-06-30') },
          [existing],
        ),
      ).toThrow(FiscalYearOverlapError);
    });

    it('refuses an identical range of the same tenant', () => {
      const existing = createFiscalYear({ label: 'FY2024' });

      expect(() => createFiscalYear({ label: 'Copy' }, [existing])).toThrow(
        expect.objectContaining({ code: 'FISCAL_YEAR_OVERLAP' }),
      );
    });

    it('accepts the same range for a different tenant', () => {
      const existing = createFiscalYear({ label: 'FY2024' });

      const other = createFiscalYear({ tenantId: TENANT_B, label: 'FY2024' }, [existing]);

      expect(other.tenantId.equals(TENANT_B)).toBe(true);
    });

    it('lets a closed year keep blocking an overlap — closure is not an exemption', () => {
      const closed = createFiscalYear({ label: 'FY2024' });
      closed.close(LATER);

      expect(() => createFiscalYear({ label: 'Also 2024' }, [closed])).toThrow(
        FiscalYearOverlapError,
      );
    });
  });

  describe('the minimum range', () => {
    it('refuses a start date after the end date', () => {
      expect(() => range('2025-01-01', '2024-12-31')).toThrow(FiscalYearInvalidRangeError);
    });

    it('refuses a zero-length year — a year with no day cannot hold a period', () => {
      expect(() => range('2024-01-01', '2024-01-01')).toThrow(FiscalYearInvalidRangeError);
    });

    it('reports the refusal with the module error code and category', () => {
      try {
        range('2025-01-01', '2024-12-31');
        expect.unreachable('the reversed range must be refused');
      } catch (error) {
        expect(error).toBeInstanceOf(FiscalYearInvalidRangeError);
        expect((error as FiscalYearInvalidRangeError).code).toBe('FISCAL_YEAR_INVALID_RANGE');
        expect((error as FiscalYearInvalidRangeError).category).toBe('VALIDATION');
      }
    });

    it('accepts the shortest legal year — two days, start through end inclusive', () => {
      const shortest = range('2024-01-01', '2024-01-02');

      expect(shortest.startDate.toIsoString()).toBe('2024-01-01');
      expect(shortest.endDate.toIsoString()).toBe('2024-01-02');
    });
  });

  describe('the label', () => {
    it('trims, so incidental whitespace is the same label', () => {
      const fiscalYear = createFiscalYear({ label: '  FY2024  ' });

      expect(fiscalYear.label.value).toBe('FY2024');
      expect(fiscalYear.label.equals(FiscalYearLabel.from('FY2024'))).toBe(true);
    });

    it('refuses a blank label', () => {
      expect(() => createFiscalYear({ label: '   ' })).toThrow(InvalidPrimitiveError);
    });

    it('refuses a label longer than the storage bound', () => {
      expect(() => createFiscalYear({ label: 'x'.repeat(101) })).toThrow(InvalidPrimitiveError);
    });
  });

  describe('lifecycle', () => {
    it('closes an open year and advances only updatedAt', () => {
      const fiscalYear = createFiscalYear();

      fiscalYear.close(LATER);

      expect(fiscalYear.status).toBe(FiscalYearStatus.CLOSED);
      expect(fiscalYear.isOpen()).toBe(false);
      expect(fiscalYear.createdAt.equals(NOW)).toBe(true);
      expect(fiscalYear.updatedAt.equals(LATER)).toBe(true);
    });

    it('refuses to close an already closed year — there is no reopen', () => {
      const fiscalYear = createFiscalYear();
      fiscalYear.close(LATER);

      expect(() => fiscalYear.close(LATER)).toThrow(FiscalYearAlreadyClosedError);
    });
  });

  describe('rehydration', () => {
    it('rebuilds stored state through the same value objects', () => {
      const fiscalYear = createFiscalYear();
      const rehydrated = FiscalYear.rehydrate(fiscalYear.snapshot());

      expect(rehydrated.id.equals(fiscalYear.id)).toBe(true);
      expect(rehydrated.snapshot()).toEqual(fiscalYear.snapshot());
    });

    it('refuses a stored record whose range is not a legal year', () => {
      expect(() =>
        FiscalYear.rehydrate({
          ...createFiscalYear().snapshot(),
          startDate: '2025-01-01',
          endDate: '2024-12-31',
        }),
      ).toThrow(FiscalYearInvalidRangeError);
    });

    it('refuses a stored record with a status the domain does not define', () => {
      expect(() =>
        FiscalYear.rehydrate({
          ...createFiscalYear().snapshot(),
          status: 'archived' as never,
        }),
      ).toThrow(InvalidPrimitiveError);
    });

    it('refuses a stored record whose dates are not calendar days', () => {
      expect(() =>
        FiscalYear.rehydrate({
          ...createFiscalYear().snapshot(),
          startDate: '2024-02-30',
        }),
      ).toThrow(InvalidPrimitiveError);
    });
  });
});
