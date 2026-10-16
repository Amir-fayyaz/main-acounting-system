import { describe, expect, it } from 'vitest';

import { TenantScope } from '../../../../shared/tenant/tenant-scope.js';
import { createTenantContext } from '../../../../shared/tenant/tenant-context.js';
import { TenantContextMissingError } from '../../../../shared/tenant/tenant.errors.js';
import { DateTime } from '../../../../shared/time/date-time.js';
import {
  anAuditRecord,
  InMemoryAuditRecordQuery,
} from '../../../../../test/support/audit-doubles.js';
import {
  ListTenantAuditRecords,
  type ListTenantAuditRecordsParams,
} from '../queries/list-tenant-audit-records.query.js';
import { ListTenantAuditRecordsUseCase } from './list-tenant-audit-records.use-case.js';

/**
 * The audit retrieval use case (AUD-001).
 *
 * Two questions are pinned here, and they are the two the acceptance criteria
 * make security claims about: *which* tenant a read may see (the resolved scope,
 * never the claim) and *what* it may filter on — with the standard pagination
 * envelope built from the store's total.
 */

const TENANT_A = '018f0d3c-6d0f-7a4b-9d4e-2b3c4d5e6f70';
const TENANT_B = '018f0d3c-6d0f-7a4b-9d4e-2b3c4d5e6f71';
const USER = '018f0d3c-6d0f-7a4b-9d4e-2b3c4d5e6f72';
const OTHER_USER = '018f0d3c-6d0f-7a4b-9d4e-2b3c4d5e6f73';

/** Seeds a trail with two tenants, two actors, two actions and three instants. */
function aTrail(): InMemoryAuditRecordQuery {
  const query = new InMemoryAuditRecordQuery();

  query.seedRecord(
    anAuditRecord({
      tenantId: TENANT_A,
      actorUserId: USER,
      action: 'user.signed_in',
      occurredAt: DateTime.parse('2026-10-16T09:00:00.000Z'),
    }),
  );
  query.seedRecord(
    anAuditRecord({
      tenantId: TENANT_A,
      actorUserId: OTHER_USER,
      action: 'authorization.denied',
      outcome: 'denied',
      targetType: 'tenant',
      targetId: TENANT_A,
      occurredAt: DateTime.parse('2026-10-16T10:00:00.000Z'),
    }),
  );
  query.seedRecord(
    anAuditRecord({
      tenantId: TENANT_B,
      actorUserId: OTHER_USER,
      action: 'user.signed_in',
      occurredAt: DateTime.parse('2026-10-16T11:00:00.000Z'),
    }),
  );

  return query;
}

/** The params a request starts from, so each test overrides only what it means to. */
function params(
  overrides: Partial<ListTenantAuditRecordsParams> = {},
): ListTenantAuditRecordsParams {
  return {
    tenantId: TENANT_A,
    page: 1,
    limit: 20,
    ...overrides,
  };
}

describe('ListTenantAuditRecordsUseCase — the tenant scope', () => {
  it('reads the trail of the resolved scope', async () => {
    const useCase = new ListTenantAuditRecordsUseCase(aTrail());

    const page = await TenantScope.run(createTenantContext(TENANT_A), () =>
      useCase.execute(new ListTenantAuditRecords(params())),
    );

    expect(page.isOk()).toBe(true);
    expect(page.valueOrThrow().records).toHaveLength(2);
    expect(page.valueOrThrow().records.every((record) => record.tenantId === TENANT_A)).toBe(true);
  });

  it('refuses a claim that does not match the scope, without revealing the other tenant', async () => {
    const useCase = new ListTenantAuditRecordsUseCase(aTrail());

    const outcome = await TenantScope.run(createTenantContext(TENANT_A), () =>
      useCase.execute(new ListTenantAuditRecords(params({ tenantId: TENANT_B }))),
    );

    expect(outcome.isFail()).toBe(true);
    expect(outcome.errorOrThrow().code).toBe('NOT_FOUND');
  });

  it('fails closed when no scope is established', async () => {
    const useCase = new ListTenantAuditRecordsUseCase(aTrail());

    await expect(useCase.execute(new ListTenantAuditRecords(params()))).rejects.toThrow(
      TenantContextMissingError,
    );
  });

  it('refuses a malformed tenant identifier as validation, not as a lookup', async () => {
    const useCase = new ListTenantAuditRecordsUseCase(aTrail());

    const outcome = await TenantScope.run(createTenantContext(TENANT_A), () =>
      useCase.execute(new ListTenantAuditRecords(params({ tenantId: 'not a tenant' }))),
    );

    expect(outcome.errorOrThrow().code).toBe('VALIDATION_FAILED');
  });
});

