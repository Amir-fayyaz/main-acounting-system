import { Inject, Injectable } from '@nestjs/common';
import { HEALTH_INDICATORS } from '@shared/application';
import type { HealthIndicator, HealthIndicatorResult, HealthReport, HealthStatus } from '@shared/application';
import { APP_PACKAGE, readPackageInfo } from './package-info';

/**
 * Runs every registered HealthIndicator concurrently and aggregates the
 * results into a HealthReport. A single failing (or throwing) indicator makes
 * the overall status 'error' without hiding the remaining checks.
 */
@Injectable()
export class HealthService {
  constructor(
    @Inject(HEALTH_INDICATORS) private readonly indicators: HealthIndicator[],
    @Inject(APP_PACKAGE) private readonly packageInfo = readPackageInfo(),
  ) {}

  async checkAll(): Promise<HealthReport> {
    const settled = await Promise.allSettled(this.indicators.map((indicator) => indicator.check()));

    const checks: HealthIndicatorResult[] = settled.map((result, index) => {
      const indicator = this.indicators[index];
      if (result.status === 'fulfilled') {
        return result.value;
      }
      return {
        name: indicator.name,
        status: 'error',
        latencyMs: 0,
        message: result.reason instanceof Error ? result.reason.message : 'check threw',
      };
    });

    const status: HealthStatus = checks.every((check) => check.status === 'ok') ? 'ok' : 'error';

    return {
      status,
      checks,
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.round(process.uptime()),
      version: this.packageInfo.version,
    };
  }
}
