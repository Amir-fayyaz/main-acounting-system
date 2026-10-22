import { Module } from '@nestjs/common';

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
import { TENANT_DIRECTORY, type TenantDirectory } from '../../tenant/public-api.js';
import { ChangeMembershipStatusUseCase } from '../application/use-cases/change-membership-status.use-case.js';
import { CreateMembershipUseCase } from '../application/use-cases/create-membership.use-case.js';
import { GetMembershipUseCase } from '../application/use-cases/get-membership.use-case.js';
import { ListTenantMembersUseCase } from '../application/use-cases/list-tenant-members.use-case.js';
import { ListUserMembershipsUseCase } from '../application/use-cases/list-user-memberships.use-case.js';
import {
  MEMBERSHIP_EVENT_RECORDER,
  MEMBERSHIP_REPOSITORY,
  TENANT_MEMBERSHIP,
} from '../application/membership.tokens.js';
import type { MembershipEventRecorder } from '../application/ports/membership-event-recorder.port.js';
import type { TenantMembership } from '../application/ports/tenant-membership.port.js';
import { USER_REPOSITORY } from '../application/user.tokens.js';
import type { MembershipRepository } from '../domain/repositories/membership.repository.js';
import type { UserRepository } from '../domain/repositories/user.repository.js';
import { MembershipsController } from '../presentation/controllers/membership.controller.js';
import { ActorEventRecorder } from './audit/audit-trail-access-control-event-recorder.js';
import { DrizzleMembershipRepository } from './persistence/drizzle-membership.repository.js';
import { MembershipTenantMembershipAdapter } from './authorization/membership-tenant-membership.adapter.js';
import { UserModule } from './user.module.js';

/**
 * The Identity module's Membership feature (IAM-003).
 *
 * It wires the feature's own ports to their adapters and its use cases to the
 * things they depend on:
 *
 * - `MEMBERSHIP_REPOSITORY` → `DrizzleMembershipRepository` (this module's table);
 * - `MEMBERSHIP_EVENT_RECORDER` → the shared outbox recorder, so membership
 *   events commit with the state change that raised them (SHR-006);
 * - `USER_REPOSITORY` → the user feature's adapter (same module), so a membership
 *   can confirm the user it links exists without a second user table;
 * - `TENANT_DIRECTORY` → the tenant module's **published contract** (IAM-001),
 *   so a membership can confirm the tenant exists without this module ever
 *   reaching into tenant storage — it is available application-wide because the
 *   tenant module publishes it globally, which is how a module inside
 *   `src/modules/` can consume another module's contract at all
 *   (`src/modules/module-boundaries.spec.ts`);
 * - `TRANSACTION_BOUNDARY` → the shared boundary the use cases open (SHR-005).
 *
 * No adapter is exposed: the Drizzle table and repository stay private, and the
 * only cross-module dependency is a published contract, never an internal.
 */
@Module({
  imports: [DatabaseModule, OutboxModule, UserModule],
  controllers: [MembershipsController],
  providers: [
    {
      provide: MEMBERSHIP_REPOSITORY,
      useFactory: (database: Database): MembershipRepository =>
        new DrizzleMembershipRepository(database),
      inject: [DATABASE],
    },
    {
      provide: TENANT_MEMBERSHIP,
      useFactory: (repository: MembershipRepository): TenantMembership =>
        new MembershipTenantMembershipAdapter(repository),
      inject: [MEMBERSHIP_REPOSITORY],
    },
    {
      // Membership facts reach two homes: the outbox, so the rest of the system
      // learns them (SHR-006), and — for the sensitive access-control changes —
      // the central audit trail through the published contract (AUD-001).
      provide: MEMBERSHIP_EVENT_RECORDER,
      useFactory: (outbox: MembershipEventRecorder, audit: AuditRecorder) =>
        new ActorEventRecorder(outbox, audit),
      inject: [OUTBOX_RECORDER, AUDIT_RECORDER],
    },
    {
      provide: CreateMembershipUseCase,
      useFactory: (
        repository: MembershipRepository,
        users: UserRepository,
        tenants: TenantDirectory,
        events: MembershipEventRecorder,
        boundary: TransactionBoundary,
      ) => new CreateMembershipUseCase(repository, users, tenants, events, boundary),
      inject: [
        MEMBERSHIP_REPOSITORY,
        USER_REPOSITORY,
        TENANT_DIRECTORY,
        MEMBERSHIP_EVENT_RECORDER,
        TRANSACTION_BOUNDARY,
      ],
    },
    {
      provide: GetMembershipUseCase,
      useFactory: (repository: MembershipRepository) => new GetMembershipUseCase(repository),
      inject: [MEMBERSHIP_REPOSITORY],
    },
    {
      provide: ListUserMembershipsUseCase,
      useFactory: (repository: MembershipRepository, users: UserRepository) =>
        new ListUserMembershipsUseCase(repository, users),
      inject: [MEMBERSHIP_REPOSITORY, USER_REPOSITORY],
    },
    {
      provide: ListTenantMembersUseCase,
      useFactory: (repository: MembershipRepository, users: UserRepository) =>
        new ListTenantMembersUseCase(repository, users),
      inject: [MEMBERSHIP_REPOSITORY, USER_REPOSITORY],
    },
    {
      provide: ChangeMembershipStatusUseCase,
      useFactory: (
        repository: MembershipRepository,
        events: MembershipEventRecorder,
        boundary: TransactionBoundary,
      ) => new ChangeMembershipStatusUseCase(repository, events, boundary),
      inject: [MEMBERSHIP_REPOSITORY, MEMBERSHIP_EVENT_RECORDER, TRANSACTION_BOUNDARY],
    },
  ],
  // Exported to this module's own role feature (IAM-004), which must confirm a
  // membership exists and belongs to the tenant before assigning a role. It is
  // not an invitation to other modules: the boundary guard still forbids them
  // from importing this file.
  exports: [MEMBERSHIP_REPOSITORY, TENANT_MEMBERSHIP],
})
export class MembershipModule {}
