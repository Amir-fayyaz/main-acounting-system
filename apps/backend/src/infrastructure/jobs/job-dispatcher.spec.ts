import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { AppConfigService } from '../config/app-config.service.js';
import { loadConfiguration } from '../config/configuration.js';
import { createSecretRedactor, NO_REDACTION } from '../config/secrets.js';
import type { TenantContext } from '../../shared/tenant/tenant-context.js';
import { TenantScope } from '../../shared/tenant/tenant-scope.js';
import type { RegisteredJob } from './job.definition.js';
import { JobDispatcher } from './job-dispatcher.js';
import { RetryableJobError, TerminalJobError } from './job.errors.js';
import { JobRegistry } from './job.registry.js';
import type {
  IdempotencyGuard,
  JobEnvelope,
  JobExecutionResult,
  JobLogFields,
  JobLogger,
  JobRecord,
} from './job.types.js';
import type { ClaimedJob, JobQueuePort } from './queue/job-queue.port.js';

class FakeQueue implements JobQueuePort {
  readonly states = new Map<string, JobRecord>();
  readonly retries: { record: JobRecord; delayMs: number }[] = [];
  readonly acknowledged: string[] = [];

  async push(): Promise<void> {}

  async claim(): Promise<readonly ClaimedJob[]> {
    return [];
  }

  async acknowledge(claimed: ClaimedJob): Promise<void> {
    this.acknowledged.push(claimed.streamId);
  }

  async reclaimStale(): Promise<readonly ClaimedJob[]> {
    return [];
  }

  async saveState(record: JobRecord): Promise<void> {
    this.states.set(record.jobId, record);
  }

  async loadState(jobId: string): Promise<JobRecord | undefined> {
    return this.states.get(jobId);
  }

  async scheduleRetry(record: JobRecord, delayMs: number): Promise<void> {
    this.states.set(record.jobId, record);
    this.retries.push({ record, delayMs });
  }

  async promoteDue(): Promise<number> {
    return 0;
  }
}

class FakeIdempotency implements IdempotencyGuard {
  readonly claimed = new Set<string>();

  async claim(key: string): Promise<boolean> {
    if (this.claimed.has(key)) {
      return false;
    }

    this.claimed.add(key);

    return true;
  }

  async release(key: string): Promise<void> {
    this.claimed.delete(key);
  }
}

class FakeJobLogger implements JobLogger {
  readonly entries: { level: 'info' | 'warn' | 'error'; message: string; fields: JobLogFields }[] =
    [];

  info(message: string, fields: JobLogFields): void {
    this.entries.push({ level: 'info', message, fields });
  }

  warn(message: string, fields: JobLogFields): void {
    this.entries.push({ level: 'warn', message, fields });
  }

  error(message: string, fields: JobLogFields): void {
    this.entries.push({ level: 'error', message, fields });
  }
}

function config(maxAttempts = 3): AppConfigService {
  return new AppConfigService(
    loadConfiguration({
      NODE_ENV: 'test',
      WORKER_MAX_ATTEMPTS: String(maxAttempts),
      WORKER_RETRY_BASE_DELAY_MS: '100',
      WORKER_RETRY_MAX_DELAY_MS: '1000',
    }),
  );
}

function envelope(type: string, payload: unknown = {}, attempt = 1, maxAttempts = 3): JobEnvelope {
  return {
    jobId: randomUUID(),
    type,
    version: 1,
    payload,
    attempt,
    maxAttempts,
    correlationId: 'correlation-1',
    createdAt: new Date().toISOString(),
    enqueuedBy: 'test',
  };
}

function claimed(job: JobEnvelope): ClaimedJob {
  return { streamId: '1-0', envelope: job };
}

function setup(
  definitions: readonly RegisteredJob[],
  maxAttempts = 3,
  options?: {
    secrets?: { MYSQL_PASSWORD?: string };
  },
) {
  const queue = new FakeQueue();
  const idempotency = new FakeIdempotency();
  const logger = new FakeJobLogger();
  const registry = new JobRegistry(definitions);
  const secrets = options?.secrets ? createSecretRedactor(options.secrets) : NO_REDACTION;
  const dispatcher = new JobDispatcher(
    registry,
    logger,
    queue,
    idempotency,
    config(maxAttempts),
    secrets,
  );

  return { dispatcher, queue, idempotency, logger };
}

