import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { configureApplication } from '../src/bootstrap.js';
import { AppConfigModule } from '../src/infrastructure/config/app-config.module.js';
import { TRANSACTION_BOUNDARY } from '../src/infrastructure/database/database.tokens.js';
import { AUDIT_RECORDER } from '../src/modules/audit/application/audit.tokens.js';
import type {
  AuditRecorder,
  AuditEntry,
} from '../src/modules/audit/application/ports/audit-recorder.port.js';
import {
  FISCAL_PERIOD_REPOSITORY,
  FISCAL_YEAR_EVENT_RECORDER,
  FISCAL_YEAR_REPOSITORY,
} from '../src/modules/accounting/application/accounting.tokens.js';
import { CreateFiscalYearUseCase } from '../src/modules/accounting/application/use-cases/create-fiscal-year.use-case.js';
import { GetFiscalYearUseCase } from '../src/modules/accounting/application/use-cases/get-fiscal-year.use-case.js';
import { ListFiscalYearsUseCase } from '../src/modules/accounting/application/use-cases/list-fiscal-years.use-case.js';
import { ListFiscalPeriodsUseCase } from '../src/modules/accounting/application/use-cases/list-fiscal-periods.use-case.js';
import { SelectActivePeriodUseCase } from '../src/modules/accounting/application/use-cases/select-active-period.use-case.js';
import { ClosePeriodUseCase } from '../src/modules/accounting/application/use-cases/close-period.use-case.js';
import { ReopenPeriodUseCase } from '../src/modules/accounting/application/use-cases/reopen-period.use-case.js';
import { FiscalYearController } from '../src/modules/accounting/presentation/controllers/fiscal-year.controller.js';
import { FiscalPeriodController } from '../src/modules/accounting/presentation/controllers/fiscal-period.controller.js';
import {
  InMemoryFiscalYearRepository,
  InMemoryFiscalPeriodRepository,
  RecordingFiscalYearEvents,
  PassthroughTransactionBoundary,
} from './support/accounting-doubles.js';
import { createTenantContext } from '../src/shared/tenant/tenant-context.js';
import { TenantScope } from '../src/shared/tenant/tenant-scope.js';

class InMemoryAuditRecorder implements AuditRecorder {
  public readonly entries: AuditEntry[] = [];
  public async record(entry: AuditEntry): Promise<void> {
    this.entries.push(entry);
  }
}

