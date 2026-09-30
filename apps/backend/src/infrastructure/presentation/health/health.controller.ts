import { Controller, Get, Header, HttpStatus, Res, VERSION_NEUTRAL } from '@nestjs/common';
import { AppConfigService } from '../../config/app-config.service.js';
import { ReadinessService } from '../../readiness/readiness.service.js';
import type { ReadinessReport } from '../../readiness/readiness.types.js';

export interface HealthResponse {
  readonly status: 'ok';
  readonly service: string;
  readonly environment: string;
  readonly timestamp: string;
}

/** The only part of the framework response this endpoint needs. */
interface StatusCapableResponse {
  status(code: number): void;
}

/**
 * Operational endpoints of the platform (ADR-002, section 16: no business rule
 * lives here; ADR-013: same REST style as every other endpoint, under the global
 * API prefix).
 *
 * The controller is `VERSION_NEUTRAL`: liveness and readiness are operational
 * probes, not part of the versioned public contract, so they stay at
 * `/api/health` while business endpoints are served under `/api/v1/…`
 * (the default version applied in `bootstrap.ts`). Docker Compose and the
 * frontend health panel depend on the stable, unversioned path.
 *
 * The two checks are deliberately separate, as required by ADR-015 section 9
 * and 10-observability:
 *
 * - `GET /health` — **Liveness**. Answers "is the process running?". It never
 *   touches MySQL, Redis or object storage, so an orchestrator never restarts a
 *   healthy process because a dependency is slow.
 * - `GET /health/ready` — **Readiness** (with the per-dependency checks that make
 *   up Dependency Health). Answers "can this process serve requests?". 200 with
 *   every check up, 503 with the same report when a required dependency is down.
 *   A dependency failure is reported, never crashes the process.
 *
 * Both responses are structured, machine-readable and stable: a dependency
 * failure carries a closed `reason` vocabulary instead of driver text, so no
 * secret, connection string or internal detail can reach the caller (the detail
 * is logged server-side, redacted). `Cache-Control: no-store` keeps a polling
 * client or proxy from ever seeing a cached answer.
 *
 * Readiness sets its status through the response and returns the report instead
 * of throwing, so the report body is returned as-is and is not reshaped into the
 * standard error contract by the global exception filter (FND-006).
 */
@Controller({ path: 'health', version: VERSION_NEUTRAL })
export class HealthController {
  constructor(
    private readonly config: AppConfigService,
    private readonly readiness: ReadinessService,
  ) {}

  @Get()
  @Header('Cache-Control', 'no-store')
  check(): HealthResponse {
    return {
      status: 'ok',
      service: this.config.runtime.serviceName,
      environment: this.config.environment.name,
      timestamp: new Date().toISOString(),
    };
  }

  @Get('ready')
  @Header('Cache-Control', 'no-store')
  async ready(
    @Res({ passthrough: true }) response: StatusCapableResponse,
  ): Promise<ReadinessReport> {
    const report = await this.readiness.check();

    if (report.status !== 'ready') {
      response.status(HttpStatus.SERVICE_UNAVAILABLE);
    }

    return report;
  }
}
