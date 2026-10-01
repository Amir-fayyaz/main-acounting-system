import { Test } from '@nestjs/testing';
import { describe, expect, it } from 'vitest';
import { AppConfigService } from '../src/infrastructure/config/app-config.service.js';
import { JobRegistry } from '../src/infrastructure/jobs/job.registry.js';
import { RedisConnectionService } from '../src/infrastructure/redis/redis-connection.service.js';
import { CliModule } from '../src/cli/cli.module.js';
import { SchedulerModule } from '../src/scheduler.module.js';
import { WorkerModule } from '../src/worker.module.js';

/**
 * Regression guard for the process wiring (FND-007).
 *
 * The Worker, Scheduler and CLI run without the HTTP app, so they must import
 * the configuration module themselves. Compiling each of their DI graphs catches
 * a missing provider before it becomes a runtime startup failure — the exact bug
 * that made `node dist/worker.js` exit at boot.
 */
const processes: readonly [string, unknown][] = [
  ['worker', WorkerModule],
  ['scheduler', SchedulerModule],
  ['cli', CliModule],
];

describe('process module wiring (e2e)', () => {
  for (const [name, moduleType] of processes) {
    it(`compiles the ${name} process with the centralized configuration`, async () => {
      const moduleRef = await Test.createTestingModule({
        imports: [moduleType as never],
      }).compile();

      try {
        expect(moduleRef.get(AppConfigService).environment.name).toBe('test');
        expect(moduleRef.get(RedisConnectionService)).toBeDefined();
        expect(moduleRef.get(JobRegistry).types()).toContain('sample.echo');
      } finally {
        await moduleRef.close();
      }
    });
  }
});
