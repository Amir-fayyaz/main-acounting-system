import { Injectable } from '@nestjs/common';
import { AppConfigService } from '../../config/app-config.service.js';
import { RedisConnectionService } from '../../redis/redis-connection.service.js';
import { jobKeys, type JobKeys } from '../job-keys.js';
import type { IdempotencyGuard } from '../job.types.js';

/**
 * Redis-backed idempotency guard (FND-007, ADR-004 section 11).
 *
 * A claim is a single `SET NX EX`, so exactly one caller wins a key. The key is
 * released when the attempt fails and is kept when it succeeds, which is what
 * makes a duplicate *delivery* of a completed job a no-op. Whether a partially
 * executed attempt is safe to repeat is a domain decision the job's own
 * idempotency key expresses, not something this guard can infer.
 */
@Injectable()
export class RedisIdempotencyGuard implements IdempotencyGuard {
  private readonly keys: JobKeys;

  constructor(
    private readonly connection: RedisConnectionService,
    config: AppConfigService,
  ) {
    this.keys = jobKeys(config.environment.name);
  }

  async claim(key: string, ttlSeconds: number): Promise<boolean> {
    await this.connection.ensureConnected();
    const result = await this.connection.getClient().set(this.keys.idempotency(key), '1', {
      condition: 'NX',
      expiration: { type: 'EX', value: ttlSeconds },
    });

    return result === 'OK';
  }

  async release(key: string): Promise<void> {
    await this.connection.ensureConnected();
    await this.connection.getClient().del(this.keys.idempotency(key));
  }
}
