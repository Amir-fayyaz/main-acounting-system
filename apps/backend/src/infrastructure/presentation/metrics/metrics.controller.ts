import { Controller, Get, Header, Res, VERSION_NEUTRAL } from '@nestjs/common';
import { Public } from '../../api/authorization/authorization-policy.js';
import { MetricsService } from '../../observability/metrics.service.js';

/** The response subset the endpoint writes through. */
interface MetricsResponse {
  setHeader(name: string, value: string): void;
  send(body: string): void;
}

/**
 * The Prometheus scrape endpoint (FND-014).
 *
 * `GET /api/metrics` serves the process registry in the Prometheus text
 * exposition format: the standard Node.js process metrics, the HTTP request
 * histogram, the job execution histogram, the queue depth and the database
 * pool gauges.
 *
 * It follows the health endpoint's conventions (ADR-002, section 16; ADR-013):
 * a `VERSION_NEUTRAL` operational path under the global `/api` prefix, marked
 * `@Public()` because a monitoring system holds no user identity — and the
 * exposition contains only technical counters, gauges and histograms, never a
 * business value, a credential or tenant data, so the deny-by-default
 * authorization boundary (IAM-006) does not apply. `Cache-Control: no-store`
 * keeps a proxy from ever serving a stale scrape.
 */
@Public()
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
