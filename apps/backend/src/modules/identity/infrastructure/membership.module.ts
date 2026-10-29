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
import {
  ACTIVE_COMPANY_SELECTION,
  TENANT_DIRECTORY,
  TENANT_OWNER_ENROLLMENT,
  type ActiveCompanySelectionPort,
  type TenantDirectory,
  type TenantOwnerEnrollment,
} from '../../tenant/public-api.js';
import { ChangeMembershipStatusUseCase } from '../application/use-cases/change-membership-status.use-case.js';
import { CreateMembershipUseCase } from '../application/use-cases/create-membership.use-case.js';
import { GetMembershipUseCase } from '../application/use-cases/get-membership.use-case.js';
import { ListTenantMembersUseCase } from '../application/use-cases/list-tenant-members.use-case.js';
import { ListUserMembershipsUseCase } from '../application/use-cases/list-user-memberships.use-case.js';
import { SelectActiveCompanyUseCase } from '../application/use-cases/select-active-company.use-case.js';
import {
  ACTIVE_COMPANY_PREFERENCE,
  MEMBERSHIP_EVENT_RECORDER,
  MEMBERSHIP_REPOSITORY,
  TENANT_MEMBERSHIP,
} from '../application/membership.tokens.js';
import type { ActiveCompanyPreference } from '../application/ports/active-company-preference.port.js';
import type { MembershipEventRecorder } from '../application/ports/membership-event-recorder.port.js';
import type { TenantMembership } from '../application/ports/tenant-membership.port.js';
import { USER_REPOSITORY } from '../application/user.tokens.js';
import type { MembershipRepository } from '../domain/repositories/membership.repository.js';
import type { UserRepository } from '../domain/repositories/user.repository.js';
import { MembershipsController } from '../presentation/controllers/membership.controller.js';
import { ActorEventRecorder } from './audit/audit-trail-access-control-event-recorder.js';
import { DrizzleActiveCompanyPreferenceRepository } from './persistence/drizzle-active-company-preference.repository.js';
import { DrizzleMembershipRepository } from './persistence/drizzle-membership.repository.js';
import { MembershipTenantMembershipAdapter } from './authorization/membership-tenant-membership.adapter.js';
import { MembershipActiveCompanySelection } from './membership/membership-active-company-selection.adapter.js';
import { MembershipTenantOwnerEnrollment } from './membership/membership-tenant-owner-enrollment.adapter.js';
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
 *
 * The module is `@Global` for one reason: company creation (IAM-009) needs
 * Identity-owned membership provisioning and company selection, and a module
 * inside `src/modules/` may not import another module's `infrastructure/` to
 * reach them. Only the three published contracts are exported — the owner
 * enrollment port implementation, the narrow membership lookup and the
 * active-company selection port — so nothing else becomes visible.
 */
@Global()
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
    {
      // The user's active company is Identity-owned user preference data: it
      // spans tenants, so it lives beside the identity, not beside a company.
      provide: ACTIVE_COMPANY_PREFERENCE,
      useFactory: (database: Database): ActiveCompanyPreference =>
        new DrizzleActiveCompanyPreferenceRepository(database),
      inject: [DATABASE],
    },
    {
      // Company creation (IAM-009) provisions its creator through the ordinary
      // membership use case. Exposed as the tenant module's own port, so tenant
      // never learns how a membership is stored.
      provide: TENANT_OWNER_ENROLLMENT,
      useFactory: (createMembership: CreateMembershipUseCase): TenantOwnerEnrollment =>
        new MembershipTenantOwnerEnrollment(createMembership),
      inject: [CreateMembershipUseCase],
    },
    {
      // Selecting a company records a durable preference; it reads the same
      // membership evidence the authorization boundary uses, so the two can
      // never disagree about whether the user belongs to the target company.
      provide: SelectActiveCompanyUseCase,
      useFactory: (
        memberships: TenantMembership,
        preferences: ActiveCompanyPreference,
        audit: AuditRecorder,
        boundary: TransactionBoundary,
      ) => new SelectActiveCompanyUseCase(memberships, preferences, audit, boundary),
      inject: [
        TENANT_MEMBERSHIP,
        ACTIVE_COMPANY_PREFERENCE,
        AUDIT_RECORDER,
        TRANSACTION_BOUNDARY,
      ],
    },
    {
      // The tenant module's contract (IAM-009) over the use case above. Published
      // so the tenant REST resource can offer selection without importing
      // Identity's application layer.
      provide: ACTIVE_COMPANY_SELECTION,
      useFactory: (selectActiveCompany: SelectActiveCompanyUseCase): ActiveCompanySelectionPort =>
        new MembershipActiveCompanySelection(selectActiveCompany),
      inject: [SelectActiveCompanyUseCase],
    },
  ],
  // Exported to this module's own role feature (IAM-004), which must confirm a
  // membership exists and belongs to the tenant before assigning a role — and
  // to the tenant module's company creation/selection contracts (IAM-009).
  //
  // The two provisioning/read use cases are exported for the development
  // seeder (DEV-001), which composes them from outside the module instead of
  // writing membership rows of its own: a fixture keeps every validation,
  // audit and event guarantee an ordinary caller gets.
  exports: [
    MEMBERSHIP_REPOSITORY,
    TENANT_MEMBERSHIP,
    TENANT_OWNER_ENROLLMENT,
    ACTIVE_COMPANY_SELECTION,
    CreateMembershipUseCase,
    ListUserMembershipsUseCase,
  ],
})
export class MembershipModule {}
