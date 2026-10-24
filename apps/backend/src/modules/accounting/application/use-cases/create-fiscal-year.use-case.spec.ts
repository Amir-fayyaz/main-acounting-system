import { describe, expect, it } from 'vitest';

import { createTenantContext } from '../../../../shared/tenant/tenant-context.js';
import { TenantScope } from '../../../../shared/tenant/tenant-scope.js';
import { TenantContextMissingError } from '../../../../shared/tenant/tenant.errors.js';
import {
  aFiscalYear,
  databaseRefusedDuplicateLabel,
  databaseRefusedOverlap,
  InMemoryFiscalYearRepository,
  PassthroughTransactionBoundary,
  RecordingFiscalYearEvents,
} from '../../../../../test/support/accounting-doubles.js';
import { fiscalYearIdFrom } from '../../domain/value-objects/fiscal-year-id.js';
import { tenantReferenceFrom } from '../../domain/value-objects/tenant-reference.js';
import { CreateFiscalYear } from '../commands/create-fiscal-year.command.js';
import { CreateFiscalYearUseCase } from './create-fiscal-year.use-case.js';

/**
 * The create-fiscal-year use case over an in-memory repository (FIS-002,
 * design section 8.2). The MySQL-only halves of the contract — the triggers,
 * the unique key and the scope filter in the adapter — are proven in
 * `test/fiscal-year-persistence.e2e-spec.ts`.
 */

const TENANT_A = '018f0d3c-6d0f-7a4b-9d4e-2b3c4d5e6f70';
const TENANT_B = '018f0d3d-6d0f-7a4b-9d4e-2b3c4d5e6f71';

interface Harness {
  readonly repository: InMemoryFiscalYearRepository;
  readonly events: RecordingFiscalYearEvents;
  readonly boundary: PassthroughTransactionBoundary;
  readonly createFiscalYear: CreateFiscalYearUseCase;
}

function harness(): Harness {
  const repository = new InMemoryFiscalYearRepository();
  const events = new RecordingFiscalYearEvents();
  const boundary = new PassthroughTransactionBoundary();

  return {
    repository,
    events,
    boundary,
    createFiscalYear: new CreateFiscalYearUseCase(repository, events, boundary),
  };
}

/** Runs tenant-scoped work the way the trusted entry point does. */
function inTenant<T>(tenantId: string, work: () => Promise<T>): Promise<T> {
  return TenantScope.run(createTenantContext(tenantId), work);
}

function command(
  payload: { label: string; startDate: string; endDate: string } = {
    label: 'FY2024',
    startDate: '2024-01-01',
    endDate: '2024-12-31',
  },
): CreateFiscalYear {
  return new CreateFiscalYear(payload);
}

