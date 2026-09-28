import { Controller, Get } from '@nestjs/common';
import { AppConfigService } from '../../config/app-config.service.js';

export interface HealthResponse {
  readonly status: 'ok';
  readonly service: 'backend';
  readonly environment: string;
  readonly timestamp: string;
}

/**
 * Operational liveness endpoint.
 *
 * It reports process availability only: business readiness checks (database,
 * Redis, storage) belong to a dedicated readiness endpoint and must be added
 * together with the infrastructure they verify. This endpoint carries no
 * business rule (ADR-002, section 16).
 */
@Controller('health')
export class HealthController {
  constructor(private readonly config: AppConfigService) {}

  @Get()
  check(): HealthResponse {
    return {
      status: 'ok',
      service: 'backend',
      environment: this.config.nodeEnv,
      timestamp: new Date().toISOString(),
    };
  }
}
