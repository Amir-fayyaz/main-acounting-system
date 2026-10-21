import { describe, expect, it } from 'vitest';

import { createTenantContext } from '../../shared/tenant/tenant-context.js';
import { TenantScope } from '../../shared/tenant/tenant-scope.js';
import { TenantContextMissingError } from '../../shared/tenant/tenant.errors.js';
import { requireTenantId } from './tenant-scoped.js';

/**
 * Central tenant filter contract (TNT-002).
 *
 * Without an available scope the helper refuses; under two concurrent scopes
 * each sees only its own id — the foundation that repository queries filtered
 * by `tenantEq` / `requireTenantId` cannot leak rows across companies.
 */
describe('tenant-scoped persistence helpers', () => {
  it('requireTenantId fails closed when no scope is established', () => {
    expect(() => requireTenantId()).toThrow(TenantContextMissingError);
  });

  it('requireTenantId fails closed under system scope', async () => {
    await TenantScope.runAsSystem(async () => {
      expect(() => requireTenantId()).toThrow(TenantContextMissingError);
    });
  });

  it('requireTenantId returns the ambient tenant id', async () => {
    const id = await TenantScope.run(createTenantContext('tenant-A'), async () =>
      requireTenantId(),
    );
    expect(id).toBe('tenant-A');
  });

  it('concurrent scopes never share a tenant id', async () => {
    const interleave = (): Promise<void> =>
      new Promise((resolve) => setTimeout(resolve, 5));

    const [a, b] = await Promise.all([
      TenantScope.run(createTenantContext('tenant-A'), async () => {
        await interleave();
        return requireTenantId();
      }),
      TenantScope.run(createTenantContext('tenant-B'), async () => {
        await interleave();
        return requireTenantId();
      }),
    ]);

    expect(a).toBe('tenant-A');
    expect(b).toBe('tenant-B');
  });
});
