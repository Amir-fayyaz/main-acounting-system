import { describe, expect, it } from 'vitest';

import { Result } from '../../../../shared/errors/result.js';
import { DateTime } from '../../../../shared/time/date-time.js';
import { Supplier } from './supplier.js';
import {
  SupplierAlreadyActiveError,
  SupplierAlreadyInactiveError,
} from '../errors/supplier.errors.js';
import {
  SupplierDuplicatePolicy,
  type SupplierDuplicateRecord,
} from '../policies/supplier-duplicate.policy.js';
import { SupplierCode } from '../value-objects/supplier-code.js';
import { SupplierContactInfo } from '../value-objects/supplier-contact-info.js';
import { SupplierIdentificationNumber } from '../value-objects/supplier-identification-number.js';
import { SupplierName } from '../value-objects/supplier-name.js';
import { supplierIdFrom } from '../value-objects/supplier-id.js';

const TENANT_A = '018f0d3c-6d0f-7a4b-9d4e-2b3c4d5e6f70';
const TENANT_B = '018f0d3d-6d0f-7a4b-9d4e-2b3c4d5e6f71';
const EXPLICIT_ID = '018f0d3e-6d0f-7a4b-9d4e-2b3c4d5e6f72';

const NOW = DateTime.parse('2026-10-31T12:00:00.000Z');
const LATER = DateTime.parse('2026-11-01T08:30:00.000Z');

const normalize = (raw: string): string => raw.trim().replace(/\s+/g, ' ').toLowerCase();
const policy = new SupplierDuplicatePolicy(normalize);

interface CreateOverrides {
  readonly tenantId?: string;
  readonly code?: string;
  readonly name?: string;
  readonly identificationNumber?: string;
  readonly contactInfo?: SupplierContactInfo;
  readonly now?: DateTime;
  readonly existingSuppliers?: readonly SupplierDuplicateRecord[];
  readonly confirmPossibleDuplicate?: boolean;
  readonly id?: string;
}

function create(overrides: CreateOverrides = {}) {
  return Supplier.create({
    id: overrides.id === undefined ? undefined : supplierIdFrom(overrides.id),
    tenantId: overrides.tenantId ?? TENANT_A,
    code: SupplierCode.from(overrides.code ?? 'SUP-001'),
    name: SupplierName.from(overrides.name ?? 'Acme Trading'),
    identificationNumber:
      overrides.identificationNumber === undefined
        ? undefined
        : SupplierIdentificationNumber.from(overrides.identificationNumber),
    contactInfo: overrides.contactInfo,
    now: overrides.now ?? NOW,
    existingSuppliers: overrides.existingSuppliers ?? [],
    duplicatePolicy: policy,
    confirmPossibleDuplicate: overrides.confirmPossibleDuplicate,
  });
}

function created(overrides: CreateOverrides = {}): Supplier {
  const outcome = create(overrides);
  expect(outcome.isOk()).toBe(true);
  const value = outcome.valueOrThrow();
  expect(value.kind).toBe('created');
  if (value.kind !== 'created') {
    throw new Error('expected a created supplier');
  }
  return value.supplier;
}

