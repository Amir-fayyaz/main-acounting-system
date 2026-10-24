import { describe, expect, it } from 'vitest';

import {
  InMemoryActiveCompanyPreference,
  StubTenantMembership,
} from '../../../../test/support/identity-active-company-doubles.js';
import { RecordingAuditTrail } from '../../../../test/support/audit-doubles.js';
import { PassthroughTransactionBoundary } from '../../../../test/support/tenant-doubles.js';
import { SelectActiveCompany } from './commands/select-active-company.command.js';
import { SelectActiveCompanyUseCase } from './use-cases/select-active-company.use-case.js';

const USER_ID = '018f0d3c-6d0f-7a4b-9d4e-2b3c4d5e6f99';
const TENANT_ID = '018f0d3c-6d0f-7a4b-9d4e-2b3c4d5e6f70';
const OTHER_TENANT_ID = '018f0d3c-6d0f-7a4b-9d4e-2b3c4d5e6f71';

interface Harness {
  readonly memberships: StubTenantMembership;
  readonly preferences: InMemoryActiveCompanyPreference;
  readonly audit: RecordingAuditTrail;
  readonly useCase: SelectActiveCompanyUseCase;
}

function harness(): Harness {
  const memberships = new StubTenantMembership();
  const preferences = new InMemoryActiveCompanyPreference();
  const audit = new RecordingAuditTrail();
  const boundary = new PassthroughTransactionBoundary();

  return {
    memberships,
    preferences,
    audit,
    useCase: new SelectActiveCompanyUseCase(memberships, preferences, audit, boundary),
  };
}

describe('SelectActiveCompany', () => {
  it('stores the selection for a member and audits it', async () => {
    const app = harness();
    app.memberships.grant(USER_ID, TENANT_ID);

    const outcome = await app.useCase.execute(
      new SelectActiveCompany({ userId: USER_ID, tenantId: TENANT_ID }),
    );

    expect(outcome.isOk()).toBe(true);
    expect(outcome.valueOrThrow().tenantId).toBe(TENANT_ID);
    expect(app.preferences.selectedFor(USER_ID)).toBe(TENANT_ID);

    const entry = app.audit.find('company.selected');
    expect(entry).toMatchObject({
      outcome: 'success',
      actorUserId: USER_ID,
      target: { type: 'tenant', id: TENANT_ID },
    });
  });

  it('replaces a previous selection instead of adding another', async () => {
    const app = harness();
    app.memberships.grant(USER_ID, TENANT_ID);
    app.memberships.grant(USER_ID, OTHER_TENANT_ID);

    await app.useCase.execute(new SelectActiveCompany({ userId: USER_ID, tenantId: TENANT_ID }));
    await app.useCase.execute(
      new SelectActiveCompany({ userId: USER_ID, tenantId: OTHER_TENANT_ID }),
    );

    expect(app.preferences.selectedFor(USER_ID)).toBe(OTHER_TENANT_ID);
  });

  it('refuses a company the user does not belong to and records the denial', async () => {
    const app = harness();

    const outcome = await app.useCase.execute(
      new SelectActiveCompany({ userId: USER_ID, tenantId: TENANT_ID }),
    );

    expect(outcome.isFail()).toBe(true);
    expect(outcome.errorOrThrow().code).toBe('TENANT_ACCESS_DENIED');
    expect(app.preferences.selectedFor(USER_ID)).toBeUndefined();

    expect(app.audit.find('company.selection_denied')).toMatchObject({
      outcome: 'denied',
      actorUserId: USER_ID,
    });
    expect(app.audit.find('company.selected')).toBeUndefined();
  });

  it('answers an unknown company exactly like one the user cannot access', async () => {
    const app = harness();
    app.memberships.grant(USER_ID, TENANT_ID);

    const outcome = await app.useCase.execute(
      new SelectActiveCompany({
        userId: USER_ID,
        tenantId: '018f0d3c-6d0f-7a4b-9d4e-2b3c4d5e6f72',
      }),
    );

    expect(outcome.errorOrThrow().code).toBe('TENANT_ACCESS_DENIED');
  });

  it('rejects a malformed tenant identifier without disclosing anything', async () => {
    const app = harness();

    const outcome = await app.useCase.execute(
      new SelectActiveCompany({ userId: USER_ID, tenantId: 'not-a-tenant' }),
    );

    expect(outcome.errorOrThrow().code).toBe('TENANT_ACCESS_DENIED');
    expect(app.preferences.selectedFor(USER_ID)).toBeUndefined();
  });

  it('rejects an inconsistent authenticated identity', async () => {
    const app = harness();

    const outcome = await app.useCase.execute(
      new SelectActiveCompany({ userId: 'not-a-user', tenantId: TENANT_ID }),
    );

    expect(outcome.errorOrThrow().code).toBe('AUTHORIZATION_CONTEXT_INVALID');
  });
});
