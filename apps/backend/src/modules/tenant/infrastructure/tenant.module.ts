import { Module } from '@nestjs/common';

import { DatabaseModule, type Database } from '../../../infrastructure/database/database.module.js';
import {
  DATABASE,
  TRANSACTION_BOUNDARY,
} from '../../../infrastructure/database/database.tokens.js';
import { OutboxModule } from '../../../infrastructure/outbox/outbox.module.js';
import { OUTBOX_RECORDER } from '../../../infrastructure/outbox/outbox.tokens.js';
import type { TransactionBoundary } from '../../../shared/transaction/transaction-boundary.js';
import { ChangeTenantStatusUseCase } from '../application/use-cases/change-tenant-status.use-case.js';
import { TENANT_EVENT_RECORDER, TENANT_REPOSITORY } from '../application/tenant.tokens.js';
import { CreateTenantUseCase } from '../application/use-cases/create-tenant.use-case.js';
import { GetTenantUseCase } from '../application/use-cases/get-tenant.use-case.js';
import { UpdateTenantUseCase } from '../application/use-cases/update-tenant.use-case.js';
import type { TenantEventRecorder } from '../application/ports/tenant-event-recorder.port.js';
import type { TenantRepository } from '../domain/repositories/tenant.repository.js';
import { TenantController } from '../presentation/controllers/tenant.controller.js';
import { DrizzleTenantRepository } from './persistence/drizzle-tenant.repository.js';

/**
 * The tenant module (IAM-001).
 *
 * It wires the module's own ports to their adapters and its use cases to the
 * shared infrastructure they need:
 *
 * - `TENANT_REPOSITORY` → `DrizzleTenantRepository` (this module's table);
 * - `TENANT_EVENT_RECORDER` → the shared outbox recorder, so tenant events
 *   commit with the state change that raised them (SHR-006);
 * - `TRANSACTION_BOUNDARY` → the shared boundary the use cases open (SHR-005).
 *
 * The adapters stay behind their tokens, so the controller and use cases never
 * reach past a port — and the module owns its persistence, exposing the
 * Drizzle table and adapter to no one else (ADR-002 sections 8 and 12).
 */
@Module({
  imports: [DatabaseModule, OutboxModule],
  controllers: [TenantController],
  providers: [
    {
      provide: TENANT_REPOSITORY,
      useFactory: (database: Database): TenantRepository => new DrizzleTenantRepository(database),
      inject: [DATABASE],
    },
    {
      // The outbox recorder already satisfies the application port structurally.
      provide: TENANT_EVENT_RECORDER,
      useExisting: OUTBOX_RECORDER,
    },
    {
      provide: CreateTenantUseCase,
      useFactory: (
        repository: TenantRepository,
        events: TenantEventRecorder,
        boundary: TransactionBoundary,
      ) => new CreateTenantUseCase(repository, events, boundary),
      inject: [TENANT_REPOSITORY, TENANT_EVENT_RECORDER, TRANSACTION_BOUNDARY],
    },
    {
      provide: GetTenantUseCase,
      useFactory: (repository: TenantRepository) => new GetTenantUseCase(repository),
      inject: [TENANT_REPOSITORY],
    },
    {
      provide: UpdateTenantUseCase,
      useFactory: (
        repository: TenantRepository,
        events: TenantEventRecorder,
        boundary: TransactionBoundary,
      ) => new UpdateTenantUseCase(repository, events, boundary),
      inject: [TENANT_REPOSITORY, TENANT_EVENT_RECORDER, TRANSACTION_BOUNDARY],
    },
    {
      provide: ChangeTenantStatusUseCase,
      useFactory: (
        repository: TenantRepository,
        events: TenantEventRecorder,
        boundary: TransactionBoundary,
      ) => new ChangeTenantStatusUseCase(repository, events, boundary),
      inject: [TENANT_REPOSITORY, TENANT_EVENT_RECORDER, TRANSACTION_BOUNDARY],
    },
  ],
})
export class TenantModule {}
