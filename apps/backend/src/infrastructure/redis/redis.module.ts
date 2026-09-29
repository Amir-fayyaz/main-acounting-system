import { Module } from '@nestjs/common';
import { RedisConnectionService } from './redis-connection.service.js';
import { REDIS_CLIENT } from './redis.tokens.js';

/**
 * Redis as shared infrastructure (TECH-007).
 *
 * Only the domain-agnostic technical capabilities are exposed here. Business
 * modules consume Redis through their own Port when they need an event bus, a
 * queue or a cache, so Redis never becomes a hidden gateway between modules
 * (ADR-002, sections 14 and 15).
 */
@Module({
  providers: [
    RedisConnectionService,
    {
      provide: REDIS_CLIENT,
      useFactory: (connection: RedisConnectionService) => connection.getClient(),
      inject: [RedisConnectionService],
    },
  ],
  exports: [RedisConnectionService, REDIS_CLIENT],
})
export class RedisModule {}
