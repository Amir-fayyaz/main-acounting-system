import { Module } from '@nestjs/common';
import { AppConfigModule } from './infrastructure/config/app-config.module.js';
import { DatabaseModule } from './infrastructure/database/database.module.js';
import { HealthModule } from './infrastructure/presentation/health/health.module.js';
import { RedisModule } from './infrastructure/redis/redis.module.js';
import { StorageModule } from './infrastructure/storage/storage.module.js';

/**
 * Root module of the modular monolith.
 *
 * Domain modules (`src/modules/<module>`) are added here as they are implemented.
 * Only shared infrastructure and platform endpoints are wired at bootstrap time;
 * no business module exists yet on purpose (FND-001, FND-002).
 */
@Module({
  imports: [AppConfigModule, DatabaseModule, RedisModule, StorageModule, HealthModule],
})
export class AppModule {}
