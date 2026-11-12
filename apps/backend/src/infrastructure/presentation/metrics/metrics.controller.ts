import { Controller, Get, Header, Res, UseGuards, VERSION_NEUTRAL } from '@nestjs/common';
import { Public } from '../../api/authorization/authorization-policy.js';
import { MetricsService } from '../../observability/metrics.service.js';
import { MetricsTokenGuard } from './metrics-token.guard.js';

/** The response subset the endpoint writes through. */
interface MetricsResponse {
  setHeader(name: string, value: string): void;
  send(body: string): void;
}

/**
 * The Prometheus scrape endpoint (FND-014, FND-016).
 *
 * `GET /api/metrics` serves the process registry in the Prometheus text
 * exposition format: the standard Node.js process metrics, the HTTP request
 * histogram, the job execution histogram, the queue depth and the database
 * pool gauges.
 *
 * It follows the health endpoint's conventions (ADR-002, section 16; ADR-013):
 * a `VERSION_NEUTRAL` operational path under the global `/api` prefix. It is
 * marked `@Public()` — a monitoring system holds no user identity — but it is
 * **not anonymous** (FND-016): `MetricsTokenGuard` requires a valid
 * `METRICS_TOKEN` bearer credential on every request, because the exposition
 * discloses route names and traffic patterns and ADR-010 is deny-by-default.
 * A production process refuses to boot without a configured token.
 * `Cache-Control: no-store` keeps a proxy from ever serving a stale scrape.
 */
@Public()
@UseGuards(MetricsTokenGuard)
@Controller({ path: 'metrics', version: VERSION_NEUTRAL })
export class MetricsController {
  constructor(private readonly metrics: MetricsService) {}

  @Get()
  @Header('Cache-Control', 'no-store')
  async serve(@Res() response: MetricsResponse): Promise<void> {
    response.setHeader('Content-Type', this.metrics.contentType);
    response.send(await this.metrics.expose());
  }
}
