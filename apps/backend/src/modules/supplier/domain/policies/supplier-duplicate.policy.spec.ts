import { describe, expect, it } from 'vitest';

import {
  SupplierCodeDuplicateError,
  SupplierIdentificationDuplicateError,
} from '../errors/supplier.errors.js';
import {
  SupplierDuplicatePolicy,
  type SupplierDuplicateRecord,
} from './supplier-duplicate.policy.js';
import { SupplierCode } from '../value-objects/supplier-code.js';
import { SupplierIdentificationNumber } from '../value-objects/supplier-identification-number.js';
import { SupplierName } from '../value-objects/supplier-name.js';
import { supplierIdFrom } from '../value-objects/supplier-id.js';

const TENANT_A = '018f0d3c-6d0f-7a4b-9d4e-2b3c4d5e6f70';
const TENANT_B = '018f0d3d-6d0f-7a4b-9d4e-2b3c4d5e6f71';

const SUPPLIER_ID_1 = '018f0d3e-6d0f-7a4b-9d4e-2b3c4d5e6f72';
const SUPPLIER_ID_2 = '018f0d3f-6d0f-7a4b-9d4e-2b3c4d5e6f73';
const SUPPLIER_ID_3 = '018f0d40-6d0f-7a4b-9d4e-2b3c4d5e6f74';

/** A deliberately simple stub for S2's Persian normalizer. */
const normalize = (raw: string): string => raw.trim().replace(/\s+/g, ' ').toLowerCase();
const policy = new SupplierDuplicatePolicy(normalize);

function record(
  overrides: {
    readonly id?: string;
    readonly tenantId?: string;
    readonly code?: string;
    readonly name?: string;
    readonly normalizedName?: string;
    readonly identificationNumber?: string;
  } = {},
): SupplierDuplicateRecord {
  return {
    id: supplierIdFrom(overrides.id ?? SUPPLIER_ID_1),
    tenantId: overrides.tenantId ?? TENANT_A,
    code: SupplierCode.from(overrides.code ?? 'SUP-001'),
    name: SupplierName.from(overrides.name ?? 'Acme Trading'),
    normalizedName: overrides.normalizedName ?? 'acme trading',
    identificationNumber:
      overrides.identificationNumber === undefined
        ? undefined
        : SupplierIdentificationNumber.from(overrides.identificationNumber),
  };
}

