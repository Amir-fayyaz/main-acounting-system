import { Controller, Get, Header, ServiceUnavailableException } from '@nestjs/common';
import { AppConfigService } from '../../config/app-config.service.js';
import { ReadinessService } from '../../readiness/readiness.service.js';
import type { ReadinessReport } from '../../readiness/readiness.types.js';

export interface HealthResponse {
  readonly status: 'ok';
  readonly service: string;
  readonly environment: string;
  readonly timestamp: string;
}

/**
 * Operational endpoints of the platform (ADR-002, section 16: no business rule
 * lives here; ADR-013: same REST style as every other endpoint, under the global
 * API prefix).
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
 */
@Controller('health')
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
  async ready(): Promise<ReadinessReport> {
    const report = await this.readiness.check();

    if (report.status !== 'ready') {
      // 503 with the report as the body: the caller sees which dependency is
      // down and why, in the same shape as the success response.
      throw new ServiceUnavailableException(report);
    }

    return report;
  }
}
