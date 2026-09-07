import { Inject, Injectable } from '@nestjs/common';
import { APP_ENV } from '@shared/application';
import type { AppEnv, HealthIndicator, HealthIndicatorResult } from '@shared/application';
import { parseServiceAddress, tcpProbe } from '../probes/tcp';

const POSTGRES_DEFAULT_PORT = 5432;

/**
 * Postgres probe: opens a TCP connection to the configured DATABASE_URL host.
 * A full SQL handshake needs a driver; reachability is what a raw probe can
 * verify without one. Swap for a real connection check once persistence lands.
 */
@Injectable()
export class PostgresHealthIndicator implements HealthIndicator {
  readonly name = 'postgres';

  constructor(@Inject(APP_ENV) private readonly env: AppEnv) {}

  async check(): Promise<HealthIndicatorResult> {
    const address = parseServiceAddress(this.env.databaseUrl, POSTGRES_DEFAULT_PORT);
    const outcome = await tcpProbe(address);

    return {
      name: this.name,
      status: outcome.ok ? 'ok' : 'error',
      latencyMs: outcome.latencyMs,
      message: outcome.error,
      details: { target: `${address.host}:${address.port}` },
    };
  }
}
