import { Inject, Injectable, Module, type Type } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import { describe, expect, it } from 'vitest';

import { DatabaseModule } from '../src/infrastructure/database/database.module.js';
import {
  DATABASE,
  TRANSACTION_BOUNDARY,
} from '../src/infrastructure/database/database.tokens.js';
import { OutboxModule } from '../src/infrastructure/outbox/outbox.module.js';
import { OUTBOX_RECORDER } from '../src/infrastructure/outbox/outbox.tokens.js';
import { TENANT_REPOSITORY } from '../src/modules/tenant/application/tenant.tokens.js';
import {
  TENANT_CONTEXT,
  TENANT_DIRECTORY,
  TenantModule,
  type TenantContextAccessor,
  type TenantDirectory,
} from '../src/modules/tenant/public-api.js';
import { createTenantContext } from '../src/shared/tenant/tenant-context.js';
import { TenantScope } from '../src/shared/tenant/tenant-scope.js';
import { TenantContextMissingError } from '../src/shared/tenant/tenant.errors.js';
import {
  InMemoryTenantRepository,
  PassthroughTransactionBoundary,
  RecordingTenantEvents,
} from './support/tenant-doubles.js';

/**
 * The tenant module wiring (TNT-004).
 *
 * The module is loaded in isolation: the database and the outbox are replaced
 * by fake modules, so no MySQL or Redis is needed. The sample consumer below
 * imports only the public API (`public-api.ts`), exactly like a real consumer
 * module must — and a consumer asking for a Tenant internal cannot get it.
 */

const TENANT_ID = '3f1b2c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d';
const UNKNOWN_TENANT_ID = '018f0d3c-6d0f-7a4b-9d4e-2b3c4d5e6f70';

@Module({
  providers: [
    { provide: DATABASE, useValue: {} },
    { provide: TRANSACTION_BOUNDARY, useValue: new PassthroughTransactionBoundary() },
  ],
  exports: [DATABASE, TRANSACTION_BOUNDARY],
})
class FakeDatabaseModule {}

@Module({
  providers: [{ provide: OUTBOX_RECORDER, useValue: new RecordingTenantEvents() }],
  exports: [OUTBOX_RECORDER],
})
class FakeOutboxModule {}

@Injectable()
class SampleConsumer {
  public constructor(
    @Inject(TENANT_CONTEXT) public readonly tenant: TenantContextAccessor,
    @Inject(TENANT_DIRECTORY) public readonly directory: TenantDirectory,
  ) {}
}

@Module({ imports: [TenantModule], providers: [SampleConsumer] })
class SampleConsumerModule {}

@Injectable()
class LeakyConsumer {
  public constructor(@Inject(TENANT_REPOSITORY) public readonly repository: unknown) {}
}

@Module({ imports: [TenantModule], providers: [LeakyConsumer] })
class LeakyConsumerModule {}

function compile(consumer: Type<unknown>): Promise<TestingModule> {
  return Test.createTestingModule({ imports: [consumer] })
    .overrideModule(DatabaseModule)
    .useModule(FakeDatabaseModule)
    .overrideModule(OutboxModule)
    .useModule(FakeOutboxModule)
    .overrideProvider(TENANT_REPOSITORY)
    .useValue(new InMemoryTenantRepository())
    .compile();
}

describe('tenant module wiring (e2e)', () => {
  it('loads in isolation and resolves TenantContext through the public API', async () => {
    const moduleRef = await compile(SampleConsumerModule);
    const consumer = moduleRef.get(SampleConsumer);

    await TenantScope.run(createTenantContext(TENANT_ID), async () => {
      expect(consumer.tenant.requireTenantId()).toBe(TENANT_ID);
      expect(consumer.tenant.current().state).toBe('available');
    });

    await moduleRef.close();
  });

  it('fails closed when the consumer asks for the tenant outside any scope', async () => {
    const moduleRef = await compile(SampleConsumerModule);
    const { tenant } = moduleRef.get(SampleConsumer);

    expect(tenant.current().state).toBe('missing');
    expect(() => tenant.require()).toThrow(TenantContextMissingError);

    await moduleRef.close();
  });

  it('resolves the published TenantDirectory contract', async () => {
    const moduleRef = await compile(SampleConsumerModule);
    const { directory } = moduleRef.get(SampleConsumer);

    await expect(directory.exists(UNKNOWN_TENANT_ID)).resolves.toBe(false);
    await expect(directory.exists('not-a-uuid')).resolves.toBe(false);

    await moduleRef.close();
  });

  it('keeps Tenant internals private: a consumer cannot inject the repository', async () => {
    await expect(compile(LeakyConsumerModule)).rejects.toThrow();
  });
});