import { describe, expect, it } from 'vitest';
import { createTenantContext } from '../../../../shared/tenant/tenant-context.js';
import { TenantScope } from '../../../../shared/tenant/tenant-scope.js';
import {
  PassthroughTransactionBoundary,
  aFiscalYear,
} from '../../../../../test/support/accounting-doubles.js';
import {
  aFiscalPeriod,
  InMemoryActivePeriodRepository,
  InMemoryFiscalPeriodRepository,
} from '../../../../../test/support/fiscal-period-doubles.js';
import { RecordingAuditTrail } from '../../../../../test/support/audit-doubles.js';
import { tenantReferenceFrom } from '../../domain/value-objects/tenant-reference.js';
import { CloseFiscalPeriod } from '../commands/close-fiscal-period.command.js';
import { ReopenFiscalPeriod } from '../commands/reopen-fiscal-period.command.js';
import { CloseFiscalPeriodUseCase } from './close-fiscal-period.use-case.js';
import { ReopenFiscalPeriodUseCase } from './reopen-fiscal-period.use-case.js';
import type {
  Authorization,
  AuthorizationRequest,
} from '../../../identity/application/ports/authorization.port.js';
import type { AuthorizationContextView } from '../../../identity/application/authorization/authorization-context.view.js';
import type { PermissionKey } from '../../../identity/domain/value-objects/permission-key.js';
import { Result } from '../../../../shared/errors/result.js';
import { DomainError } from '../../../../shared/errors/domain-error.js';
import { ErrorCategory } from '../../../../shared/errors/error-category.js';
import type { AuthenticatedPrincipalView } from '../../../identity/application/views/principal.view.js';

const TENANT_ID = '018f0d3c-6d0f-7a4b-9d4e-2b3c4d5e6f70';

const ACCOUNTANT_PRINCIPAL: AuthenticatedPrincipalView = {
  userId: 'usr-accountant-001',
  displayName: 'Accountant User',
  email: 'accountant@example.com',
};

const UNAUTHORIZED_PRINCIPAL: AuthenticatedPrincipalView = {
  userId: 'usr-viewer-002',
  displayName: 'Viewer User',
  email: 'viewer@example.com',
};

class StubAuthorizationDeniedError extends DomainError {
  public constructor() {
    super('AUTHORIZATION_DENIED', 'Permission denied', {
      category: ErrorCategory.BUSINESS_RULE,
    });
  }
}

class StubAuthorization implements Authorization {
  public constructor(private readonly allow: boolean = true) {}

  public async authorize(
    request: AuthorizationRequest,
  ): Promise<Result<AuthorizationContextView, DomainError>> {
    if (!this.allow || request.principal.userId === UNAUTHORIZED_PRINCIPAL.userId) {
      return Result.fail(new StubAuthorizationDeniedError());
    }
    return Result.ok({} as unknown as AuthorizationContextView);
  }

  public permits(_context: AuthorizationContextView, _permission: PermissionKey): boolean {
    return this.allow;
  }
}

function inTenant<T>(work: () => Promise<T>): Promise<T> {
  return TenantScope.run(createTenantContext(TENANT_ID), work);
}

