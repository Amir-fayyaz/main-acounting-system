import { Injectable } from '@nestjs/common';
import type { HealthIndicator, HealthIndicatorResult } from '@shared/application';

/**
 * Self probe: always 'ok' while the process is alive, reporting runtime
 * details so operators can correlate readiness with process health.
 */
@Injectable()
export class ProcessHealthIndicator implements HealthIndicator {
  readonly name = 'process';

  check(): Promise<HealthIndicatorResult> {
    const startedAt = performance.now();
    const memory = process.memoryUsage();

    return Promise.resolve({
      name: this.name,
      status: 'ok',
      latencyMs: Math.round(performance.now() - startedAt),
      details: {
        uptimeSeconds: Math.round(process.uptime()),
        pid: process.pid,
        nodeVersion: process.version,
        rssBytes: memory.rss,
        heapUsedBytes: memory.heapUsed,
      },
    });
  }
}
