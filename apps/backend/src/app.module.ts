import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AppConfigModule } from './infrastructure/config/app-config.module.js';
import { DatabaseModule } from './infrastructure/database/database.module.js';
import { JobsModule } from './infrastructure/jobs/jobs.module.js';
import { LoggingModule } from './infrastructure/logging/logging.module.js';
import { ExampleModule } from './infrastructure/presentation/example/example.module.js';
import { HealthModule } from './infrastructure/presentation/health/health.module.js';
import { RateLimitModule } from './infrastructure/api/rate-limit/rate-limit.module.js';
import { RedisModule } from './infrastructure/redis/redis.module.js';
import { StorageModule } from './infrastructure/storage/storage.module.js';
import { AccountingModule } from './modules/accounting/infrastructure/accounting.module.js';
import { AuditModule } from './modules/audit/infrastructure/audit.module.js';
import { TenantModule } from './modules/tenant/public-api.js';
import { AuthenticationModule } from './modules/identity/infrastructure/authentication.module.js';
import { AuthorizationGuard } from './modules/identity/presentation/guards/authorization.guard.js';
import { AuthorizationModule } from './modules/identity/infrastructure/authorization.module.js';
import { UserModule } from './modules/identity/infrastructure/user.module.js';
import { MembershipModule } from './modules/identity/infrastructure/membership.module.js';
import { RoleModule } from './modules/identity/infrastructure/role.module.js';

/**
 * Root module of the modular monolith.
 *
 * Domain modules (`src/modules/<module>`) are added here as they are implemented.
 * `TenantModule` is the first business module (IAM-001): it owns tenant
 * persistence and exposes the tenant REST resource. `UserModule` is the second
 * business module (IAM-002): it owns user persistence and exposes the user REST
 * resource. `MembershipModule` is the third slice (IAM-003): it owns the user–tenant
 * membership relationship and consumes the tenant module's published contract.
 * `RoleModule` is the fourth slice (IAM-004): it owns roles, the code-defined
 * permission catalog and the membership-role assignments, and consumes both the
 * tenant module's published contract and the membership feature's port.
 * `AuthenticationModule` is the fifth slice (IAM-005): it owns credentials and
 * authentication sessions, exposes the sign-in/sign-out/session endpoints and
 * the HTTP authentication boundary, and deliberately depends on no membership,
 * role or tenant contract — authentication establishes identity and grants no
 * tenant access.
 * `AuthorizationModule` is the sixth slice (IAM-006): it publishes the reusable
 * authorization contract and the HTTP authorization boundary, and it is what
 * turns "who is calling" into "may they do this" — an active membership in the
 * target tenant plus the capability IAM-004 grants. It is registered as a
 * **global guard** below, so every endpoint is denied unless it declares
 * `@Public()`, `@RequiresAuthentication()` or `@Authorize(...)`.
 * `AuditModule` is the cross-cutting Audit capability (AUD-001): it owns the
 * durable audit trail, publishes the application contract every module records
 * facts through and exposes the authorization-protected retrieval resource. It
 * is imported after the identity slices because those slices record their
 * security events through the contract it publishes.
 * `AccountingModule` is the first accounting slice (FIS-002): it owns the
 * fiscal year — the tenant-owned, non-overlapping annual frame later tickets
 * will generate periods inside. It exposes no HTTP resource and publishes no
 * cross-module contract yet, so it is wired but deliberately inert.
 * `ExampleModule` remains the non-business reference endpoint that
 * exercises the REST/OpenAPI baseline (FND-006) and is a working template a new
 * module can copy.
 *
 * `JobsModule` gives the HTTP process the same queue abstraction the Worker and
 * Scheduler use, so a use case can enqueue long-running work instead of keeping
 * it inside a request (ADR-008). It opens no connection at startup.
 * `LoggingModule` is the cross-cutting logging baseline (FND-011): one contract,
 * one JSON shape, one redaction pass, bound globally because every module logs.
 */
@Module({
  imports: [
    AppConfigModule,
    LoggingModule,
    DatabaseModule,
    RedisModule,
    RateLimitModule,
    StorageModule,
    JobsModule,
    HealthModule,
    ExampleModule,
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
      // The HTTP authorization boundary, applied to **every** route of the
      // process. An operation that declares no policy is denied by default, so
      // protecting a new endpoint is a matter of stating what it requires
      // rather than remembering to apply a guard (IAM-006; ADR-010 section 13).
      provide: APP_GUARD,
      useExisting: AuthorizationGuard,
    },
  ],
})
export class AppModule {}
