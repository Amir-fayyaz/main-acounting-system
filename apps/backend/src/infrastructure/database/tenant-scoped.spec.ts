import { describe, expect, it } from 'vitest';

import { createTenantContext } from '../../shared/tenant/tenant-context.js';
import { TenantScope } from '../../shared/tenant/tenant-scope.js';
import {
  TenantContextMissingError,
  TenantIsolationViolationError,
} from '../../shared/tenant/tenant.errors.js';
import {
  assertPlatformWrite,
  assertTenantCriterion,
  assertTenantOwnership,
  requireSystemScope,
  requireTenantId,
} from './tenant-scoped.js';

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
    const interleave = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 5));

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

/**
 * Repository-level tenant enforcement (IAM-007, sections 4–5 and 9).
 *
 * These are the guards every tenant-owned adapter calls: writes must own the
 * active tenant, an explicit tenant criterion must match it, cross-tenant reads
 * must declare themselves system-level, and tenant work cannot widen itself
 * into a system scope.
 */
describe('tenant isolation guards', () => {
  it('assertTenantOwnership accepts the active tenant', async () => {
    const tenantId = await TenantScope.run(createTenantContext('tenant-A'), async () =>
      assertTenantOwnership('tenant-A', 'MembershipRepository.add'),
    );

    expect(tenantId).toBe('tenant-A');
  });

  it('assertTenantOwnership refuses another tenant without revealing either id', async () => {
    await TenantScope.run(createTenantContext('tenant-A'), async () => {
      expect(() => assertTenantOwnership('tenant-B', 'MembershipRepository.add')).toThrow(
        TenantIsolationViolationError,
      );
    });
  });

  it('assertTenantOwnership fails closed with no scope or under system scope', async () => {
    expect(() => assertTenantOwnership('tenant-A', 'RoleRepository.add')).toThrow(
      TenantContextMissingError,
    );

    await TenantScope.runAsSystem(async () => {
      expect(() => assertTenantOwnership('tenant-A', 'RoleRepository.add')).toThrow(
        TenantContextMissingError,
      );
    });
  });

  it('assertTenantCriterion requires the active tenant under an available scope', async () => {
    await TenantScope.run(createTenantContext('tenant-A'), async () => {
      expect(assertTenantCriterion('tenant-A', 'MembershipRepository.findByTenantId')).toBe(
        'tenant-A',
      );
      expect(() =>
        assertTenantCriterion('tenant-B', 'MembershipRepository.findByTenantId'),
      ).toThrow(TenantIsolationViolationError);
    });
  });

  it('assertTenantCriterion allows an explicit system read but refuses an unscoped one', async () => {
    await TenantScope.runAsSystem(async () => {
      expect(assertTenantCriterion('tenant-B', 'MembershipRepository.findByUserAndTenant')).toBe(
        'tenant-B',
      );
    });

    expect(() =>
      assertTenantCriterion('tenant-B', 'MembershipRepository.findByUserAndTenant'),
    ).toThrow(TenantContextMissingError);
  });

  it('requireSystemScope refuses missing and tenant-scoped execution', async () => {
    expect(() => requireSystemScope('MembershipRepository.findByUserId')).toThrow(
      TenantIsolationViolationError,
    );

    await TenantScope.run(createTenantContext('tenant-A'), async () => {
      expect(() => requireSystemScope('MembershipRepository.findByUserId')).toThrow(
        TenantIsolationViolationError,
      );
    });

    await TenantScope.runAsSystem(async () => {
      expect(() => requireSystemScope('MembershipRepository.findByUserId')).not.toThrow();
    });
  });

  it('assertPlatformWrite refuses a platform record under a tenant scope', async () => {
    await TenantScope.run(createTenantContext('tenant-A'), async () => {
      expect(() => assertPlatformWrite('AuditRecordRepository.add')).toThrow(
        TenantIsolationViolationError,
      );
    });

    expect(() => assertPlatformWrite('AuditRecordRepository.add')).not.toThrow();
    await TenantScope.runAsSystem(async () => {
      expect(() => assertPlatformWrite('AuditRecordRepository.add')).not.toThrow();
    });
  });

  it('an ordinary tenant scope cannot escalate into the system scope', async () => {
    await TenantScope.run(createTenantContext('tenant-A'), async () => {
      expect(() => TenantScope.runAsSystem(async () => undefined)).toThrow(
        TenantIsolationViolationError,
      );
    });
  });
});
