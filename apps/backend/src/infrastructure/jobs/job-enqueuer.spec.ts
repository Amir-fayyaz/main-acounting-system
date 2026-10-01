import { describe, expect, it } from 'vitest';
import { AppConfigService } from '../config/app-config.service.js';
import { loadConfiguration } from '../config/configuration.js';
import type { RegisteredJob } from './job.definition.js';
import { JobEnqueuer } from './job-enqueuer.js';
import { JobRegistry } from './job.registry.js';
import type { JobEnvelope, JobRecord } from './job.types.js';
import type { ClaimedJob, JobQueuePort } from './queue/job-queue.port.js';

class RecordingQueue implements JobQueuePort {
  readonly pushed: JobEnvelope[] = [];

  async push(envelope: JobEnvelope): Promise<void> {
    this.pushed.push(envelope);
  }

  async claim(): Promise<readonly ClaimedJob[]> {
    return [];
  }

  async acknowledge(): Promise<void> {}

  async reclaimStale(): Promise<readonly ClaimedJob[]> {
    return [];
  }

  async saveState(): Promise<void> {}

  async loadState(): Promise<JobRecord | undefined> {
    return undefined;
  }

  async scheduleRetry(): Promise<void> {}

  async promoteDue(): Promise<number> {
    return 0;
  }
}

const versionedJob: RegisteredJob = {
  type: 'test.versioned',
  version: 2,
  maxAttempts: 7,
  async execute() {},
};

function setup(): { enqueuer: JobEnqueuer; queue: RecordingQueue } {
  const queue = new RecordingQueue();
  const registry = new JobRegistry([versionedJob]);
  const config = new AppConfigService(
    loadConfiguration({ NODE_ENV: 'test', WORKER_MAX_ATTEMPTS: '5' }),
  );

  return { enqueuer: new JobEnqueuer(registry, queue, config), queue };
}

describe('JobEnqueuer', () => {
  it('inherits the version and attempt budget of a registered job', async () => {
    const { enqueuer, queue } = setup();

    const envelope = await enqueuer.enqueue({ type: 'test.versioned', payload: { a: 1 } });

    expect(envelope).toMatchObject({
      type: 'test.versioned',
      version: 2,
      maxAttempts: 7,
      attempt: 1,
      enqueuedBy: 'api',
      payload: { a: 1 },
    });
    expect(envelope.jobId).toEqual(expect.any(String));
    expect(envelope.correlationId).toEqual(expect.any(String));
    expect(queue.pushed).toEqual([envelope]);
  });

  it('falls back to the configured attempt budget for an unregistered type', async () => {
    const { enqueuer } = setup();

    const envelope = await enqueuer.enqueue({ type: 'test.unknown', payload: {} });

    expect(envelope.version).toBe(1);
    expect(envelope.maxAttempts).toBe(5);
    expect(envelope.enqueuedBy).toBe('api');
  });

  it('carries caller-provided trace and owner context', async () => {
    const { enqueuer } = setup();

    const envelope = await enqueuer.enqueue({
      type: 'test.versioned',
      payload: {},
      correlationId: 'correlation-9',
      companyId: 'company-1',
      enqueuedBy: 'scheduler',
    });

    expect(envelope.correlationId).toBe('correlation-9');
    expect(envelope.companyId).toBe('company-1');
    expect(envelope.enqueuedBy).toBe('scheduler');
  });
});
