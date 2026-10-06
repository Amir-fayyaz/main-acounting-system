import { Module } from '@nestjs/common';
import { AppConfigModule } from './infrastructure/config/app-config.module.js';
import { DatabaseModule } from './infrastructure/database/database.module.js';
import { JobsModule } from './infrastructure/jobs/jobs.module.js';
import { ExampleModule } from './infrastructure/presentation/example/example.module.js';
import { HealthModule } from './infrastructure/presentation/health/health.module.js';
import { RedisModule } from './infrastructure/redis/redis.module.js';
import { StorageModule } from './infrastructure/storage/storage.module.js';
import { TenantModule } from './modules/tenant/infrastructure/tenant.module.js';
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
 * `ExampleModule` remains the non-business reference endpoint that
 * exercises the REST/OpenAPI baseline (FND-006) and is a working template a new
 * module can copy.
 *
 * `JobsModule` gives the HTTP process the same queue abstraction the Worker and
 * Scheduler use, so a use case can enqueue long-running work instead of keeping
 * it inside a request (ADR-008). It opens no connection at startup.
 */
@Module({
  imports: [
    AppConfigModule,
    DatabaseModule,
    RedisModule,
    StorageModule,
    JobsModule,
    HealthModule,
    ExampleModule,
    TenantModule,
    UserModule,
    MembershipModule,
    RoleModule,
  ],
})
export class AppModule {}
