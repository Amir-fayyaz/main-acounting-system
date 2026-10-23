import { describe, expect, it } from 'vitest';

import { canonicalTenantId, isSameTenant } from './tenant-identity.js';

/**
 * The canonical spelling of a tenant identifier (IAM-007).
 *
 * A tenant id is opaque at the transport level and a UUID everywhere tenant
 * data is owned, so the two spellings of one UUID must be one boundary — while
 * two different UUIDs never are.
 */
describe('canonicalTenantId', () => {
  it('folds a UUID to its canonical lower-case form', () => {
    expect(canonicalTenantId('018F0D3C-6D0F-7A4B-9D4E-2B3C4D5E6F70')).toBe(
      '018f0d3c-6d0f-7a4b-9d4e-2b3c4d5e6f70',
    );
  });

  it('trims a non-UUID identifier and leaves its spelling alone', () => {
    expect(canonicalTenantId('  tenant-42  ')).toBe('tenant-42');
  });
});

describe('isSameTenant', () => {
  it('answers true for the two spellings of one UUID', () => {
    expect(
      isSameTenant('018F0D3C-6D0F-7A4B-9D4E-2B3C4D5E6F70', '018f0d3c-6d0f-7a4b-9d4e-2b3c4d5e6f70'),
    ).toBe(true);
  });

  it('answers false for two different tenants', () => {
    expect(
      isSameTenant('018f0d3c-6d0f-7a4b-9d4e-2b3c4d5e6f70', '018f0d3c-6d0f-7a4b-9d4e-2b3c4d5e6f71'),
    ).toBe(false);
  });

  it('compares a non-UUID identifier exactly', () => {
    expect(isSameTenant('tenant-42', 'tenant-42')).toBe(true);
    expect(isSameTenant('tenant-42', 'tenant-43')).toBe(false);
    expect(isSameTenant('tenant-42', 'TENANT-42')).toBe(false);
  });
});
