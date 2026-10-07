import { Global, Module } from '@nestjs/common';

import { AUTHORIZATION } from '../application/authorization/authorization.tokens.js';
import type { Authorization } from '../application/ports/authorization.port.js';
import { AuthorizeActionUseCase } from '../application/use-cases/authorize-action.use-case.js';
import { MEMBERSHIP_REPOSITORY } from '../application/membership.tokens.js';
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
 *
 * Note what is **not** imported as a contract: no role catalog, no membership
 * entity, no user aggregate. The module depends on the identity features'
 * internal repositories to answer the decision, and exports only the decision.
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
        assignments: MembershipRoleRepository,
        roles: RoleRepository,
      ): Authorization => new AuthorizeActionUseCase(users, memberships, assignments, roles),
      inject: [USER_REPOSITORY, MEMBERSHIP_REPOSITORY, MEMBERSHIP_ROLE_REPOSITORY, ROLE_REPOSITORY],
    },
    AuthorizationGuard,
  ],
  exports: [AUTHORIZATION, AuthorizationGuard],
})
export class AuthorizationModule {}
