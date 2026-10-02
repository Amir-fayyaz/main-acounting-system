import { describe, expect, it } from 'vitest';

import { InvalidPrimitiveError } from '../primitives/invalid-primitive-error.js';
import {
  createTenantContext,
  MISSING_TENANT_CONTEXT,
  SYSTEM_TENANT_CONTEXT,
} from './tenant-context.js';

describe('TenantContext — creation', () => {
  it('captures the tenant a trusted boundary resolved', () => {
    const context = createTenantContext('018f0c1e-7b1e-7000-8000-000000000001');

    expect(context).toEqual({
      state: 'available',
      tenantId: '018f0c1e-7b1e-7000-8000-000000000001',
    });
    expect(context.state).toBe('available');
  });

  it('carries the correlation id of the flow when there is one', () => {
    const context = createTenantContext('tenant-42', { correlationId: 'flow-7' });

    expect(context.correlationId).toBe('flow-7');
  });

  it('omits the correlation id when the flow has none', () => {
    const context = createTenantContext('tenant-42');

    expect(context).not.toHaveProperty('correlationId');
  });

  it('trims the identifier like every other primitive', () => {
    expect(createTenantContext('  tenant-42  ').tenantId).toBe('tenant-42');
  });

  it('is frozen — the scope of an execution is not rewritten while it runs', () => {
    const context = createTenantContext('tenant-42');

    expect(Object.isFrozen(context)).toBe(true);
    expect(() => {
      (context as { tenantId: string }).tenantId = 'tenant-66';
    }).toThrow(TypeError);
  });
});

describe('TenantContext — invalid input', () => {
  it.each([
    ['a blank tenant id', ''],
    ['a whitespace-only tenant id', '   '],
    ['a tenant id with a space', 'tenant 42'],
    ['a tenant id with a path separator', 'tenant/42'],
    ['an unbounded tenant id', 't'.repeat(129)],
  ])('rejects %s with InvalidPrimitiveError', (_label, tenantId) => {
    expect(() => createTenantContext(tenantId)).toThrow(InvalidPrimitiveError);
  });

  it('rejects a non-string tenant id', () => {
    expect(() => createTenantContext(42 as unknown as string)).toThrow(InvalidPrimitiveError);
  });

  it('rejects an invalid correlation id', () => {
    expect(() => createTenantContext('tenant-42', { correlationId: 'not an id' })).toThrow(
      InvalidPrimitiveError,
    );
  });

  it('names the primitive and the field, never echoing a payload', () => {
    expect(() => createTenantContext('tenant 42')).toThrow(/TenantContext: tenantId/);
    expect(() => createTenantContext('tenant-42', { correlationId: 'x y' })).toThrow(
      /TenantContext: correlationId/,
    );
  });
});

describe('TenantContext — availability states', () => {
  it('reports missing as a state outside any scope — a refusal, not a crash', () => {
    expect(MISSING_TENANT_CONTEXT.state).toBe('missing');
    expect(Object.isFrozen(MISSING_TENANT_CONTEXT)).toBe(true);
  });

  it('declares an explicit system state for work that intentionally has no tenant', () => {
    expect(SYSTEM_TENANT_CONTEXT.state).toBe('system');
    expect(Object.isFrozen(SYSTEM_TENANT_CONTEXT)).toBe(true);
  });
});
