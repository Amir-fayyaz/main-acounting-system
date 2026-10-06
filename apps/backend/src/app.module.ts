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

/**
 * Root module of the modular monolith.
 *
 * Domain modules (`src/modules/<module>`) are added here as they are implemented.
 * `TenantModule` is the first business module (IAM-001): it owns tenant
 * persistence and exposes the tenant REST resource. `UserModule` is the second
 * business module (IAM-002): it owns user persistence and exposes the user REST
 * resource. `ExampleModule` remains the non-business reference endpoint that
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
  ],
})
export class AppModule {}
