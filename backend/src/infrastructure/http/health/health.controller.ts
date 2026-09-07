import { Controller, Get, Res } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import type { HealthReport } from '@shared/application';
import { HealthService } from './health.service';

/**
 * Liveness probe: reports that the process is up and serving traffic. Cheap,
 * never touches dependencies, always 200 while the app runs.
 *
 * Readiness probe (/ready): aggregates every registered HealthIndicator
 * (process, postgres, redis) and returns 503 when any dependency is down.
 */
@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @ApiOperation({ summary: 'Liveness probe' })
  liveness(): { status: 'ok' } {
    return { status: 'ok' };
  }

  @Get('ready')
  @ApiOperation({ summary: 'Readiness probe: checks all registered dependencies' })
  async readiness(@Res({ passthrough: true }) response: Response): Promise<HealthReport> {
    const report = await this.healthService.checkAll();
    if (report.status === 'error') {
      response.status(503);
    }
    return report;
  }
}