describe('ListTenantAuditRecordsUseCase — filtering', () => {
  it('filters by actor, action, target and outcome', async () => {
    const useCase = new ListTenantAuditRecordsUseCase(aTrail());

    const outcome = await TenantScope.run(createTenantContext(TENANT_A), () =>
      useCase.execute(
        new ListTenantAuditRecords(
          params({
            action: 'authorization.denied',
            actorUserId: OTHER_USER,
            targetType: 'tenant',
            targetId: TENANT_A,
            outcome: 'denied',
          }),
        ),
      ),
    );

    const page = outcome.valueOrThrow();
    expect(page.total).toBe(1);
    expect(page.records[0].action).toBe('authorization.denied');
  });

  it('filters by a time window, inclusively', async () => {
    const useCase = new ListTenantAuditRecordsUseCase(aTrail());

    const outcome = await TenantScope.run(createTenantContext(TENANT_A), () =>
      useCase.execute(
        new ListTenantAuditRecords(
          params({ from: '2026-10-16T09:30:00.000Z', to: '2026-10-16T10:30:00.000Z' }),
        ),
      ),
    );

    const page = outcome.valueOrThrow();
    expect(page.total).toBe(1);
    expect(page.records[0].action).toBe('authorization.denied');
  });

  it('refuses a reversed time window instead of answering a question nobody asked', async () => {
    const useCase = new ListTenantAuditRecordsUseCase(aTrail());

    const outcome = await TenantScope.run(createTenantContext(TENANT_A), () =>
      useCase.execute(
        new ListTenantAuditRecords(
          params({ from: '2026-10-16T10:00:00.000Z', to: '2026-10-16T09:00:00.000Z' }),
        ),
      ),
    );

    expect(outcome.errorOrThrow().code).toBe('INVALID_AUDIT_TIME_RANGE');
  });

  it.each([
    ['an unknown outcome', { outcome: 'maybe' }],
    ['a malformed action', { action: 'signed_in' }],
    ['a malformed instant', { from: '2026-10-16' }],
    ['a malformed actor', { actorUserId: 'not an id!' }],
    ['a malformed target type', { targetType: 'Tenant Type' }],
  ])('refuses %s instead of silently widening the read', async (_name, filter) => {
    const useCase = new ListTenantAuditRecordsUseCase(aTrail());

    const outcome = await TenantScope.run(createTenantContext(TENANT_A), () =>
      useCase.execute(new ListTenantAuditRecords(params(filter))),
    );

    expect(outcome.isFail()).toBe(true);
    expect(outcome.errorOrThrow().category).toBe('VALIDATION');
  });
});

describe('ListTenantAuditRecordsUseCase — the pagination envelope', () => {
  it('answers one page plus the filtered total, newest first', async () => {
    const useCase = new ListTenantAuditRecordsUseCase(aTrail());

    const first = await TenantScope.run(createTenantContext(TENANT_A), () =>
      useCase.execute(new ListTenantAuditRecords(params({ page: 1, limit: 1 }))),
    );
    const second = await TenantScope.run(createTenantContext(TENANT_A), () =>
      useCase.execute(new ListTenantAuditRecords(params({ page: 2, limit: 1 }))),
    );

    expect(first.valueOrThrow().total).toBe(2);
    expect(first.valueOrThrow().records[0].action).toBe('authorization.denied');
    expect(second.valueOrThrow().total).toBe(2);
    expect(second.valueOrThrow().records[0].action).toBe('user.signed_in');
  });

  it('refuses a page or a size outside the allowed range', async () => {
    const useCase = new ListTenantAuditRecordsUseCase(aTrail());

    for (const bad of [{ page: 0 }, { limit: 0 }, { page: -1 }]) {
      const outcome = await TenantScope.run(createTenantContext(TENANT_A), () =>
        useCase.execute(new ListTenantAuditRecords(params(bad))),
      );

      expect(outcome.isFail()).toBe(true);
      expect(outcome.errorOrThrow().category).toBe('VALIDATION');
    }
  });
});
