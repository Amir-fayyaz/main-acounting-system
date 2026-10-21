import { describe, expect, it } from 'vitest';
import { SelectActiveCompany } from '../commands/select-active-company.command.js';
import { SelectActiveCompanyUseCase } from './select-active-company.use-case.js';
import { InMemoryActiveTenantPreference } from '../../infrastructure/persistence/in-memory-active-tenant-preference.js';
import { TenantAccessDeniedError } from '../../domain/errors/tenant-access.errors.js';

/** Minimal membership aggregate stub matching isActive + tenantIdValue. */
function membership(tenantId: string, active: boolean) {
  return {
    aggregate: {
      tenantIdValue: () => tenantId,
      isActive: () => active,
    },
  };
}

describe('SelectActiveCompanyUseCase', () => {
  const userId = '11111111-1111-4111-8111-111111111111';
  const tenantA = '22222222-2222-4222-8222-222222222222';
  const tenantB = '33333333-3333-4333-8333-333333333333';

  it('selects a company the user actively belongs to', async () => {
    const preferences = new InMemoryActiveTenantPreference();
    const audit: { recorded: unknown[] } = { recorded: [] };
    const useCase = new SelectActiveCompanyUseCase(
      {
        findByUserId: async () => [membership(tenantA, true)],
      } as never,
      preferences,
      { record: async (e) => { audit.recorded.push(e); } },
    );

    const outcome = await useCase.execute(
      new SelectActiveCompany({ userId, tenantId: tenantA }),
    );

    expect(outcome.isFail()).toBe(false);
    expect(outcome.valueOrThrow()).toEqual({ tenantId: tenantA, userId });
    expect(await preferences.get(userId)).toBe(tenantA);
    expect(audit.recorded[0]).toMatchObject({
      action: 'company.select_active',
      outcome: 'success',
    });
  });

  it('returns TENANT_ACCESS_DENIED when the user is not a member', async () => {
    const preferences = new InMemoryActiveTenantPreference();
    const audit: { recorded: unknown[] } = { recorded: [] };
    const useCase = new SelectActiveCompanyUseCase(
      {
        findByUserId: async () => [membership(tenantA, true)],
      } as never,
      preferences,
      { record: async (e) => { audit.recorded.push(e); } },
    );

    const outcome = await useCase.execute(
      new SelectActiveCompany({ userId, tenantId: tenantB }),
    );

    expect(outcome.isFail()).toBe(true);
    expect(outcome.errorOrThrow()).toBeInstanceOf(TenantAccessDeniedError);
    expect(outcome.errorOrThrow().code).toBe('TENANT_ACCESS_DENIED');
    expect(await preferences.get(userId)).toBeUndefined();
    expect(audit.recorded[0]).toMatchObject({ outcome: 'denied' });
  });

  it('returns TENANT_ACCESS_DENIED when membership is inactive', async () => {
    const useCase = new SelectActiveCompanyUseCase(
      {
        findByUserId: async () => [membership(tenantA, false)],
      } as never,
      new InMemoryActiveTenantPreference(),
      { record: async () => undefined },
    );

    const outcome = await useCase.execute(
      new SelectActiveCompany({ userId, tenantId: tenantA }),
    );

    expect(outcome.isFail()).toBe(true);
    expect(outcome.errorOrThrow().code).toBe('TENANT_ACCESS_DENIED');
  });
});
