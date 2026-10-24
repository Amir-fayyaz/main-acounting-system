import { Global, Module } from '@nestjs/common';

import { DatabaseModule, type Database } from '../../../infrastructure/database/database.module.js';
import {
  DATABASE,
  TRANSACTION_BOUNDARY,
} from '../../../infrastructure/database/database.tokens.js';
import type { TransactionBoundary } from '../../../shared/transaction/transaction-boundary.js';
import { ChangeTenantStatusUseCase } from '../application/use-cases/change-tenant-status.use-case.js';
import {
  TENANT_CONTEXT,
  TENANT_DIRECTORY,
  TENANT_EVENT_RECORDER,
  TENANT_OWNER_ENROLLMENT,
  TENANT_REPOSITORY,
} from '../application/tenant.tokens.js';
import type { TenantDirectory } from '../application/ports/tenant-directory.port.js';
import type { TenantOwnerEnrollment } from '../application/ports/tenant-owner-enrollment.port.js';
import { CreateTenantUseCase } from '../application/use-cases/create-tenant.use-case.js';
import { GetTenantUseCase } from '../application/use-cases/get-tenant.use-case.js';
import { UpdateTenantUseCase } from '../application/use-cases/update-tenant.use-case.js';
import type { TenantEventRecorder } from '../application/ports/tenant-event-recorder.port.js';
import type { TenantRepository } from '../domain/repositories/tenant.repository.js';
import { isTenantId, tenantIdFrom } from '../domain/value-objects/tenant-id.js';
import { TenantController } from '../presentation/controllers/tenant.controller.js';
import { DrizzleTenantRepository } from './persistence/drizzle-tenant.repository.js';
import type { TenantContextAccessor } from '../application/ports/tenant-context.port.js';
import { ScopedTenantContext } from './scoped-tenant-context.js';


/**
 * The tenant module (IAM-001).
 *
 * It wires the module's own ports to their adapters and its use cases to the
 * shared infrastructure they need:
 *
 * - `TENANT_REPOSITORY` → `DrizzleTenantRepository` (this module's table);
 * - `TENANT_EVENT_RECORDER` → the recorder the audit module publishes, so tenant
 *   events reach the outbox and the central audit trail and commit with the
 *   state change that raised them (SHR-006; AUD-001). Tenant states what it
 *   needs and never imports the audit module (ADR-002 section 12);
 * - `TRANSACTION_BOUNDARY` → the shared boundary the use cases open (SHR-005).
 *
 * The adapters stay behind their tokens, so the controller and use cases never
 * reach past a port — and the module owns its persistence, exposing the
 * Drizzle table and adapter to no one else (ADR-002 sections 8 and 12).
 *
 * The module is `@Global` for one reason only: it publishes the
 * `TENANT_DIRECTORY` and `TENANT_CONTEXT` contracts, which other modules may
 * depend on. A consumer inside `src/modules/` may not import another module's
 * `infrastructure/` — including this module file — so the published contracts
 * are made available application-wide instead; nothing else becomes visible,
 * because only those two are exported.
 */
@Global()
@Module({
  imports: [DatabaseModule],
  controllers: [TenantController],
  providers: [
    {
      provide: TENANT_REPOSITORY,
      useFactory: (database: Database): TenantRepository => new DrizzleTenantRepository(database),
      inject: [DATABASE],
    },
    {
      // The published tenant contract (IAM-003): existence over the stable
      // tenant identity, answered through the module's own port so no caller
      // ever touches tenant storage. A malformed id is not a tenant.
      //
      // Existence is the one question about a tenant that is *not*
      // tenant-scoped: it says whether the identity is taken and nothing about
      // the company itself. The registry read it needs is therefore the
      // repository's explicit `exists`, never the tenant-scoped `get` — so a
      // caller can never reach a tenant's record through this contract
      // (IAM-007, section 6).
      provide: TENANT_DIRECTORY,
      useFactory: (repository: TenantRepository): TenantDirectory => ({
        async exists(tenantId: string): Promise<boolean> {
          return isTenantId(tenantId) && (await repository.exists(tenantIdFrom(tenantId)));
        },
      }),
      inject: [TENANT_REPOSITORY],
    },
    {
      // The published ambient-tenant contract: reads the scope a trusted
      // boundary established and fails closed without one (SHR-007).
      provide: TENANT_CONTEXT,
      useFactory: (): TenantContextAccessor => new ScopedTenantContext(),
    },
    {
      provide: CreateTenantUseCase,
      useFactory: (
        repository: TenantRepository,
        owners: TenantOwnerEnrollment,
        events: TenantEventRecorder,
        boundary: TransactionBoundary,
      ) => new CreateTenantUseCase(repository, owners, events, boundary),
      inject: [TENANT_REPOSITORY, TENANT_OWNER_ENROLLMENT, TENANT_EVENT_RECORDER, TRANSACTION_BOUNDARY],
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
  // Only the published cross-module contracts are visible; the repository,
  // the event recorder and the use cases stay private to the module.
  exports: [TENANT_DIRECTORY, TENANT_CONTEXT],
})
export class TenantModule {}
