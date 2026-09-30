import { Module } from '@nestjs/common';
import { AppConfigModule } from './infrastructure/config/app-config.module.js';
import { DatabaseModule } from './infrastructure/database/database.module.js';
import { ExampleModule } from './infrastructure/presentation/example/example.module.js';
import { HealthModule } from './infrastructure/presentation/health/health.module.js';
import { RedisModule } from './infrastructure/redis/redis.module.js';
import { StorageModule } from './infrastructure/storage/storage.module.js';

/**
 * Root module of the modular monolith.
 *
 * Domain modules (`src/modules/<module>`) are added here as they are implemented.
 * Only shared infrastructure and platform endpoints are wired at bootstrap time;
 * no business module exists yet on purpose (FND-001, FND-002). `ExampleModule` is
 * the non-business reference endpoint that exercises the REST/OpenAPI baseline
 * (FND-006) and is replaced by the first real module.
 */
@Module({
  imports: [
    AppConfigModule,
    DatabaseModule,
    RedisModule,
    StorageModule,
    HealthModule,
    ExampleModule,
  ],
})
export class AppModule {}