describe('Supplier aggregate', () => {
  describe('creation', () => {
    it('creates an active supplier with injected identity and time', () => {
      const supplier = created({
        id: EXPLICIT_ID,
        code: 'SUP-001',
        name: '  Acme Trading  ',
        identificationNumber: '10100999999',
        contactInfo: SupplierContactInfo.create({ phone: ' 021-1234 ', email: '' }),
      });

      expect(supplier.id.value).toBe(EXPLICIT_ID);
      expect(supplier.tenantId).toBe(TENANT_A);
      expect(supplier.code.value).toBe('SUP-001');
      expect(supplier.name.value).toBe('Acme Trading');
      expect(supplier.normalizedName).toBe('acme trading');
      expect(supplier.identificationNumber?.value).toBe('10100999999');
      expect(supplier.contactInfo?.phone).toBe('021-1234');
      expect(supplier.contactInfo?.email).toBeUndefined();
      expect(supplier.status.isActive()).toBe(true);
      expect(supplier.createdAt).toBe(NOW);
      expect(supplier.updatedAt).toBe(NOW);
    });

    it('generates a UUID identity when none is supplied', () => {
      const supplier = created();

      expect(supplier.id.value).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
      );
    });

    it('refuses a duplicate code in the same tenant', () => {
      const existing = created({ code: 'SUP-001', name: 'First Supplier' });

      const outcome = create({
        code: 'sup-001',
        name: 'Different Supplier',
        existingSuppliers: [existing],
      });

      expect(outcome.isFail()).toBe(true);
      expect(outcome.errorOrThrow().code).toBe('SUPPLIER_CODE_DUPLICATE');
      expect(outcome.errorOrThrow().category).toBe('CONFLICT');
    });

    it('refuses a duplicate identification number in the same tenant', () => {
      const existing = created({
        code: 'SUP-001',
        name: 'First Supplier',
        identificationNumber: '10100999999',
      });

      const outcome = create({
        code: 'SUP-002',
        name: 'Different Supplier',
        identificationNumber: '10100999999',
        existingSuppliers: [existing],
      });

      expect(outcome.isFail()).toBe(true);
      expect(outcome.errorOrThrow().code).toBe('SUPPLIER_IDENTIFICATION_DUPLICATE');
      expect(outcome.errorOrThrow().category).toBe('CONFLICT');
    });

    it('still refuses a duplicate code when the existing supplier is inactive', () => {
      const existing = created({ code: 'SUP-001', name: 'First Supplier' });
      existing.deactivate(LATER);

      const outcome = create({
        code: 'sup-001',
        name: 'Different Supplier',
        existingSuppliers: [existing],
      });

      expect(outcome.isFail()).toBe(true);
      expect(outcome.errorOrThrow().code).toBe('SUPPLIER_CODE_DUPLICATE');
    });

    it('returns a possible duplicate for the same normalized name and creates nothing', () => {
      const existing = created({ code: 'SUP-001', name: 'Acme Trading' });

      const outcome = create({
        code: 'SUP-002',
        name: '  ACME   trading ',
        existingSuppliers: [existing],
      });

      expect(outcome.isOk()).toBe(true);
      const value = outcome.valueOrThrow();
      expect(value.kind).toBe('possibleDuplicate');
      if (value.kind === 'possibleDuplicate') {
        expect(value.matches).toHaveLength(1);
        expect(value.matches[0].code.value).toBe('SUP-001');
      }
    });

    it('creates the supplier only after possible-duplicate confirmation', () => {
      const existing = created({ code: 'SUP-001', name: 'Acme Trading' });

      const first = create({
        code: 'SUP-002',
        name: 'Acme Trading',
        existingSuppliers: [existing],
      });
      expect(first.valueOrThrow().kind).toBe('possibleDuplicate');

      const confirmed = created({
        code: 'SUP-002',
        name: 'Acme Trading',
        existingSuppliers: [existing],
        confirmPossibleDuplicate: true,
      });
      expect(confirmed.code.value).toBe('SUP-002');
      expect(confirmed.isActive()).toBe(true);
    });

    it('still refuses a hard conflict even when possible-duplicate confirmation is set', () => {
      const existing = created({ code: 'SUP-001', name: 'Acme Trading' });

      const outcome = create({
        code: 'SUP-001',
        name: 'Acme Trading',
        existingSuppliers: [existing],
        confirmPossibleDuplicate: true,
      });

      expect(outcome.isFail()).toBe(true);
      expect(outcome.errorOrThrow().code).toBe('SUPPLIER_CODE_DUPLICATE');
    });

    it('allows different tenants to share code, name and identification number', () => {
      const existing = created({
        code: 'SUP-001',
        name: 'Acme Trading',
        identificationNumber: '10100999999',
      });

      const supplier = created({
        tenantId: TENANT_B,
        code: 'SUP-001',
        name: 'Acme Trading',
        identificationNumber: '10100999999',
        existingSuppliers: [existing],
      });

      expect(supplier.tenantId).toBe(TENANT_B);
      expect(supplier.code.value).toBe('SUP-001');
    });

    it('requires existing suppliers at the type level and evaluates them at runtime', () => {
      expect(() =>
        // @ts-expect-error - creation without the tenant's existing suppliers must not typecheck
        Supplier.create({
          tenantId: TENANT_A,
          code: SupplierCode.from('SUP-001'),
          name: SupplierName.from('Acme Trading'),
          now: NOW,
          duplicatePolicy: policy,
        }),
      ).toThrow(/existingSuppliers must be an array/);
    });
  });

  describe('lifecycle', () => {
    it('deactivates an active supplier and moves updatedAt forward', () => {
      const supplier = created();

      const outcome = supplier.deactivate(LATER);

      expect(outcome.isOk()).toBe(true);
      expect(supplier.status.value).toBe('inactive');
      expect(supplier.isActive()).toBe(false);
      expect(supplier.updatedAt).toBe(LATER);
      expect(supplier.createdAt).toBe(NOW);
    });

    it('refuses deactivating an inactive supplier with a stable error', () => {
      const supplier = created();
      supplier.deactivate(LATER);

      const outcome = supplier.deactivate(NOW);

      expect(outcome.isFail()).toBe(true);
      const error = outcome.errorOrThrow();
      expect(error).toBeInstanceOf(SupplierAlreadyInactiveError);
      expect(error.code).toBe('SUPPLIER_ALREADY_INACTIVE');
      expect(error.category).toBe('STATE_VIOLATION');
      expect(supplier.status.value).toBe('inactive');
      expect(supplier.updatedAt).toBe(LATER);
    });

    it('reactivates an inactive supplier and moves updatedAt forward', () => {
      const supplier = created();
      supplier.deactivate(LATER);
      const reactivatedAt = DateTime.parse('2026-11-02T09:00:00.000Z');

      const outcome = supplier.activate(reactivatedAt);

      expect(outcome.isOk()).toBe(true);
      expect(supplier.status.value).toBe('active');
      expect(supplier.isActive()).toBe(true);
      expect(supplier.updatedAt).toBe(reactivatedAt);
    });

    it('refuses activating an already-active supplier with a stable error', () => {
      const supplier = created();

      const outcome = supplier.activate(LATER);

      expect(outcome.isFail()).toBe(true);
      const error = outcome.errorOrThrow();
      expect(error).toBeInstanceOf(SupplierAlreadyActiveError);
      expect(error.code).toBe('SUPPLIER_ALREADY_ACTIVE');
      expect(error.category).toBe('STATE_VIOLATION');
      expect(supplier.status.value).toBe('active');
      expect(supplier.updatedAt).toBe(NOW);
    });

    it('supports repeated deactivate/activate cycles without losing identity', () => {
      const supplier = created();
      const id = supplier.id.value;

      expect(supplier.deactivate(LATER).isOk()).toBe(true);
      expect(supplier.activate(DateTime.parse('2026-11-02T09:00:00.000Z')).isOk()).toBe(true);
      expect(supplier.deactivate(DateTime.parse('2026-11-03T09:00:00.000Z')).isOk()).toBe(true);

      expect(supplier.id.value).toBe(id);
      expect(supplier.status.value).toBe('inactive');
    });
  });

  describe('snapshot and rehydration', () => {
    it('round-trips every field, including the normalized name and status', () => {
      const supplier = created({
        code: 'SUP-001',
        name: 'Acme Trading',
        identificationNumber: '10100999999',
        contactInfo: SupplierContactInfo.create({ phone: '021-1234', address: 'Tehran' }),
      });
      supplier.deactivate(LATER);

      const restored = Supplier.rehydrate(supplier.snapshot());

      expect(restored.id.value).toBe(supplier.id.value);
      expect(restored.tenantId).toBe(supplier.tenantId);
      expect(restored.code.value).toBe(supplier.code.value);
      expect(restored.name.value).toBe(supplier.name.value);
      expect(restored.normalizedName).toBe(supplier.normalizedName);
      expect(restored.identificationNumber?.value).toBe('10100999999');
      expect(restored.contactInfo?.phone).toBe('021-1234');
      expect(restored.status.value).toBe('inactive');
      expect(restored.createdAt).toBe(NOW);
      expect(restored.updatedAt).toBe(LATER);
    });
  });
});

describe('Result guard', () => {
  it('keeps the aggregate free of thrown business failures', () => {
    const outcome = create({ code: 'SUP-001' });

    expect(Result.is(outcome)).toBe(true);
  });
});
