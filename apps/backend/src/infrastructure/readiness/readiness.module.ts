import { Module } from '@nestjs/common';
import type { Pool } from 'mysql2/promise';
import { DatabaseModule } from '../database/database.module.js';
import { MYSQL_CONNECTION_POOL } from '../database/database.tokens.js';
import { RedisConnectionService } from '../redis/redis-connection.service.js';
import { RedisModule } from '../redis/redis.module.js';
import type { ObjectStoragePort } from '../storage/object-storage.port.js';
import { StorageModule } from '../storage/storage.module.js';
import { OBJECT_STORAGE } from '../storage/storage.tokens.js';
import { ReadinessService } from './readiness.service.js';
import { READINESS_PROBES } from './readiness.tokens.js';
import type { DependencyProbe } from './readiness.types.js';

/**
 * Binds the concrete infrastructure to the readiness probes.
 *
 * This is the only place that knows which dependencies the process reports on;
 * adding a dependency (for example the queue) means adding one probe here.
 */
@Module({
  imports: [DatabaseModule, RedisModule, StorageModule],
  providers: [
    {
      provide: READINESS_PROBES,
      inject: [MYSQL_CONNECTION_POOL, RedisConnectionService, OBJECT_STORAGE],
      useFactory: (
        pool: Pool,
        redis: RedisConnectionService,
        storage: ObjectStoragePort,
      ): DependencyProbe[] => [
        {
          name: 'database',
          check: async () => {
            await pool.query('SELECT 1');
          },
        },
        {
          name: 'redis',
          check: () => redis.checkAvailability(),
        },
        {
          name: 'object-storage',
          check: () => storage.checkAvailability(),
        },
      ],
    },
    ReadinessService,
  ],
  exports: [ReadinessService],
})
export class ReadinessModule {}
