import { Module } from '@nestjs/common';

import { AppConfigModule } from '../../infrastructure/config/app-config.module.js';
import { AppConfigService } from '../../infrastructure/config/app-config.service.js';
import { DatabaseModule } from '../../infrastructure/database/database.module.js';
import { LoggingModule } from '../../infrastructure/logging/logging.module.js';
import { SeedInfrastructureModule } from '../../infrastructure/seed/seed-infrastructure.module.js';
import type { SeedRegistry } from '../../infrastructure/seed/seed-registry.port.js';
import { SEED_REGISTRY } from '../../infrastructure/seed/seed.tokens.js';
import { AccountingModule } from '../../modules/accounting/infrastructure/accounting.module.js';
import { CreateFiscalYearUseCase } from '../../modules/accounting/application/use-cases/create-fiscal-year.use-case.js';
import { AuditModule } from '../../modules/audit/infrastructure/audit.module.js';
import { AuthenticationModule } from '../../modules/identity/infrastructure/authentication.module.js';
import { AuthorizationModule } from '../../modules/identity/infrastructure/authorization.module.js';
import { BootstrapSystemAdminUseCase } from '../../modules/identity/application/use-cases/bootstrap-system-admin.use-case.js';
import { CreateMembershipUseCase } from '../../modules/identity/application/use-cases/create-membership.use-case.js';
import { CreateRoleUseCase } from '../../modules/identity/application/use-cases/create-role.use-case.js';
import { CreateUserUseCase } from '../../modules/identity/application/use-cases/create-user.use-case.js';
import { GrantRolePermissionUseCase } from '../../modules/identity/application/use-cases/grant-role-permission.use-case.js';
import { AssignRoleToMembershipUseCase } from '../../modules/identity/application/use-cases/assign-role-to-membership.use-case.js';
import { ListMembershipRolesUseCase } from '../../modules/identity/application/use-cases/list-membership-roles.use-case.js';
import { ListRolesUseCase } from '../../modules/identity/application/use-cases/list-roles.use-case.js';
import { ListUserMembershipsUseCase } from '../../modules/identity/application/use-cases/list-user-memberships.use-case.js';
import { SetUserCredentialUseCase } from '../../modules/identity/application/use-cases/set-user-credential.use-case.js';
import { MembershipModule } from '../../modules/identity/infrastructure/membership.module.js';
import { RoleModule } from '../../modules/identity/infrastructure/role.module.js';
import { UserModule } from '../../modules/identity/infrastructure/user.module.js';
import { USER_DIRECTORY } from '../../modules/identity/application/user.tokens.js';
import type { UserDirectory } from '../../modules/identity/application/ports/user-directory.port.js';
import {
  CreateTenantUseCase,
  TENANT_DIRECTORY,
  TenantModule,
  type TenantDirectory,
} from '../../modules/tenant/public-api.js';
import { DevelopmentSeedRunner } from './development-seed.runner.js';

/**
 * The application context the `pnpm seed` command runs (DEV-001).
 *
 * It composes the *same* modules and the *same* use cases the API uses — no
 * parallel provisioning path, no direct table access — and adds only the two
 * things the command needs: the seed registry and the dataset runner. It never
 * imports `AppModule`, so seeding cannot start HTTP, a worker or a scheduler,
 * and the API process never imports this file, so seeding cannot run at startup.
 */
@Module({
  imports: [
    AppConfigModule,
    LoggingModule,
    DatabaseModule,
    SeedInfrastructureModule,
    TenantModule,
    UserModule,
    MembershipModule,
    RoleModule,
    AuthenticationModule,
    AuthorizationModule,
    AuditModule,
    AccountingModule,
  ],
  providers: [
    {
      provide: DevelopmentSeedRunner,
      useFactory: (
        config: AppConfigService,
        bootstrap: BootstrapSystemAdminUseCase,
        users: UserDirectory,
        createUser: CreateUserUseCase,
        setCredential: SetUserCredentialUseCase,
        createTenant: CreateTenantUseCase,
        tenants: TenantDirectory,
        createMembership: CreateMembershipUseCase,
        listUserMemberships: ListUserMembershipsUseCase,
        createRole: CreateRoleUseCase,
        listRoles: ListRolesUseCase,
        grantRolePermission: GrantRolePermissionUseCase,
        assignRole: AssignRoleToMembershipUseCase,
        listMembershipRoles: ListMembershipRolesUseCase,
        createFiscalYear: CreateFiscalYearUseCase,
        registry: SeedRegistry,
      ) =>
        new DevelopmentSeedRunner({
          config,
          bootstrap,
          users,
          createUser,
          setCredential,
          createTenant,
          tenants,
          createMembership,
          listUserMemberships,
          createRole,
          listRoles,
          grantRolePermission,
          assignRole,
          listMembershipRoles,
          createFiscalYear,
          registry,
        }),
      inject: [
        AppConfigService,
        BootstrapSystemAdminUseCase,
        USER_DIRECTORY,
        CreateUserUseCase,
        SetUserCredentialUseCase,
        CreateTenantUseCase,
        TENANT_DIRECTORY,
        CreateMembershipUseCase,
        ListUserMembershipsUseCase,
        CreateRoleUseCase,
        ListRolesUseCase,
        GrantRolePermissionUseCase,
        AssignRoleToMembershipUseCase,
        ListMembershipRolesUseCase,
        CreateFiscalYearUseCase,
        SEED_REGISTRY,
      ],
    },
  ],
})
export class SeedModule {}