describe('Fiscal API (FIS-007 / Issue #111)', () => {
  let app: INestApplication;
  let yearRepo: InMemoryFiscalYearRepository;
  let periodRepo: InMemoryFiscalPeriodRepository;
  let audit: InMemoryAuditRecorder;

  const TENANT_A = '018f0d3c-6d0f-7a4b-9d4e-2b3c4d5e6f01';
  const TENANT_B = '018f0d3c-6d0f-7a4b-9d4e-2b3c4d5e6f02';

  beforeAll(async () => {
    yearRepo = new InMemoryFiscalYearRepository();
    periodRepo = new InMemoryFiscalPeriodRepository();
    audit = new InMemoryAuditRecorder();
    const events = new RecordingFiscalYearEvents();
    const boundary = new PassthroughTransactionBoundary();

    const moduleRef = await Test.createTestingModule({
      imports: [AppConfigModule],
      controllers: [FiscalYearController, FiscalPeriodController],
      providers: [
        { provide: FISCAL_YEAR_REPOSITORY, useValue: yearRepo },
        { provide: FISCAL_PERIOD_REPOSITORY, useValue: periodRepo },
        { provide: FISCAL_YEAR_EVENT_RECORDER, useValue: events },
        { provide: TRANSACTION_BOUNDARY, useValue: boundary },
        { provide: AUDIT_RECORDER, useValue: audit },
        {
          provide: CreateFiscalYearUseCase,
          useFactory: () => new CreateFiscalYearUseCase(yearRepo, events, boundary, periodRepo),
        },
        {
          provide: GetFiscalYearUseCase,
          useFactory: () => new GetFiscalYearUseCase(yearRepo),
        },
        {
          provide: ListFiscalYearsUseCase,
          useFactory: () => new ListFiscalYearsUseCase(yearRepo),
        },
        {
          provide: ListFiscalPeriodsUseCase,
          useFactory: () => new ListFiscalPeriodsUseCase(periodRepo),
        },
        {
          provide: SelectActivePeriodUseCase,
          useFactory: () => new SelectActivePeriodUseCase(periodRepo),
        },
        {
          provide: ClosePeriodUseCase,
          useFactory: () => new ClosePeriodUseCase(periodRepo),
        },
        {
          provide: ReopenPeriodUseCase,
          useFactory: () => new ReopenPeriodUseCase(periodRepo),
        },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    configureApplication(app);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('runs the full golden flow: create year -> list periods -> select active -> close -> reopen with reason', async () => {
    let yearId = '';
    let periods: any[] = [];

    // 1. Create fiscal year under Tenant A scope
    await TenantScope.run(createTenantContext(TENANT_A), async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/fiscal-years')
        .send({ label: '1403', startDate: '2024-03-20', endDate: '2025-03-20' })
        .expect(201);

      expect(res.body.label).toBe('1403');
      expect(res.body.status).toBe('open');
      yearId = res.body.id;
    });

    expect(yearId).toBeTruthy();
    expect(
      audit.entries.some((e) => e.action === 'fiscal_year.create' && e.outcome === 'success'),
    ).toBe(true);

    // 2. List periods of the year (expect 12 Jalali monthly periods)
    await TenantScope.run(createTenantContext(TENANT_A), async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/fiscal-years/' + yearId + '/periods')
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(12);
      periods = res.body;

      expect(periods[0].sequenceNumber).toBe(1);
      expect(periods[0].isActive).toBe(true);
      expect(periods[1].isActive).toBe(false);
    });

    const period2 = periods[1];

    // 3. Select active period (select period 2)
    await TenantScope.run(createTenantContext(TENANT_A), async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/fiscal-periods/' + period2.id + '/select-active')
        .expect(200);

      expect(res.body.id).toBe(period2.id);
      expect(res.body.isActive).toBe(true);
    });

    expect(
      audit.entries.some(
        (e) => e.action === 'fiscal_period.select_active' && e.outcome === 'success',
      ),
    ).toBe(true);

    // 4. Close a period (close period 2)
    await TenantScope.run(createTenantContext(TENANT_A), async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/fiscal-periods/' + period2.id + '/close')
        .expect(200);

      expect(res.body.id).toBe(period2.id);
      expect(res.body.status).toBe('closed');
    });

    expect(
      audit.entries.some((e) => e.action === 'fiscal_period.close' && e.outcome === 'success'),
    ).toBe(true);

    // 5. Selecting a closed period as active is rejected (409)
    await TenantScope.run(createTenantContext(TENANT_A), async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/fiscal-periods/' + period2.id + '/select-active')
        .expect(409);

      expect(res.body.error.code).toBe('CLOSED_PERIOD_CANNOT_BE_ACTIVE');
    });

    // 6. Reopen without reason is rejected (400)
    await TenantScope.run(createTenantContext(TENANT_A), async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/fiscal-periods/' + period2.id + '/reopen')
        .send({ reason: '   ' })
        .expect(400);

      expect(res.body.error.code).toBe('REOPEN_REASON_REQUIRED');
    });

    // 7. Reopen with reason succeeds (200)
    await TenantScope.run(createTenantContext(TENANT_A), async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/fiscal-periods/' + period2.id + '/reopen')
        .send({ reason: 'Adjustment entries required' })
        .expect(200);

      expect(res.body.id).toBe(period2.id);
      expect(res.body.status).toBe('open');
      expect(res.body.reopenReason).toBe('Adjustment entries required');
    });

    expect(
      audit.entries.some((e) => e.action === 'fiscal_period.reopen' && e.outcome === 'success'),
    ).toBe(true);
  });

  it('rejects tenant id in request body (forbidNonWhitelisted)', async () => {
    await TenantScope.run(createTenantContext(TENANT_A), async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/fiscal-years')
        .send({
          label: '1404',
          startDate: '2025-03-21',
          endDate: '2026-03-20',
          tenantId: 'spoofed-tenant-id',
        })
        .expect(400);

      expect(res.body.error.code).toBe('VALIDATION_FAILED');
    });
  });

  it('rejects overlapping fiscal year ranges (409)', async () => {
    await TenantScope.run(createTenantContext(TENANT_A), async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/fiscal-years')
        .send({ label: '1403-Overlap', startDate: '2024-05-01', endDate: '2024-08-01' })
        .expect(409);

      expect(res.body.error.code).toBe('FISCAL_YEAR_OVERLAP');
    });
  });

  it('enforces tenant isolation (Tenant B cannot read Tenant A years)', async () => {
    await TenantScope.run(createTenantContext(TENANT_B), async () => {
      const res = await request(app.getHttpServer()).get('/api/v1/fiscal-years').expect(200);

      expect(res.body).toEqual([]);
    });
  });
});