describe('FIS-005: Close and Reopen Fiscal Period', () => {
  function harness(options: { allowAuth?: boolean } = {}) {
    const periods = new InMemoryFiscalPeriodRepository();
    const activePeriods = new InMemoryActivePeriodRepository();
    const audit = new RecordingAuditTrail();
    const events = { record: async () => undefined };
    const auth = new StubAuthorization(options.allowAuth ?? true);
    const boundary = new PassthroughTransactionBoundary();

    const closeUseCase = new CloseFiscalPeriodUseCase(
      periods,
      activePeriods,
      events,
      audit,
      auth,
      boundary,
    );

    const reopenUseCase = new ReopenFiscalPeriodUseCase(periods, events, audit, auth, boundary);

    return { periods, activePeriods, audit, closeUseCase, reopenUseCase };
  }

  describe('Close Period', () => {
    it('allows an authorized user to close an open period and records audit', async () => {
      const app = harness();
      const year = aFiscalYear(tenantReferenceFrom(TENANT_ID), 'FY1405');
      const period = aFiscalPeriod({
        tenantId: tenantReferenceFrom(TENANT_ID),
        fiscalYearId: year.id,
        jalaliYear: 1405,
        sequence: 1,
        startDate: '2026-03-21',
        endDate: '2026-04-19',
        state: 'open',
      });
      app.periods.seed(period);

      const res = await inTenant(() =>
        app.closeUseCase.execute(
          new CloseFiscalPeriod({ periodId: period.id.value, principal: ACCOUNTANT_PRINCIPAL }),
        ),
      );

      expect(res.isOk()).toBe(true);
      expect(res.valueOrThrow().state).toBe('closed');

      const entry = app.audit.find('accounting.period.close');
      expect(entry).toBeDefined();
      expect(entry?.outcome).toBe('success');
      expect(entry?.actorUserId).toBe(ACCOUNTANT_PRINCIPAL.userId);
    });

    it('rejects closing an already closed period with PERIOD_STATE_INVALID', async () => {
      const app = harness();
      const year = aFiscalYear(tenantReferenceFrom(TENANT_ID), 'FY1405');
      const closed = aFiscalPeriod({
        tenantId: tenantReferenceFrom(TENANT_ID),
        fiscalYearId: year.id,
        jalaliYear: 1405,
        sequence: 1,
        startDate: '2026-03-21',
        endDate: '2026-04-19',
        state: 'closed',
      });
      app.periods.seed(closed);

      const res = await inTenant(() =>
        app.closeUseCase.execute(
          new CloseFiscalPeriod({ periodId: closed.id.value, principal: ACCOUNTANT_PRINCIPAL }),
        ),
      );

      expect(res.isFail()).toBe(true);
      expect(res.errorOrThrow().code).toBe('PERIOD_STATE_INVALID');
    });

    it('rejects closing the active period with PERIOD_STATE_INVALID', async () => {
      const app = harness();
      const year = aFiscalYear(tenantReferenceFrom(TENANT_ID), 'FY1405');
      const period = aFiscalPeriod({
        tenantId: tenantReferenceFrom(TENANT_ID),
        fiscalYearId: year.id,
        jalaliYear: 1405,
        sequence: 1,
        startDate: '2026-03-21',
        endDate: '2026-04-19',
        state: 'open',
      });
      app.periods.seed(period);
      await app.activePeriods.activate(tenantReferenceFrom(TENANT_ID), period.id);

      const res = await inTenant(() =>
        app.closeUseCase.execute(
          new CloseFiscalPeriod({ periodId: period.id.value, principal: ACCOUNTANT_PRINCIPAL }),
        ),
      );

      expect(res.isFail()).toBe(true);
      expect(res.errorOrThrow().code).toBe('PERIOD_STATE_INVALID');
    });

    it('refuses unauthorized users and records an audit denial entry', async () => {
      const app = harness();
      const year = aFiscalYear(tenantReferenceFrom(TENANT_ID), 'FY1405');
      const period = aFiscalPeriod({
        tenantId: tenantReferenceFrom(TENANT_ID),
        fiscalYearId: year.id,
        jalaliYear: 1405,
        sequence: 1,
        startDate: '2026-03-21',
        endDate: '2026-04-19',
      });
      app.periods.seed(period);

      const res = await inTenant(() =>
        app.closeUseCase.execute(
          new CloseFiscalPeriod({ periodId: period.id.value, principal: UNAUTHORIZED_PRINCIPAL }),
        ),
      );

      expect(res.isFail()).toBe(true);
      const entry = app.audit.find('accounting.period.close');
      expect(entry).toBeDefined();
      expect(entry?.outcome).toBe('denied');
      expect(entry?.actorUserId).toBe(UNAUTHORIZED_PRINCIPAL.userId);
    });
  });

  describe('Reopen Period', () => {
    it('allows authorized user to reopen a closed period with a mandatory reason', async () => {
      const app = harness();
      const year = aFiscalYear(tenantReferenceFrom(TENANT_ID), 'FY1405');
      const closed = aFiscalPeriod({
        tenantId: tenantReferenceFrom(TENANT_ID),
        fiscalYearId: year.id,
        jalaliYear: 1405,
        sequence: 1,
        startDate: '2026-03-21',
        endDate: '2026-04-19',
        state: 'closed',
      });
      app.periods.seed(closed);

      const res = await inTenant(() =>
        app.reopenUseCase.execute(
          new ReopenFiscalPeriod({
            periodId: closed.id.value,
            reason: 'Correction of misallocated expense',
            principal: ACCOUNTANT_PRINCIPAL,
          }),
        ),
      );

      expect(res.isOk()).toBe(true);
      expect(res.valueOrThrow().state).toBe('open');

      const entry = app.audit.find('accounting.period.reopen');
      expect(entry).toBeDefined();
      expect(entry?.outcome).toBe('success');
      const meta = entry?.metadata as Record<string, unknown> | undefined;
      expect(meta?.reason).toBe('Correction of misallocated expense');
    });

    it('rejects reopening without a reason with REOPEN_REASON_REQUIRED', async () => {
      const app = harness();
      const year = aFiscalYear(tenantReferenceFrom(TENANT_ID), 'FY1405');
      const closed = aFiscalPeriod({
        tenantId: tenantReferenceFrom(TENANT_ID),
        fiscalYearId: year.id,
        jalaliYear: 1405,
        sequence: 1,
        startDate: '2026-03-21',
        endDate: '2026-04-19',
        state: 'closed',
      });
      app.periods.seed(closed);

      const res = await inTenant(() =>
        app.reopenUseCase.execute(
          new ReopenFiscalPeriod({
            periodId: closed.id.value,
            reason: '   ',
            principal: ACCOUNTANT_PRINCIPAL,
          }),
        ),
      );

      expect(res.isFail()).toBe(true);
      expect(res.errorOrThrow().code).toBe('REOPEN_REASON_REQUIRED');
    });

    it('rejects reopening an already open period with PERIOD_STATE_INVALID', async () => {
      const app = harness();
      const year = aFiscalYear(tenantReferenceFrom(TENANT_ID), 'FY1405');
      const openPeriod = aFiscalPeriod({
        tenantId: tenantReferenceFrom(TENANT_ID),
        fiscalYearId: year.id,
        jalaliYear: 1405,
        sequence: 1,
        startDate: '2026-03-21',
        endDate: '2026-04-19',
        state: 'open',
      });
      app.periods.seed(openPeriod);

      const res = await inTenant(() =>
        app.reopenUseCase.execute(
          new ReopenFiscalPeriod({
            periodId: openPeriod.id.value,
            reason: 'Valid reason here',
            principal: ACCOUNTANT_PRINCIPAL,
          }),
        ),
      );

      expect(res.isFail()).toBe(true);
      expect(res.errorOrThrow().code).toBe('PERIOD_STATE_INVALID');
    });
  });
});
