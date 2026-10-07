import { Module } from '@nestjs/common';

import { DatabaseModule, type Database } from '../../../infrastructure/database/database.module.js';
import {
  DATABASE,
  TRANSACTION_BOUNDARY,
} from '../../../infrastructure/database/database.tokens.js';
import { OutboxModule } from '../../../infrastructure/outbox/outbox.module.js';
import { OUTBOX_RECORDER } from '../../../infrastructure/outbox/outbox.tokens.js';
import type { TransactionBoundary } from '../../../shared/transaction/transaction-boundary.js';
import { TENANT_DIRECTORY } from '../../tenant/application/tenant.tokens.js';
import type { TenantDirectory } from '../../tenant/application/ports/tenant-directory.port.js';
import { MEMBERSHIP_REPOSITORY } from '../application/membership.tokens.js';
import { AssignRoleToMembershipUseCase } from '../application/use-cases/assign-role-to-membership.use-case.js';
import { ChangeRoleStatusUseCase } from '../application/use-cases/change-role-status.use-case.js';
import { CreateRoleUseCase } from '../application/use-cases/create-role.use-case.js';
import { GetRoleUseCase } from '../application/use-cases/get-role.use-case.js';
import { GrantRolePermissionUseCase } from '../application/use-cases/grant-role-permission.use-case.js';
import { ListMembershipRolesUseCase } from '../application/use-cases/list-membership-roles.use-case.js';
import { ListPermissionsUseCase } from '../application/use-cases/list-permissions.use-case.js';
import { ListRolesUseCase } from '../application/use-cases/list-roles.use-case.js';
import { RemoveRoleFromMembershipUseCase } from '../application/use-cases/remove-role-from-membership.use-case.js';
import { ResolveEffectivePermissionsUseCase } from '../application/use-cases/resolve-effective-permissions.use-case.js';
import { RevokeRolePermissionUseCase } from '../application/use-cases/revoke-role-permission.use-case.js';
import { UpdateRoleUseCase } from '../application/use-cases/update-role.use-case.js';
import {
  MEMBERSHIP_ROLE_REPOSITORY,
  ROLE_EVENT_RECORDER,
  ROLE_REPOSITORY,
} from '../application/role.tokens.js';
import type { RoleEventRecorder } from '../application/ports/role-event-recorder.port.js';
import type { MembershipRepository } from '../domain/repositories/membership.repository.js';
import type { MembershipRoleRepository } from '../domain/repositories/membership-role.repository.js';
import type { RoleRepository } from '../domain/repositories/role.repository.js';
import { MembershipRolesController } from '../presentation/controllers/membership-role.controller.js';
import { PermissionsController } from '../presentation/controllers/permission.controller.js';
import { RolesController } from '../presentation/controllers/role.controller.js';
import { DrizzleMembershipRoleRepository } from './persistence/drizzle-membership-role.repository.js';
import { DrizzleRoleRepository } from './persistence/drizzle-role.repository.js';
import { MembershipModule } from './membership.module.js';

/**
 * The Identity module's Role and Permission feature (IAM-004).
 *
 * It wires the feature's own ports to their adapters and its use cases to the
 * things they depend on:
 *
 * - `ROLE_REPOSITORY` → `DrizzleRoleRepository` (the role table and its
 *   capability set);
 * - `MEMBERSHIP_ROLE_REPOSITORY` → `DrizzleMembershipRoleRepository` (the
 *   assignment table);
 * - `ROLE_EVENT_RECORDER` → the shared outbox recorder, so role and assignment
 *   events commit with the state change that raised them (SHR-006);
 * - `MEMBERSHIP_REPOSITORY` → the membership feature's adapter (same module), so
 *   an assignment can confirm the membership exists and belongs to the tenant;
 * - `TENANT_DIRECTORY` → the tenant module's **published contract**, so a role
 *   can confirm its tenant exists without this module reaching into tenant
 *   storage;
 * - `TRANSACTION_BOUNDARY` → the shared boundary the use cases open (SHR-005).
 *
 * The permission catalog is code-defined domain data, not a table, so it needs
 * no repository here. No adapter is exposed: the Drizzle tables and repositories
 * stay private, and the only cross-module dependency is a published contract.
 */
