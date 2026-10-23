import { describe, expect, it } from 'vitest';

import { createTenantContext } from '../../../shared/tenant/tenant-context.js';
import { TenantScope } from '../../../shared/tenant/tenant-scope.js';
import { TenantContextMissingError } from '../../../shared/tenant/tenant.errors.js';
import { ScopedTenantContext } from './scoped-tenant-context.js';

const TENANT_ID = '3f1b2c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d';

describe('ScopedTenantContext', () => {
  const context = new ScopedTenantContext();

  it('reports the tenant of the running scope', async () => {
    await TenantScope.run(createTenantContext(TENANT_ID), async () => {
      expect(context.requireTenantId()).toBe(TENANT_ID);
      expect(context.currentTenantId()).toBe(TENANT_ID);
      expect(context.require().state).toBe('available');
    });
  });

  it('fails closed outside any scope', () => {
    expect(context.current().state).toBe('missing');
    expect(context.currentTenantId()).toBeUndefined();
    expect(() => context.require()).toThrow(TenantContextMissingError);
    expect(() => context.requireTenantId()).toThrow(TenantContextMissingError);
  });

  it('refuses the explicit system scope', async () => {
    await TenantScope.runAsSystem(async () => {
      expect(() => context.require()).toThrow(TenantContextMissingError);
    });
  });
});