const okJob: RegisteredJob = {
  type: 'test.ok',
  async execute(): Promise<JobExecutionResult> {
    return { outcome: 'completed' };
  },
};

const retryJob: RegisteredJob = {
  type: 'test.retry',
  async execute() {
    throw new RetryableJobError('temporary outage');
  },
};

const terminalJob: RegisteredJob = {
  type: 'test.terminal',
  async execute() {
    throw new TerminalJobError('business rejection');
  },
};

const bugJob: RegisteredJob = {
  type: 'test.bug',
  async execute() {
    throw new Error('unexpected failure');
  },
};

describe('JobDispatcher', () => {
  it('records a successful execution and acknowledges the stream entry', async () => {
    const { dispatcher, queue, logger } = setup([okJob]);
    const job = envelope('test.ok');

    await expect(dispatcher.dispatch(claimed(job))).resolves.toBe('completed');

    expect(queue.states.get(job.jobId)?.status).toBe('completed');
    expect(queue.states.get(job.jobId)?.startedAt).toEqual(expect.any(String));
    expect(queue.acknowledged).toEqual(['1-0']);
    expect(logger.entries.map((entry) => entry.message)).toEqual(['Job started', 'Job completed']);
  });

  it('schedules a bounded retry for a transient failure', async () => {
    const { dispatcher, queue } = setup([retryJob]);
    const job = envelope('test.retry', {}, 1, 3);

    await expect(dispatcher.dispatch(claimed(job))).resolves.toBe('retrying');

    expect(queue.retries).toHaveLength(1);
    // base 100ms, attempt 1: 50–100ms after jitter.
    expect(queue.retries[0]?.delayMs).toBeGreaterThanOrEqual(50);
    expect(queue.retries[0]?.delayMs).toBeLessThanOrEqual(100);
    expect(queue.states.get(job.jobId)?.status).toBe('retrying');
    expect(queue.states.get(job.jobId)?.lastError?.category).toBe('retryable');
    expect(queue.acknowledged).toEqual(['1-0']);
  });

  it('parks a transient failure once the attempt budget is exhausted', async () => {
    const { dispatcher, queue } = setup([retryJob], 3);
    const job = envelope('test.retry', {}, 3, 3);

    await expect(dispatcher.dispatch(claimed(job))).resolves.toBe('failed');

    expect(queue.retries).toHaveLength(0);
    expect(queue.states.get(job.jobId)?.status).toBe('failed');
    expect(queue.states.get(job.jobId)?.lastError?.category).toBe('retryable');
  });

  it('never retries a terminal failure', async () => {
    const { dispatcher, queue } = setup([terminalJob]);
    const job = envelope('test.terminal');

    await expect(dispatcher.dispatch(claimed(job))).resolves.toBe('failed');

    expect(queue.retries).toHaveLength(0);
    expect(queue.states.get(job.jobId)?.lastError?.category).toBe('terminal');
  });

  it('treats an unexpected error as not safe to retry', async () => {
    const { dispatcher, queue } = setup([bugJob]);
    const job = envelope('test.bug');

    await expect(dispatcher.dispatch(claimed(job))).resolves.toBe('failed');

    expect(queue.retries).toHaveLength(0);
    expect(queue.states.get(job.jobId)?.lastError?.category).toBe('unknown');
  });

  it('parks a job whose type is not registered', async () => {
    const { dispatcher, queue } = setup([okJob]);
    const job = envelope('test.unregistered');

    await expect(dispatcher.dispatch(claimed(job))).resolves.toBe('failed');

    expect(queue.states.get(job.jobId)?.lastError?.name).toBe('UnknownJobTypeError');
    expect(queue.acknowledged).toEqual(['1-0']);
  });

  it('redacts a secret out of a recorded failure message', async () => {
    const leaky: RegisteredJob = {
      type: 'test.leaky',
      async execute() {
        throw new Error('connection failed with super-secret-value');
      },
    };
    const { dispatcher, queue } = setup([leaky], 3, {
      secrets: { MYSQL_PASSWORD: 'super-secret-value' },
    });
    const job = envelope('test.leaky');

    await dispatcher.dispatch(claimed(job));

    const message = queue.states.get(job.jobId)?.lastError?.message ?? '';
    expect(message).not.toContain('super-secret-value');
    expect(message).toContain('[redacted]');
  });

  it('skips a duplicate delivery whose effect was already applied', async () => {
    let executions = 0;
    const counted: RegisteredJob = {
      type: 'test.counted',
      idempotencyKey: (payload) => `test.counted:${(payload as { key: string }).key}`,
      async execute() {
        executions += 1;

        return { outcome: 'completed' };
      },
    };
    const { dispatcher } = setup([counted]);

    await dispatcher.dispatch(claimed(envelope('test.counted', { key: 'k1' })));
    await dispatcher.dispatch(claimed(envelope('test.counted', { key: 'k1' })));

    expect(executions).toBe(1);
  });

  it('releases the idempotency claim when the attempt fails, so a retry can run', async () => {
    let executions = 0;
    const flaky: RegisteredJob = {
      type: 'test.flaky',
      idempotencyKey: () => 'test.flaky:key',
      async execute() {
        executions += 1;

        if (executions === 1) {
          throw new RetryableJobError('temporary');
        }

        return { outcome: 'completed' };
      },
    };
    const { dispatcher, idempotency } = setup([flaky]);

    await dispatcher.dispatch(claimed(envelope('test.flaky', {}, 1, 3)));
    expect(idempotency.claimed.has('test.flaky:key')).toBe(false);

    await dispatcher.dispatch(claimed(envelope('test.flaky', {}, 2, 3)));
    expect(executions).toBe(2);
  });
});

