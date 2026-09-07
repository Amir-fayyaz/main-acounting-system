import { Module } from '@nestjs/common';
import type { Provider } from '@nestjs/common';
import { HEALTH_INDICATORS } from '@shared/application';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';
import { PostgresHealthIndicator } from './indicators/postgres.health-indicator';
import { ProcessHealthIndicator } from './indicators/process.health-indicator';
import { RedisHealthIndicator } from './indicators/redis.health-indicator';
import { APP_PACKAGE, readPackageInfo } from './package-info';

/**
 * Each indicator is registered under its class token; HEALTH_INDICATORS then
 * binds to the ordered array of instances so HealthService can aggregate every
 * registered probe without knowing the concrete classes.
 */
const providers: Provider[] = [
  HealthService,
  ProcessHealthIndicator,
  PostgresHealthIndicator,
  RedisHealthIndicator,
  { provide: APP_PACKAGE, useFactory: readPackageInfo },
  {
    provide: HEALTH_INDICATORS,
    useFactory: (
      processIndicator: ProcessHealthIndicator,
      postgresIndicator: PostgresHealthIndicator,
      redisIndicator: RedisHealthIndicator,
    ) => [processIndicator, postgresIndicator, redisIndicator],
    inject: [ProcessHealthIndicator, PostgresHealthIndicator, RedisHealthIndicator],
  },
];

@Module({
  controllers: [HealthController],
  providers,
})
export class HealthModule {}
