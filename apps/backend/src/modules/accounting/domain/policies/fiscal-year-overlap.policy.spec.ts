import { describe, expect, it } from 'vitest';

import { BusinessDate } from '../../../../shared/time/business-date.js';
import { FiscalYearOverlapError } from '../errors/fiscal-year.errors.js';
import {
  FiscalYearOverlapPolicy,
  type FiscalYearSpan,
} from './fiscal-year-overlap.policy.js';
import {
  tenantReferenceFrom,
  type TenantReference,
} from '../value-objects/tenant-reference.js';
import { FiscalYearRange } from '../value-objects/fiscal-year-range.js';

/**
 * The overlap rule, exactly as the design states it (FIS-002, section 4.3).
 *
 * These cases *are* the rule's specification: identical, contained, partial
 * and one-shared-day ranges overlap; adjacent, disjoint and cross-tenant
 * ranges do not. Every database trigger and every use case decision is
 * measured against this table.
 */

const TENANT_A: TenantReference = tenantReferenceFrom('018f0d3c-6d0f-7a4b-9d4e-2b3c4d5e6f70');
const TENANT_B: TenantReference = tenantReferenceFrom('018f0d3d-6d0f-7a4b-9d4e-2b3c4d5e6f71');

function span(tenantId: TenantReference, startDate: string, endDate: string): FiscalYearSpan {
  return {
    tenantId,
    range: FiscalYearRange.of(BusinessDate.parse(startDate), BusinessDate.parse(endDate)),
  };
}

describe('FiscalYearOverlapPolicy', () => {
  describe('overlaps — same tenant', () => {
    it('declines identical ranges', () => {
      const a = span(TENANT_A, '2024-01-01', '2024-12-31');
      const b = span(TENANT_A, '2024-01-01', '2024-12-31');

      expect(FiscalYearOverlapPolicy.overlaps(a, b)).toBe(true);
    });

    it('declines a range contained in another', () => {
      const outer = span(TENANT_A, '2024-01-01', '2024-12-31');
      const inner = span(TENANT_A, '2024-03-01', '2024-04-30');

      expect(FiscalYearOverlapPolicy.overlaps(inner, outer)).toBe(true);
      expect(FiscalYearOverlapPolicy.overlaps(outer, inner)).toBe(true);
    });

    it('declines a partial overlap', () => {
      const a = span(TENANT_A, '2024-06-01', '2025-06-30');
      const b = span(TENANT_A, '2024-01-01', '2024-12-31');

      expect(FiscalYearOverlapPolicy.overlaps(a, b)).toBe(true);
    });

    it('declines ranges sharing exactly one day — the inclusive end matters', () => {
      const earlier = span(TENANT_A, '2024-01-01', '2024-12-31');
      const later = span(TENANT_A, '2024-12-31', '2025-12-31');

      // They share 2024-12-31 and nothing else.
      expect(FiscalYearOverlapPolicy.overlaps(later, earlier)).toBe(true);
    });

    it('allows adjacent ranges — end day and next start day never coincide', () => {
      const first = span(TENANT_A, '2024-01-01', '2024-12-31');
      const next = span(TENANT_A, '2025-01-01', '2025-12-31');

      expect(FiscalYearOverlapPolicy.overlaps(next, first)).toBe(false);
      expect(FiscalYearOverlapPolicy.overlaps(first, next)).toBe(false);
    });

    it('allows disjoint ranges', () => {
      const a = span(TENANT_A, '2027-01-01', '2027-12-31');
      const b = span(TENANT_A, '2024-01-01', '2024-12-31');

      expect(FiscalYearOverlapPolicy.overlaps(a, b)).toBe(false);
    });
  });

  describe('overlaps — different tenants', () => {
    it('allows identical ranges of two different tenants', () => {
      const a = span(TENANT_A, '2024-01-01', '2024-12-31');
      const b = span(TENANT_B, '2024-01-01', '2024-12-31');

      expect(FiscalYearOverlapPolicy.overlaps(a, b)).toBe(false);
    });

    it('allows any dates across tenants — the rule is scoped per company', () => {
      const a = span(TENANT_A, '2024-06-01', '2025-06-30');
      const b = span(TENANT_B, '2024-01-01', '2024-12-31');

      expect(FiscalYearOverlapPolicy.overlaps(a, b)).toBe(false);
    });
  });

  describe('evaluate', () => {
    it('accepts a candidate that touches none of the existing years', () => {
      const candidate = span(TENANT_A, '2025-01-01', '2025-12-31');
      const existing = [
        span(TENANT_A, '2024-01-01', '2024-12-31'),
        span(TENANT_A, '2023-01-01', '2023-12-31'),
      ];

      const outcome = FiscalYearOverlapPolicy.evaluate(candidate, existing);

      expect(outcome.isOk()).toBe(true);
    });

    it('declines against the first conflicting year with the module error', () => {
      const candidate = span(TENANT_A, '2024-01-01', '2024-12-31');
      const existing = [
        span(TENANT_A, '2022-01-01', '2022-12-31'),
        span(TENANT_A, '2024-01-01', '2024-12-31'),
      ];

      const outcome = FiscalYearOverlapPolicy.evaluate(candidate, existing);

      expect(outcome.isFail()).toBe(true);
      const error = outcome.errorOrThrow();
      expect(error).toBeInstanceOf(FiscalYearOverlapError);
      expect(error.code).toBe('FISCAL_YEAR_OVERLAP');
      expect(error.category).toBe('CONFLICT');
    });

    it('accepts against years that belong to other tenants', () => {
      const candidate = span(TENANT_A, '2024-01-01', '2024-12-31');
      const existing = [span(TENANT_B, '2024-01-01', '2024-12-31')];

      expect(FiscalYearOverlapPolicy.evaluate(candidate, existing).isOk()).toBe(true);
    });

    it('accepts when there is nothing to compare against', () => {
      const candidate = span(TENANT_A, '2024-01-01', '2024-12-31');

      expect(FiscalYearOverlapPolicy.evaluate(candidate, []).isOk()).toBe(true);
    });
  });
});
