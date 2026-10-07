import { describe, expect, it } from 'vitest';

import { PermissionKey } from '../value-objects/permission-key.js';
import { decideAuthorization, permits } from './authorization-policy.js';
import { permissionRequirement, tenantPermissionRequirement } from './authorization-requirement.js';

/**
 * The authorization policy, as a pure function (IAM-006).
 *
 * Every branch of the decision is asserted here — no repository, no HTTP and no
 * clock — so the rule the whole enforcement path rests on is verified
 * independently of the plumbing that feeds it. The order matters as much as the
 * outcome: a caller must be able to tell *why* they were refused, which is what
 * makes the four denials distinguishable at the boundary.
 */

const READ = PermissionKey.from('company.read');
const MANAGE = PermissionKey.from('company.update');
const TENANT = '018f0d3c-6d0f-7a4b-9d4e-2b3c4d5e6f70';
const OTHER_TENANT = '018f0d3c-6d0f-7a4b-9d4e-2b3c4d5e6f71';

describe('decideAuthorization — tenant-scoped requirements', () => {
  const requirement = tenantPermissionRequirement(MANAGE);

  it('allows an active membership in the target tenant that holds the capability', () => {
    const decision = decideAuthorization(requirement, {
      targetTenantId: TENANT,
      membership: { membershipId: 'm-1', tenantId: TENANT, active: true },
      permissions: new Set(['company.update']),
    });

    expect(decision).toEqual({ allowed: true });
  });

  it('denies when no tenant was supplied', () => {
    const decision = decideAuthorization(requirement, { permissions: new Set(['company.update']) });

    expect(decision).toEqual({ allowed: false, reason: 'TENANT_CONTEXT_MISSING' });
  });

  it('treats a blank tenant as no tenant', () => {
    const decision = decideAuthorization(requirement, {
      targetTenantId: '   ',
      permissions: new Set(['company.update']),
    });

    expect(decision).toEqual({ allowed: false, reason: 'TENANT_CONTEXT_MISSING' });
  });

  it('denies a caller with no membership in the target tenant', () => {
    const decision = decideAuthorization(requirement, {
      targetTenantId: TENANT,
      permissions: new Set(['company.update']),
    });

    expect(decision).toEqual({ allowed: false, reason: 'MEMBERSHIP_MISSING' });
  });

  it('denies an inactive membership before it considers the capability', () => {
    const decision = decideAuthorization(requirement, {
      targetTenantId: TENANT,
      membership: { membershipId: 'm-1', tenantId: TENANT, active: false },
      permissions: new Set(['company.update']),
    });

    expect(decision).toEqual({ allowed: false, reason: 'MEMBERSHIP_INACTIVE' });
  });

  it('denies a membership that belongs to another tenant as inconsistent evidence', () => {
    const decision = decideAuthorization(requirement, {
      targetTenantId: TENANT,
      membership: { membershipId: 'm-1', tenantId: OTHER_TENANT, active: true },
      permissions: new Set(['company.update']),
    });

    expect(decision).toEqual({ allowed: false, reason: 'CONTEXT_INCONSISTENT' });
  });

  it('denies an active member who does not hold the capability', () => {
    const decision = decideAuthorization(requirement, {
      targetTenantId: TENANT,
      membership: { membershipId: 'm-1', tenantId: TENANT, active: true },
      permissions: new Set(['company.read']),
    });

    expect(decision).toEqual({ allowed: false, reason: 'PERMISSION_MISSING' });
  });
});

describe('decideAuthorization — platform requirements', () => {
  const requirement = permissionRequirement(READ);

  it('allows when the resolved capability set holds the permission', () => {
    expect(decideAuthorization(requirement, { permissions: new Set(['company.read']) })).toEqual({
      allowed: true,
    });
  });

  it('denies when the capability is absent, and never asks for a tenant', () => {
    expect(decideAuthorization(requirement, { permissions: new Set<string>() })).toEqual({
      allowed: false,
      reason: 'PERMISSION_MISSING',
    });
    expect(
      decideAuthorization(requirement, {
        targetTenantId: TENANT,
        permissions: new Set(['company.read']),
      }),
    ).toEqual({ allowed: true });
  });
});

describe('permits', () => {
  it('answers from a resolved set or a resolved list', () => {
    expect(permits(new Set(['company.read']), READ)).toBe(true);
    expect(permits(['company.read'], READ)).toBe(true);
    expect(permits(new Set(['company.read']), MANAGE)).toBe(false);
    expect(permits([], MANAGE)).toBe(false);
  });
});