describe('SupplierDuplicatePolicy', () => {
  describe('code conflicts', () => {
    it('refuses the same code in the same tenant', () => {
      const assessment = policy.evaluate(
        {
          tenantId: TENANT_A,
          code: SupplierCode.from('SUP-001'),
          name: SupplierName.from('Other'),
        },
        [record()],
      );

      expect(assessment.decision.kind).toBe('conflict');
      if (assessment.decision.kind === 'conflict') {
        expect(assessment.decision.error).toBeInstanceOf(SupplierCodeDuplicateError);
        expect(assessment.decision.error.code).toBe('SUPPLIER_CODE_DUPLICATE');
        expect(assessment.decision.error.category).toBe('CONFLICT');
      }
    });

    it('compares codes case-insensitively', () => {
      const assessment = policy.evaluate(
        {
          tenantId: TENANT_A,
          code: SupplierCode.from('sup-001'),
          name: SupplierName.from('Other'),
        },
        [record({ code: 'SUP-001' })],
      );

      expect(assessment.decision.kind).toBe('conflict');
    });

    it('allows the same code in a different tenant', () => {
      const assessment = policy.evaluate(
        {
          tenantId: TENANT_B,
          code: SupplierCode.from('SUP-001'),
          name: SupplierName.from('Other'),
        },
        [record({ tenantId: TENANT_A })],
      );

      expect(assessment.decision.kind).toBe('clear');
    });
  });

  describe('identification conflicts', () => {
    it('refuses the same identification number in the same tenant', () => {
      const assessment = policy.evaluate(
        {
          tenantId: TENANT_A,
          code: SupplierCode.from('SUP-002'),
          name: SupplierName.from('Other'),
          identificationNumber: SupplierIdentificationNumber.from('10100999999'),
        },
        [record({ identificationNumber: '10100999999' })],
      );

      expect(assessment.decision.kind).toBe('conflict');
      if (assessment.decision.kind === 'conflict') {
        expect(assessment.decision.error).toBeInstanceOf(SupplierIdentificationDuplicateError);
        expect(assessment.decision.error.code).toBe('SUPPLIER_IDENTIFICATION_DUPLICATE');
        expect(assessment.decision.error.category).toBe('CONFLICT');
      }
    });

    it('does not match an absent identification number to another absent one', () => {
      const assessment = policy.evaluate(
        {
          tenantId: TENANT_A,
          code: SupplierCode.from('SUP-002'),
          name: SupplierName.from('Other'),
        },
        [record()],
      );

      expect(assessment.decision.kind).toBe('clear');
    });

    it('allows the same identification number in a different tenant', () => {
      const assessment = policy.evaluate(
        {
          tenantId: TENANT_B,
          code: SupplierCode.from('SUP-001'),
          name: SupplierName.from('Acme Trading'),
          identificationNumber: SupplierIdentificationNumber.from('10100999999'),
        },
        [record({ identificationNumber: '10100999999' })],
      );

      expect(assessment.decision.kind).toBe('clear');
    });
  });

  describe('possible duplicates by normalized name', () => {
    it('reports a same-tenant name match as possible, not a conflict', () => {
      const assessment = policy.evaluate(
        {
          tenantId: TENANT_A,
          code: SupplierCode.from('SUP-002'),
          name: SupplierName.from('  ACME   Trading '),
        },
        [record({ name: 'Acme Trading', normalizedName: 'acme trading' })],
      );

      expect(assessment.normalizedName).toBe('acme trading');
      expect(assessment.decision.kind).toBe('possibleDuplicate');
      if (assessment.decision.kind === 'possibleDuplicate') {
        expect(assessment.decision.matches).toHaveLength(1);
        expect(assessment.decision.matches[0].code.value).toBe('SUP-001');
      }
    });

    it('returns every same-tenant match in input order', () => {
      const assessment = policy.evaluate(
        {
          tenantId: TENANT_A,
          code: SupplierCode.from('SUP-900'),
          name: SupplierName.from('Acme Trading'),
        },
        [
          record({ id: SUPPLIER_ID_1, code: 'SUP-001' }),
          record({ id: SUPPLIER_ID_2, code: 'SUP-002' }),
          record({ id: SUPPLIER_ID_3, code: 'SUP-003', tenantId: TENANT_B }),
        ],
      );

      expect(assessment.decision.kind).toBe('possibleDuplicate');
      if (assessment.decision.kind === 'possibleDuplicate') {
        expect(assessment.decision.matches.map((match) => match.code.value)).toEqual([
          'SUP-001',
          'SUP-002',
        ]);
      }
    });

    it('allows the same normalized name in a different tenant', () => {
      const assessment = policy.evaluate(
        {
          tenantId: TENANT_B,
          code: SupplierCode.from('SUP-001'),
          name: SupplierName.from('Acme Trading'),
        },
        [record({ tenantId: TENANT_A })],
      );

      expect(assessment.decision.kind).toBe('clear');
    });

    it('lets an identification conflict win over a possible name match', () => {
      const assessment = policy.evaluate(
        {
          tenantId: TENANT_A,
          code: SupplierCode.from('SUP-002'),
          name: SupplierName.from('Acme Trading'),
          identificationNumber: SupplierIdentificationNumber.from('10100999999'),
        },
        [record({ code: 'SUP-001', name: 'Acme Trading', identificationNumber: '10100999999' })],
      );

      expect(assessment.decision.kind).toBe('conflict');
      if (assessment.decision.kind === 'conflict') {
        expect(assessment.decision.error).toBeInstanceOf(SupplierIdentificationDuplicateError);
        expect(assessment.decision.error.code).toBe('SUPPLIER_IDENTIFICATION_DUPLICATE');
      }
    });

    it('lets a hard code conflict win over a name match', () => {
      const assessment = policy.evaluate(
        {
          tenantId: TENANT_A,
          code: SupplierCode.from('SUP-001'),
          name: SupplierName.from('Acme Trading'),
        },
        [record({ code: 'SUP-001', name: 'Acme Trading' })],
      );

      expect(assessment.decision.kind).toBe('conflict');
    });
  });

  describe('clear candidates', () => {
    it('is clear when nothing exists', () => {
      const assessment = policy.evaluate(
        { tenantId: TENANT_A, code: SupplierCode.from('SUP-001'), name: SupplierName.from('Acme') },
        [],
      );

      expect(assessment.decision).toEqual({ kind: 'clear' });
      expect(assessment.normalizedName).toBe('acme');
    });
  });

  describe('normalization injection', () => {
    it('uses the injected normalizer and returns its canonical value', () => {
      const upperCasePolicy = new SupplierDuplicatePolicy((raw) => raw.trim().toUpperCase());

      const assessment = upperCasePolicy.evaluate(
        { tenantId: TENANT_A, code: SupplierCode.from('SUP-001'), name: SupplierName.from('Acme') },
        [],
      );

      expect(assessment.normalizedName).toBe('ACME');
    });

    it('rejects a normalizer that returns blank text', () => {
      const blankPolicy = new SupplierDuplicatePolicy(() => '   ');

      expect(() =>
        blankPolicy.evaluate(
          {
            tenantId: TENANT_A,
            code: SupplierCode.from('SUP-001'),
            name: SupplierName.from('Acme'),
          },
          [],
        ),
      ).toThrow(/normalizedName must not be blank/);
    });
  });
});
