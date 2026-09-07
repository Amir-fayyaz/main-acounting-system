import { Inject, Injectable } from '@nestjs/common';
import { APP_ENV } from '@shared/application';
import type { AppEnv, HealthIndicator, HealthIndicatorResult } from '@shared/application';
import { parseServiceAddress, redisPing } from '../probes/tcp';

const REDIS_DEFAULT_PORT = 6379;

/**
 * Redis probe: sends a real PING command over a raw socket and expects +PONG,
 * which exercises the server's command loop without a client library.
 */
@Injectable()
export class RedisHealthIndicator implements HealthIndicator {
  readonly name = 'redis';

  constructor(@Inject(APP_ENV) private readonly env: AppEnv) {}

  async check(): Promise<HealthIndicatorResult> {
    const address = parseServiceAddress(this.env.redisUrl, REDIS_DEFAULT_PORT);
    const outcome = await redisPing(address);

    return {
      name: this.name,
      status: outcome.ok ? 'ok' : 'error',
      latencyMs: outcome.latencyMs,
      message: outcome.error,
      details: { target: `${address.host}:${address.port}` },
    };
  }
}
