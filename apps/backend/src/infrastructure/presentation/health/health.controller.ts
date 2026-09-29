import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
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
 * Operational endpoints.
 *
 * `GET /health` answers "is the process alive?" and must stay dependency-free so
 * an orchestrator does not restart a healthy process because MySQL is slow.
 * `GET /health/ready` answers "can this process serve traffic?" by probing the
 * infrastructure it depends on. Neither endpoint carries a business rule
 * (ADR-002, section 16).
 */
@Controller('health')
export class HealthController {
  constructor(
    private readonly config: AppConfigService,
    private readonly readiness: ReadinessService,
  ) {}

  @Get()
  check(): HealthResponse {
    return {
      status: 'ok',
      service: this.config.runtime.serviceName,
      environment: this.config.environment.name,
      timestamp: new Date().toISOString(),
    };
  }

  @Get('ready')
  async ready(): Promise<ReadinessReport> {
    const report = await this.readiness.check();

    if (report.status !== 'ready') {
      // 503 with the full report: the caller sees which dependency is down and why.
      throw new ServiceUnavailableException(report);
    }

    return report;
  }
}