describe('CreateFiscalYearUseCase', () => {
  describe('creation', () => {
    it('creates an open year, persists it and records FiscalYearCreated', async () => {
      const app = harness();

      const outcome = await inTenant(TENANT_A, () => app.createFiscalYear.execute(command()));

      expect(outcome.isOk()).toBe(true);
      const view = outcome.valueOrThrow();
      expect(view).toMatchObject({
        tenantId: TENANT_A,
        label: 'FY2024',
        startDate: '2024-01-01',
        endDate: '2024-12-31',
        status: 'open',
        revision: 1,
      });
      expect(view.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
      expect(view.createdAt).toBe(view.updatedAt);
      expect(app.repository.addCalls).toBe(1);
      expect(app.repository.revisionOf(fiscalYearIdFrom(view.id))?.value).toBe(1);

      expect(app.events.recorded).toHaveLength(1);
      const event = app.events.recorded[0];
      expect(event?.name).toBe('FiscalYearCreated');
      expect(event?.metadata.tenantId).toBe(TENANT_A);
      expect(event?.data).toMatchObject({
        tenantId: TENANT_A,
        fiscalYearId: view.id,
        label: 'FY2024',
        startDate: '2024-01-01',
        endDate: '2024-12-31',
        status: 'open',
      });
    });

    it('opens exactly one transaction boundary for the whole operation', async () => {
      const app = harness();

      await inTenant(TENANT_A, () => app.createFiscalYear.execute(command()));

      expect(app.boundary.executions).toBe(1);
    });

    it('trims the label, so stored and given names cannot diverge', async () => {
      const app = harness();

      const outcome = await inTenant(TENANT_A, () =>
        app.createFiscalYear.execute(
          command({ label: '  FY2024  ', startDate: '2024-01-01', endDate: '2024-12-31' }),
        ),
      );

      expect(outcome.valueOrThrow().label).toBe('FY2024');
    });

    it('accepts the same range for another tenant — the rule is per company', async () => {
      const app = harness();
      app.repository.seed(aFiscalYear(tenantReferenceFrom(TENANT_A)));

      const outcome = await inTenant(TENANT_B, () => app.createFiscalYear.execute(command()));

      expect(outcome.isOk()).toBe(true);
      expect(outcome.valueOrThrow().tenantId).toBe(TENANT_B);
    });

    it('accepts a year adjacent to the tenant’s existing one', async () => {
      const app = harness();
      app.repository.seed(aFiscalYear(tenantReferenceFrom(TENANT_A), 'FY2024'));

      const outcome = await inTenant(TENANT_A, () =>
        app.createFiscalYear.execute(
          command({ label: 'FY2025', startDate: '2025-01-01', endDate: '2025-12-31' }),
        ),
      );

      expect(outcome.isOk()).toBe(true);
    });
  });

  describe('declines — nothing is written', () => {
    it('reports an overlapping year as FISCAL_YEAR_OVERLAP without persisting', async () => {
      const app = harness();
      app.repository.seed(aFiscalYear(tenantReferenceFrom(TENANT_A), 'FY2024'));

      const outcome = await inTenant(TENANT_A, () =>
        app.createFiscalYear.execute(
          command({ label: 'H2', startDate: '2024-06-01', endDate: '2025-06-30' }),
        ),
      );

      expect(outcome.isFail()).toBe(true);
      expect(outcome.errorOrThrow()?.code).toBe('FISCAL_YEAR_OVERLAP');
      expect(outcome.errorOrThrow()?.category).toBe('CONFLICT');
      expect(app.repository.addCalls).toBe(0);
      expect(app.events.recorded).toHaveLength(0);
    });

    it('reports a duplicate label as FISCAL_YEAR_LABEL_DUPLICATE without persisting', async () => {
      const app = harness();
      app.repository.seed(aFiscalYear(tenantReferenceFrom(TENANT_A), 'FY2024'));

      const outcome = await inTenant(TENANT_A, () =>
        app.createFiscalYear.execute(
          command({ label: 'FY2024', startDate: '2025-01-01', endDate: '2025-12-31' }),
        ),
      );

      expect(outcome.errorOrThrow()?.code).toBe('FISCAL_YEAR_LABEL_DUPLICATE');
      expect(outcome.errorOrThrow()?.category).toBe('CONFLICT');
      expect(app.repository.addCalls).toBe(0);
      expect(app.events.recorded).toHaveLength(0);
    });

    it('reports a reversed or zero-length range as FISCAL_YEAR_INVALID_RANGE', async () => {
      const app = harness();

      const reversed = await inTenant(TENANT_A, () =>
        app.createFiscalYear.execute(
          command({ label: 'Backwards', startDate: '2025-01-01', endDate: '2024-12-31' }),
        ),
      );
      const zeroLength = await inTenant(TENANT_A, () =>
        app.createFiscalYear.execute(
          command({ label: 'One day', startDate: '2024-01-01', endDate: '2024-01-01' }),
        ),
      );

      expect(reversed.errorOrThrow()?.code).toBe('FISCAL_YEAR_INVALID_RANGE');
      expect(zeroLength.errorOrThrow()?.code).toBe('FISCAL_YEAR_INVALID_RANGE');
      expect(app.repository.addCalls).toBe(0);
    });

    it('reports a blank or over-long label as a validation failure', async () => {
      const app = harness();

      const blank = await inTenant(TENANT_A, () =>
        app.createFiscalYear.execute(
          command({ label: '   ', startDate: '2024-01-01', endDate: '2024-12-31' }),
        ),
      );
      const tooLong = await inTenant(TENANT_A, () =>
        app.createFiscalYear.execute(
          command({ label: 'x'.repeat(101), startDate: '2024-01-01', endDate: '2024-12-31' }),
        ),
      );

      for (const outcome of [blank, tooLong]) {
        expect(outcome.errorOrThrow()?.code).toBe('VALIDATION_FAILED');
        expect(outcome.errorOrThrow()?.details[0]?.code).toBe('FISCAL_YEAR_LABEL_INVALID');
      }
      expect(app.repository.addCalls).toBe(0);
    });

    it('reports an unparseable date as a validation failure naming the field', async () => {
      const app = harness();

      const outcome = await inTenant(TENANT_A, () =>
        app.createFiscalYear.execute(
          command({ label: 'FY2024', startDate: '01-01-2024', endDate: '2024-12-31' }),
        ),
      );

      expect(outcome.errorOrThrow()?.code).toBe('VALIDATION_FAILED');
      expect(outcome.errorOrThrow()?.details[0]).toMatchObject({
        code: 'FISCAL_YEAR_DATE_INVALID',
        field: 'startDate',
      });
      expect(app.repository.addCalls).toBe(0);
    });

    it('fails closed when no tenant scope is established', async () => {
      const app = harness();

      await expect(app.createFiscalYear.execute(command())).rejects.toBeInstanceOf(
        TenantContextMissingError,
      );
      expect(app.repository.addCalls).toBe(0);
    });

    it('fails closed under the explicit system scope — a year belongs to a company', async () => {
      const app = harness();

      await expect(
        TenantScope.runAsSystem(() => app.createFiscalYear.execute(command())),
      ).rejects.toBeInstanceOf(TenantContextMissingError);
    });
  });

  describe('the database’s own refusal is mapped back to the domain codes', () => {
    it('maps the overlap trigger’s conflict to FISCAL_YEAR_OVERLAP', async () => {
      const app = harness();
      app.repository.nextAddFailure = databaseRefusedOverlap();

      const outcome = await inTenant(TENANT_A, () => app.createFiscalYear.execute(command()));

      expect(outcome.errorOrThrow()?.code).toBe('FISCAL_YEAR_OVERLAP');
      expect(app.events.recorded).toHaveLength(0);
    });

    it('maps the unique key’s conflict to FISCAL_YEAR_LABEL_DUPLICATE', async () => {
      const app = harness();
      app.repository.nextAddFailure = databaseRefusedDuplicateLabel();

      const outcome = await inTenant(TENANT_A, () => app.createFiscalYear.execute(command()));

      expect(outcome.errorOrThrow()?.code).toBe('FISCAL_YEAR_LABEL_DUPLICATE');
      expect(app.events.recorded).toHaveLength(0);
    });

    it('rethrows a persistence failure the module cannot interpret', async () => {
      const app = harness();
      app.repository.nextAddFailure = new Error('the store is unreachable');

      await expect(
        inTenant(TENANT_A, () => app.createFiscalYear.execute(command())),
      ).rejects.toThrow('the store is unreachable');
    });
  });
});
