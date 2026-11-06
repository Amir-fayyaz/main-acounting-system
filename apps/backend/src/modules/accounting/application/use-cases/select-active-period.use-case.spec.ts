import { describe, expect, it } from 'vitest';

import { createTenantContext } from '../../../../shared/tenant/tenant-context.js';
import { TenantScope } from '../../../../shared/tenant/tenant-scope.js';
import { TenantContextMissingError } from '../../../../shared/tenant/tenant.errors.js';
import { aFiscalYear, PassthroughTransactionBoundary } from '../../../../../test/support/accounting-doubles.js';
import {
  aFiscalPeriod,
  InMemoryActivePeriodRepository,
  InMemoryFiscalPeriodRepository,
} from '../../../../../test/support/fiscal-period-doubles.js';
import { tenantReferenceFrom } from '../../domain/value-objects/tenant-reference.js';
import { generateFiscalYearId } from '../../domain/value-objects/fiscal-year-id.js';
import { SelectActivePeriod } from '../commands/select-active-period.command.js';
import { SelectActivePeriodUseCase } from './select-active-period.use-case.js';

/**
 * The select-active-period use case over in-memory repositories (FIS-004).
 * Concurrency against real MySQL — two simultaneous selections leaving exactly
 * one active period — is proven in `test/fiscal-period-persistence.e2e-spec.ts`.
 */

const TENANT_A = '018f0d3c-6d0f-7a4b-9d4e-2b3c4d5e6f70';
const TENANT_B = '018f0d3d-6d0f-7a4b-9d4e-2b3c4d5e6f71';

interface Harness {
  readonly periods: InMemoryFiscalPeriodRepository;
  readonly activePeriods: InMemoryActivePeriodRepository;
  readonly select: SelectActivePeriodUseCase;
}

function harness(): Harness {
  const periods = new InMemoryFiscalPeriodRepository();
  const activePeriods = new InMemoryActivePeriodRepository();

  return {
    periods,
    activePeriods,
    select: new SelectActivePeriodUseCase(
      periods,
      activePeriods,
      { record: async () => undefined },
      new PassthroughTransactionBoundary(),
      { record: async () => undefined },
    ),
  };
}

/** Runs tenant-scoped work the way the trusted entry point does. */
function inTenant<T>(tenantId: string, work: () => Promise<T>): Promise<T> {
  return TenantScope.run(createTenantContext(tenantId), work);
}

function selectCommand(periodId: string): SelectActivePeriod {
  return new SelectActivePeriod({ periodId });
}

describe('SelectActivePeriodUseCase', () => {
  it('selects an open period of the year and records the fact', async () => {
    const app = harness();
    const year = aFiscalYear(tenantReferenceFrom(TENANT_A), 'FY1405');
    const may = aFiscalPeriod({
      tenantId: tenantReferenceFrom(TENANT_A),
      fiscalYearId: year.id,
      jalaliYear: 1405,
      sequence: 2,
      startDate: '2026-04-20',
      endDate: '2026-05-20',
    });
    app.periods.seed(may);

    const outcome = await inTenant(TENANT_A, () =>
      app.select.execute(selectCommand(may.id.value)),
    );

    expect(outcome.isOk()).toBe(true);
    expect(outcome.valueOrThrow().id).toBe(may.id.value);
    expect(app.activePeriods.pointerOf(TENANT_A)?.value).toBe(may.id.value);
  });

  it('moves the active period to another one — the previous one is no longer active', async () => {
    const app = harness();
    const year = aFiscalYear(tenantReferenceFrom(TENANT_A), 'FY1405');
    const farvardin = aFiscalPeriod({
      tenantId: tenantReferenceFrom(TENANT_A),
      fiscalYearId: year.id,
      jalaliYear: 1405,
      sequence: 1,
      startDate: '2026-03-21',
      endDate: '2026-04-19',
    });
    const esfand = aFiscalPeriod({
      tenantId: tenantReferenceFrom(TENANT_A),
      fiscalYearId: year.id,
      jalaliYear: 1405,
      sequence: 12,
      startDate: '2027-02-19',
      endDate: '2027-03-20',
    });
    app.periods.seed(farvardin);
    app.periods.seed(esfand);

    await inTenant(TENANT_A, () => app.select.execute(selectCommand(farvardin.id.value)));
    expect(app.activePeriods.pointerOf(TENANT_A)?.value).toBe(farvardin.id.value);

    await inTenant(TENANT_A, () => app.select.execute(selectCommand(esfand.id.value)));

    // Exactly one active period per tenant, now the later selection.
    expect(app.activePeriods.pointerOf(TENANT_A)?.value).toBe(esfand.id.value);
  });

  it('refuses to select a closed period with FISCAL_PERIOD_NOT_OPEN', async () => {
    const app = harness();
    const year = aFiscalYear(tenantReferenceFrom(TENANT_A), 'FY1405');
    const closed = aFiscalPeriod({
      tenantId: tenantReferenceFrom(TENANT_A),
      fiscalYearId: year.id,
      jalaliYear: 1405,
      sequence: 1,
      startDate: '2026-03-21',
      endDate: '2026-04-19',
      state: 'closed',
    });
    app.periods.seed(closed);

    const outcome = await inTenant(TENANT_A, () =>
      app.select.execute(selectCommand(closed.id.value)),
    );

    expect(outcome.errorOrThrow()?.code).toBe('FISCAL_PERIOD_NOT_OPEN');
    expect(outcome.errorOrThrow()?.category).toBe('STATE_VIOLATION');
    expect(app.activePeriods.pointerOf(TENANT_A)).toBeUndefined();
  });

  it('reports a missing period as FISCAL_PERIOD_NOT_FOUND, including another company’s', async () => {
    const app = harness();
    const foreignYear = aFiscalYear(tenantReferenceFrom(TENANT_B), 'FY1405');
    const foreign = aFiscalPeriod({
      tenantId: tenantReferenceFrom(TENANT_B),
      fiscalYearId: foreignYear.id,
      jalaliYear: 1405,
      sequence: 1,
      startDate: '2026-03-21',
      endDate: '2026-04-19',
    });
    app.periods.seed(foreign);

    const outcome = await inTenant(TENANT_A, () =>
      app.select.execute(selectCommand(foreign.id.value)),
    );

    expect(outcome.errorOrThrow()?.code).toBe('FISCAL_PERIOD_NOT_FOUND');
    expect(app.activePeriods.pointerOf(TENANT_A)).toBeUndefined();
  });

  it('rejects a malformed period identity as a validation failure', async () => {
    const app = harness();

    const outcome = await inTenant(TENANT_A, () => app.select.execute(selectCommand('not-an-id')));

    expect(outcome.errorOrThrow()?.code).toBe('VALIDATION_FAILED');
  });

  it('fails closed when no tenant scope is established', async () => {
    const app = harness();

    await expect(app.select.execute(selectCommand(generateFiscalYearId().value))).rejects.toBeInstanceOf(
      TenantContextMissingError,
    );
  });
});