@Module({
  imports: [DatabaseModule, OutboxModule, MembershipModule],
  controllers: [RolesController, PermissionsController, MembershipRolesController],
  providers: [
    {
      provide: ROLE_REPOSITORY,
      useFactory: (database: Database): RoleRepository => new DrizzleRoleRepository(database),
      inject: [DATABASE],
    },
    {
      provide: MEMBERSHIP_ROLE_REPOSITORY,
      useFactory: (database: Database): MembershipRoleRepository =>
        new DrizzleMembershipRoleRepository(database),
      inject: [DATABASE],
    },
    {
      // The outbox recorder already satisfies the application port structurally.
      provide: ROLE_EVENT_RECORDER,
      useExisting: OUTBOX_RECORDER,
    },
    {
      provide: CreateRoleUseCase,
      useFactory: (
        roles: RoleRepository,
        tenants: TenantDirectory,
        events: RoleEventRecorder,
        boundary: TransactionBoundary,
      ) => new CreateRoleUseCase(roles, tenants, events, boundary),
      inject: [ROLE_REPOSITORY, TENANT_DIRECTORY, ROLE_EVENT_RECORDER, TRANSACTION_BOUNDARY],
    },
    {
      provide: GetRoleUseCase,
      useFactory: (roles: RoleRepository) => new GetRoleUseCase(roles),
      inject: [ROLE_REPOSITORY],
    },
    {
      provide: ListRolesUseCase,
      useFactory: (roles: RoleRepository) => new ListRolesUseCase(roles),
      inject: [ROLE_REPOSITORY],
    },
    ListPermissionsUseCase,
    {
      provide: UpdateRoleUseCase,
      useFactory: (
        roles: RoleRepository,
        events: RoleEventRecorder,
        boundary: TransactionBoundary,
      ) => new UpdateRoleUseCase(roles, events, boundary),
      inject: [ROLE_REPOSITORY, ROLE_EVENT_RECORDER, TRANSACTION_BOUNDARY],
    },
    {
      provide: ChangeRoleStatusUseCase,
      useFactory: (
        roles: RoleRepository,
        events: RoleEventRecorder,
        boundary: TransactionBoundary,
      ) => new ChangeRoleStatusUseCase(roles, events, boundary),
      inject: [ROLE_REPOSITORY, ROLE_EVENT_RECORDER, TRANSACTION_BOUNDARY],
    },
    {
      provide: GrantRolePermissionUseCase,
      useFactory: (
        roles: RoleRepository,
        events: RoleEventRecorder,
        boundary: TransactionBoundary,
      ) => new GrantRolePermissionUseCase(roles, events, boundary),
      inject: [ROLE_REPOSITORY, ROLE_EVENT_RECORDER, TRANSACTION_BOUNDARY],
    },
    {
      provide: RevokeRolePermissionUseCase,
      useFactory: (
        roles: RoleRepository,
        events: RoleEventRecorder,
        boundary: TransactionBoundary,
      ) => new RevokeRolePermissionUseCase(roles, events, boundary),
      inject: [ROLE_REPOSITORY, ROLE_EVENT_RECORDER, TRANSACTION_BOUNDARY],
    },
    {
      provide: AssignRoleToMembershipUseCase,
      useFactory: (
        memberships: MembershipRepository,
        roles: RoleRepository,
        assignments: MembershipRoleRepository,
        events: RoleEventRecorder,
        boundary: TransactionBoundary,
      ) => new AssignRoleToMembershipUseCase(memberships, roles, assignments, events, boundary),
      inject: [
        MEMBERSHIP_REPOSITORY,
        ROLE_REPOSITORY,
        MEMBERSHIP_ROLE_REPOSITORY,
        ROLE_EVENT_RECORDER,
        TRANSACTION_BOUNDARY,
      ],
    },
    {
      provide: RemoveRoleFromMembershipUseCase,
      useFactory: (
        assignments: MembershipRoleRepository,
        roles: RoleRepository,
        events: RoleEventRecorder,
        boundary: TransactionBoundary,
      ) => new RemoveRoleFromMembershipUseCase(assignments, roles, events, boundary),
      inject: [
        MEMBERSHIP_ROLE_REPOSITORY,
        ROLE_REPOSITORY,
        ROLE_EVENT_RECORDER,
        TRANSACTION_BOUNDARY,
      ],
    },
    {
      provide: ListMembershipRolesUseCase,
      useFactory: (
        memberships: MembershipRepository,
        assignments: MembershipRoleRepository,
        roles: RoleRepository,
      ) => new ListMembershipRolesUseCase(memberships, assignments, roles),
      inject: [MEMBERSHIP_REPOSITORY, MEMBERSHIP_ROLE_REPOSITORY, ROLE_REPOSITORY],
    },
    {
      provide: ResolveEffectivePermissionsUseCase,
      useFactory: (
        memberships: MembershipRepository,
        assignments: MembershipRoleRepository,
        roles: RoleRepository,
      ) => new ResolveEffectivePermissionsUseCase(memberships, assignments, roles),
      inject: [MEMBERSHIP_REPOSITORY, MEMBERSHIP_ROLE_REPOSITORY, ROLE_REPOSITORY],
    },
  ],
  // Exported to this module's own authorization feature (IAM-006), which must
  // resolve a subject's effective permissions from the roles their active
  // memberships hold. It is not an invitation to other modules: the boundary
  // guard still forbids them from importing this file, and the authorization
  // contract they consume never exposes a repository.
  exports: [ROLE_REPOSITORY, MEMBERSHIP_ROLE_REPOSITORY],
})
export class RoleModule {}
