/**
 * Rate-limiting module (SEC-001).
 *
 * Wires the `RateLimiter` contract to its Redis-backed adapter and provides
 * the `RateLimitGuard`. Imported by `AppModule`; the guard is applied per-route
 * via `@UseGuards(RateLimitGuard)` and `@RateLimit(...)`, not globally.
 */
import { Module } from '@nestjs/common';
import { AppConfigModule } from '../../config/app-config.module.js';
import { RedisModule } from '../../redis/redis.module.js';
import { RateLimitGuard } from './rate-limit.guard.js';
import { RATE_LIMITER } from './rate-limit.tokens.js';
import { RedisRateLimiter } from './redis-rate-limiter.js';

@Module({
  imports: [AppConfigModule, RedisModule],
  providers: [
    {
      provide: RATE_LIMITER,
      useClass: RedisRateLimiter,
    },
    RateLimitGuard,
  ],
  exports: [RATE_LIMITER, RateLimitGuard],
})
export class RateLimitModule {}
