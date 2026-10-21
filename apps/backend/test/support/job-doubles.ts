import type {
  IdempotencyGuard,
  JobEnvelope,
  JobRecord,
} from '../../src/infrastructure/jobs/job.types.js';
import type {
  ClaimedJob,
  JobQueuePort,
} from '../../src/infrastructure/jobs/queue/job-queue.port.js';

/**
 * An in-memory {@link JobQueuePort} for tests (IAM-007).
 *
 * The production adapter talks to Redis Streams; this one keeps everything in
 * the process, so a test can drive the *real* dispatcher — the one that
 * restores the tenant scope from the envelope — without any infrastructure.
 *
 * It keeps the two properties a test needs from the real queue: an envelope is
 * delivered once, and acknowledging it removes it from the pending list.
 */
export class InMemoryJobQueue implements JobQueuePort {
  private readonly pending: JobEnvelope[] = [];
  private readonly states = new Map<string, JobRecord>();

  /** Every envelope that was pushed, in order. */
  public readonly pushed: JobEnvelope[] = [];

  /** The envelopes that were delivered and not yet acknowledged. */
  public readonly inFlight: ClaimedJob[] = [];

  /** The lifecycle record the dispatcher wrote for a job, if any. */
  public stateOf(jobId: string): JobRecord | undefined {
    return this.states.get(jobId);
  }

  public async push(envelope: JobEnvelope): Promise<void> {
    this.pushed.push(envelope);
    this.pending.push(envelope);
  }

  public async claim(count: number): Promise<readonly ClaimedJob[]> {
    const taken = this.pending.splice(0, count).map((envelope, index) => ({
      streamId: `${index + 1}-0`,
      envelope,
    }));

    this.inFlight.push(...taken);
    return taken;
  }

  public async acknowledge(claimed: ClaimedJob): Promise<void> {
    const index = this.inFlight.findIndex((entry) => entry.streamId === claimed.streamId);

    if (index >= 0) {
      this.inFlight.splice(index, 1);
    }
  }

  public async reclaimStale(): Promise<readonly ClaimedJob[]> {
    return [];
  }

  public async saveState(record: JobRecord): Promise<void> {
    this.states.set(record.jobId, record);
  }

  public async loadState(jobId: string): Promise<JobRecord | undefined> {
    return this.states.get(jobId);
  }

  public async scheduleRetry(record: JobRecord): Promise<void> {
    this.states.set(record.jobId, record);
  }

  public async promoteDue(): Promise<number> {
    return 0;
  }
}

/** An in-memory {@link IdempotencyGuard}: the first caller of a key wins. */
export class InMemoryIdempotencyGuard implements IdempotencyGuard {
  private readonly claimed = new Set<string>();

  public async claim(key: string): Promise<boolean> {
    if (this.claimed.has(key)) {
      return false;
    }

    this.claimed.add(key);
    return true;
  }

  public async release(key: string): Promise<void> {
    this.claimed.delete(key);
  }
}
