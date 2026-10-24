import { Global, Module } from '@nestjs/common';

import { AUDIT_RECORDER } from '../../audit/application/audit.tokens.js';
import type { AuditRecorder } from '../../audit/application/ports/audit-recorder.port.js';
import { AUTHORIZATION } from '../application/authorization/authorization.tokens.js';
import type { Authorization } from '../application/ports/authorization.port.js';
import type { TenantMembership } from '../application/ports/tenant-membership.port.js';
import { AuthorizeActionUseCase } from '../application/use-cases/authorize-action.use-case.js';
import { MEMBERSHIP_REPOSITORY, TENANT_MEMBERSHIP } from '../application/membership.tokens.js';
import { MEMBERSHIP_ROLE_REPOSITORY, ROLE_REPOSITORY } from '../application/role.tokens.js';
import { USER_REPOSITORY } from '../application/user.tokens.js';
import type { MembershipRepository } from '../domain/repositories/membership.repository.js';
import type { MembershipRoleRepository } from '../domain/repositories/membership-role.repository.js';
import type { RoleRepository } from '../domain/repositories/role.repository.js';
import type { UserRepository } from '../domain/repositories/user.repository.js';
import { AuthorizationGuard } from '../presentation/guards/authorization.guard.js';
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
  imports: [UserModule, MembershipModule, RoleModule, AuthenticationModule],
  providers: [
    {
      provide: AUTHORIZATION,
      useFactory: (
        users: UserRepository,
        memberships: MembershipRepository,
        tenantMembership: TenantMembership,
        assignments: MembershipRoleRepository,
        roles: RoleRepository,
        audit: AuditRecorder,
      ): Authorization =>
        new AuthorizeActionUseCase(
          users,
          memberships,
          tenantMembership,
          assignments,
          roles,
          audit,
        ),
      inject: [
        USER_REPOSITORY,
        MEMBERSHIP_REPOSITORY,
        TENANT_MEMBERSHIP,
        MEMBERSHIP_ROLE_REPOSITORY,
        ROLE_REPOSITORY,
        AUDIT_RECORDER,
      ],
    },
    AuthorizationGuard,
  ],
  exports: [AUTHORIZATION, AuthorizationGuard],
})
export class AuthorizationModule {}
