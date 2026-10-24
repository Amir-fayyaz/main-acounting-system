import { Global, Module } from '@nestjs/common';

import { DatabaseModule, type Database } from '../../../infrastructure/database/database.module.js';
import {
  DATABASE,
  TRANSACTION_BOUNDARY,
} from '../../../infrastructure/database/database.tokens.js';
import { OutboxModule } from '../../../infrastructure/outbox/outbox.module.js';
import { OUTBOX_RECORDER } from '../../../infrastructure/outbox/outbox.tokens.js';
import type { TransactionBoundary } from '../../../shared/transaction/transaction-boundary.js';
import { AUDIT_RECORDER } from '../../audit/application/audit.tokens.js';
import type { AuditRecorder } from '../../audit/application/ports/audit-recorder.port.js';
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
import { TenantAuditEventRecorder } from './audit/tenant-audit-event-recorder.js';
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
 * - `TENANT_EVENT_RECORDER` → the shared outbox recorder, so tenant events
 *   commit with the state change that raised them (SHR-006);
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
  imports: [DatabaseModule, OutboxModule],
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
      // Tenant facts reach two homes: the outbox, so the rest of the system
      // learns them (SHR-006), and the central audit trail, because creating a
      // company, renaming it and moving its lifecycle are security-relevant
      // administrative changes (AUD-001; IAM-009).
      provide: TENANT_EVENT_RECORDER,
      useFactory: (outbox: TenantEventRecorder, audit: AuditRecorder) =>
        new TenantAuditEventRecorder(outbox, audit),
      inject: [OUTBOX_RECORDER, AUDIT_RECORDER],
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
