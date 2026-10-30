import { Global, Module } from '@nestjs/common';
import { AppConfigModule } from '../../../infrastructure/config/app-config.module.js';
import { DatabaseModule } from '../../../infrastructure/database/database.module.js';
import { SystemAdminBootstrapRunner } from './system-admin-bootstrap.runner.js';

import { AUDIT_RECORDER } from '../../audit/application/audit.tokens.js';
import type { AuditRecorder } from '../../audit/application/ports/audit-recorder.port.js';
import { AUTHORIZATION, PLATFORM_AUTHORIZATION } from '../application/authorization/authorization.tokens.js';
import { BootstrapSystemAdminUseCase } from '../application/use-cases/bootstrap-system-admin.use-case.js';
import { CreateUserUseCase } from '../application/use-cases/create-user.use-case.js';
import { SetUserCredentialUseCase } from '../application/use-cases/set-user-credential.use-case.js';
import type { TransactionBoundary } from '../../../shared/transaction/transaction-boundary.js';
import type { Authorization } from '../application/ports/authorization.port.js';
import type { PlatformAuthorization } from '../application/ports/platform-authorization.port.js';
import type { TenantMembership } from '../application/ports/tenant-membership.port.js';
import { AuthorizeActionUseCase } from '../application/use-cases/authorize-action.use-case.js';
import { MEMBERSHIP_REPOSITORY, TENANT_MEMBERSHIP } from '../application/membership.tokens.js';
import { MEMBERSHIP_ROLE_REPOSITORY, ROLE_REPOSITORY } from '../application/role.tokens.js';
import type { MembershipRepository } from '../domain/repositories/membership.repository.js';
import type { MembershipRoleRepository } from '../domain/repositories/membership-role.repository.js';
import type { RoleRepository } from '../domain/repositories/role.repository.js';
import type { UserRepository } from '../domain/repositories/user.repository.js';
import { AuthorizationGuard } from '../presentation/guards/authorization.guard.js';
import { DrizzlePlatformAuthorizationRepository } from './persistence/drizzle-platform-authorization.repository.js';
import { DATABASE, TRANSACTION_BOUNDARY } from '../../../infrastructure/database/database.tokens.js';
import { CREDENTIAL_REPOSITORY } from '../application/authentication.tokens.js';
import { USER_REPOSITORY } from '../application/user.tokens.js';
import type { CredentialRepository } from '../domain/repositories/credential.repository.js';
import type { Database } from '../../../infrastructure/database/database.module.js';
import { AuthenticationModule } from './authentication.module.js';
import { MembershipModule } from './membership.module.js';
import { RoleModule } from './role.module.js';
import { UserModule } from './user.module.js';

/**
 * The Identity module's Authorization feature (IAM-006).
 *
 * It wires the reusable decision boundary to the repositories that answer it —
 * the user's current state, the subject's memberships, and the effective
 * permissions of their active roles — and exposes it as a *published* contract:
 *
 * - `AUTHORIZATION` → `AuthorizeActionUseCase`, the implementation of the
 *   application-layer {@link Authorization} contract with `authorize()` and
 *   `permits()`. A business module (purchase, sales, …) injects this token to
 *   protect an operation it owns; it never sees a repository, a Drizzle table or
 *   the role model.
 * - `AuthorizationGuard` → the HTTP boundary, which classifies every operation
 *   (public / authenticated / authorized) and denies an unclassified one. The
 *   application registers it globally, so deny-by-default is a property of the
 *   process rather than of each controller.
 * - `AUDIT_RECORDER` → the central audit contract (AUD-001), used by the
 *   decision itself to record a refusal. Recording a denial is a consequence of
 *   the decision, not a second implementation of it: the audit module receives
 *   an action name, an actor and a reason and decides nothing about access.
 *
 * `TenantMembership` is a narrow Identity-internal port used by this decision;
 * it is wired to the Membership feature's repository adapter. No table, repository,
 * membership aggregate or role model is exported to business modules: this module
 * exports only the authorization contract and the HTTP boundary.
 *
 * The module is `@Global` for the same reason the tenant module is: a consumer
 * inside `src/modules/` may not import another module's `infrastructure/`
 * (including this file), so the published contract is made available
 * application-wide instead — and nothing else becomes visible, because only the
 * contract and the boundary guard are exported.
 */
@Global()
@Module({
  imports: [AppConfigModule, DatabaseModule, UserModule, MembershipModule, RoleModule, AuthenticationModule],
  providers: [
    {
      provide: PLATFORM_AUTHORIZATION,
      useFactory: (database: Database): PlatformAuthorization =>
        new DrizzlePlatformAuthorizationRepository(database),
      inject: [DATABASE],
    },
    {
      provide: BootstrapSystemAdminUseCase,
      useFactory: (
        users: UserRepository,
        credentials: CredentialRepository,
        platform: PlatformAuthorization,
        createUser: CreateUserUseCase,
        setCredential: SetUserCredentialUseCase,
        transactions: TransactionBoundary,
        audit: AuditRecorder,
      ) => new BootstrapSystemAdminUseCase(users, credentials, platform, createUser, setCredential, transactions, audit),
      inject: [USER_REPOSITORY, CREDENTIAL_REPOSITORY, PLATFORM_AUTHORIZATION, CreateUserUseCase, SetUserCredentialUseCase, TRANSACTION_BOUNDARY, AUDIT_RECORDER],
    },
    {
      provide: AUTHORIZATION,
      useFactory: (
        users: UserRepository,
        memberships: MembershipRepository,
        tenantMembership: TenantMembership,
        assignments: MembershipRoleRepository,
        roles: RoleRepository,
        audit: AuditRecorder,
        platformAuthorization: PlatformAuthorization,
      ): Authorization =>
        new AuthorizeActionUseCase(
          users,
          memberships,
          tenantMembership,
          assignments,
          roles,
          audit,
          platformAuthorization,
        ),
      inject: [
        USER_REPOSITORY,
        MEMBERSHIP_REPOSITORY,
        TENANT_MEMBERSHIP,
        MEMBERSHIP_ROLE_REPOSITORY,
        ROLE_REPOSITORY,
        AUDIT_RECORDER,
        PLATFORM_AUTHORIZATION,
      ],
    },
    AuthorizationGuard,
    SystemAdminBootstrapRunner,
  ],
  exports: [AUTHORIZATION, AuthorizationGuard, BootstrapSystemAdminUseCase, PLATFORM_AUTHORIZATION],
})
export class AuthorizationModule {}