describe('JobDispatcher � tenant scope (SHR-007)', () => {
  it('restores the envelope company as the ambient tenant context', async () => {
    let observed: TenantContext | undefined;
    const probe: RegisteredJob = {
      type: 'test.tenant-probe',
      async execute() {
        await Promise.resolve();
        observed = TenantScope.current();

        return { outcome: 'completed' };
      },
    };
    const { dispatcher } = setup([probe]);
    const job = { ...envelope('test.tenant-probe'), companyId: 'tenant-42' };

    await expect(dispatcher.dispatch(claimed(job))).resolves.toBe('completed');

    expect(observed).toEqual({
      state: 'available',
      tenantId: 'tenant-42',
      correlationId: 'correlation-1',
    });
    expect(TenantScope.current().state).toBe('missing');
  });

  it('runs a job without a company under an explicit system scope', async () => {
    let observed: TenantContext | undefined;
    const probe: RegisteredJob = {
      type: 'test.system-probe',
      async execute() {
        observed = TenantScope.current();

        return { outcome: 'completed' };
      },
    };
    const { dispatcher } = setup([probe]);

    await expect(dispatcher.dispatch(claimed(envelope('test.system-probe')))).resolves.toBe(
      'completed',
    );

    expect(observed).toEqual({ state: 'system' });
    expect(TenantScope.current().state).toBe('missing');
  });

  it('refuses to run a tenant-scoped job that carries no company context', async () => {
    let executions = 0;
    const tenantJob: RegisteredJob = {
      type: 'test.tenant-scoped',
      tenantScoped: true,
      async execute() {
        executions += 1;

        return { outcome: 'completed' };
      },
    };
    const { dispatcher, queue } = setup([tenantJob]);
    const job = envelope('test.tenant-scoped');

    await expect(dispatcher.dispatch(claimed(job))).resolves.toBe('failed');

    expect(executions).toBe(0);
    expect(queue.retries).toHaveLength(0);
    expect(queue.states.get(job.jobId)?.lastError?.name).toBe('TenantContextMissingError');
    expect(queue.states.get(job.jobId)?.lastError?.category).toBe('unknown');
  });

  it('runs a tenant-scoped job when the envelope carries its company', async () => {
    let observed: TenantContext | undefined;
    const tenantJob: RegisteredJob = {
      type: 'test.tenant-scoped-ok',
      tenantScoped: true,
      async execute() {
        observed = TenantScope.current();

        return { outcome: 'completed' };
      },
    };
    const { dispatcher } = setup([tenantJob]);
    const job = { ...envelope('test.tenant-scoped-ok'), companyId: 'tenant-42' };

    await expect(dispatcher.dispatch(claimed(job))).resolves.toBe('completed');

    expect(observed).toMatchObject({ state: 'available', tenantId: 'tenant-42' });
  });
});
