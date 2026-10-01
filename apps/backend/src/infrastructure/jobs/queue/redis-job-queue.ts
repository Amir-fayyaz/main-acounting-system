import { Injectable, Logger } from '@nestjs/common';
import { AppConfigService } from '../../config/app-config.service.js';
import { RedisConnectionService } from '../../redis/redis-connection.service.js';
import { jobKeys, type JobKeys } from '../job-keys.js';
import type { JobEnvelope, JobRecord } from '../job.types.js';
import type { ClaimedJob, JobQueuePort } from './job-queue.port.js';

type RedisClient = ReturnType<RedisConnectionService['getClient']>;
type StreamReadReply = Awaited<ReturnType<RedisClient['xReadGroup']>>;

/** Single stream field carrying the serialized envelope. */
const STREAM_FIELD = 'envelope';

/** Upper bound on the stream length; the lifecycle record is the durable part. */
const STREAM_MAX_LENGTH = 100_000;

/**
 * Redis Streams implementation of the queue port (FND-007, ADR-008).
 *
 * Streams are used because they persist and can be replayed, which Pub/Sub
 * cannot (ADR-005, section 7). A consumer group gives each envelope to one
 * Worker at a time and keeps it pending until acknowledged, so a Worker crash
 * leaves the work reclaimable instead of lost.
 *
 * Nothing connects eagerly: the consumer group is created on the first `claim`,
 * so the HTTP process can hold this adapter without touching Redis at startup.
 *
 * Redis remains infrastructure only (TECH-007): the lifecycle record is
 * operational state with a TTL, and a business-visible execution record, once
 * needed, belongs to the owning module's database.
 */
@Injectable()
export class RedisJobQueue implements JobQueuePort {
  private readonly logger = new Logger(RedisJobQueue.name);
  private readonly keys: JobKeys;
  private readonly consumerName: string;

  constructor(
    private readonly connection: RedisConnectionService,
    config: AppConfigService,
  ) {
    this.keys = jobKeys(config.environment.name);
    // Unique per process, so two Workers never share a pending list.
    this.consumerName = `${config.runtime.serviceName}-${process.pid}`;
  }

  async push(envelope: JobEnvelope): Promise<void> {
    const client = await this.client();

    await client.xAdd(
      this.keys.stream,
      '*',
      { [STREAM_FIELD]: JSON.stringify(envelope) },
      { TRIM: { strategy: 'MAXLEN', strategyModifier: '~', threshold: STREAM_MAX_LENGTH } },
    );
    await this.saveState({
      ...envelope,
      status: 'queued',
      updatedAt: new Date().toISOString(),
    });
  }

  async claim(count: number, blockMs: number): Promise<readonly ClaimedJob[]> {
    const client = await this.client();
    const read = () =>
      client.xReadGroup(
        this.keys.group,
        this.consumerName,
        { key: this.keys.stream, id: '>' },
        { COUNT: count, BLOCK: blockMs },
      );

    try {
      return await this.toClaimed(await read());
    } catch (error) {
      if (!(await this.ensureGroupIfMissing(error))) {
        throw error;
      }

      // The group was just created, so read again: returning empty here would
      // make the very first claim after a cold start miss queued work.
      return await this.toClaimed(await read());
    }
  }

  async acknowledge(claimed: ClaimedJob): Promise<void> {
    const client = await this.client();

    await client.xAck(this.keys.stream, this.keys.group, claimed.streamId);
  }

  async reclaimStale(minIdleMs: number, count: number): Promise<readonly ClaimedJob[]> {
    const client = await this.client();

    const reclaim = async () => {
      const reply = await client.xAutoClaim(
        this.keys.stream,
        this.keys.group,
        this.consumerName,
        minIdleMs,
        '0',
        { COUNT: count },
      );
      const messages = reply.messages.filter((message) => message !== null);

      return this.toClaimed([{ name: this.keys.stream, messages }]);
    };

    try {
      return await reclaim();
    } catch (error) {
      if (!(await this.ensureGroupIfMissing(error))) {
        throw error;
      }

      return await reclaim();
    }
  }

  async saveState(record: JobRecord, ttlSeconds?: number): Promise<void> {
    const client = await this.client();
    const key = this.keys.state(record.jobId);
    const value = JSON.stringify(record);

    if (ttlSeconds === undefined) {
      await client.set(key, value);
      return;
    }

    await client.set(key, value, { expiration: { type: 'EX', value: ttlSeconds } });
  }

  async loadState(jobId: string): Promise<JobRecord | undefined> {
    const client = await this.client();
    const raw = await client.get(this.keys.state(jobId));

    if (typeof raw !== 'string') {
      return undefined;
    }

    return JSON.parse(raw) as JobRecord;
  }

  async scheduleRetry(record: JobRecord, delayMs: number): Promise<void> {
    await this.saveState(record);

    const client = await this.client();
    await client.zAdd(this.keys.delayed, {
      score: Date.now() + delayMs,
      value: record.jobId,
    });
  }

  async promoteDue(limit: number): Promise<number> {
    const client = await this.client();
    const due = await client.zRangeByScore(this.keys.delayed, 0, Date.now(), {
      LIMIT: { offset: 0, count: limit },
    });

    let promoted = 0;

    for (const jobId of due) {
      // Atomic claim: only the process that removes the entry promotes it, so
      // running the promoter in both the Worker and the Scheduler is safe.
      const removed = await client.zRem(this.keys.delayed, jobId);

      if (removed !== 1) {
        continue;
      }

      const record = await this.loadState(jobId);

      if (record === undefined || record.status !== 'retrying') {
        // Cancelled, already promoted, or expired; drop the stale schedule entry.
        continue;
      }

      await this.push({
        jobId: record.jobId,
        type: record.type,
        version: record.version,
        payload: record.payload,
        attempt: record.attempt + 1,
        maxAttempts: record.maxAttempts,
        correlationId: record.correlationId,
        ...(record.companyId !== undefined ? { companyId: record.companyId } : {}),
        createdAt: record.createdAt,
        enqueuedBy: 'retry',
      });
      promoted += 1;
    }

    return promoted;
  }

  private async client(): Promise<RedisClient> {
    await this.connection.ensureConnected();

    return this.connection.getClient();
  }

  private async ensureGroup(): Promise<void> {
    try {
      await (
        await this.client()
      ).xGroupCreate(this.keys.stream, this.keys.group, '0', {
        MKSTREAM: true,
      });
    } catch (error) {
      if (!isBusyGroup(error)) {
        throw error;
      }
    }
  }

  /** Creates the consumer group when Redis reports it is missing; otherwise false. */
  private async ensureGroupIfMissing(error: unknown): Promise<boolean> {
    if (!isRedisError(error, 'NOGROUP')) {
      return false;
    }

    await this.ensureGroup();

    return true;
  }

  /**
   * Turns a stream reply into envelopes. A malformed entry is acknowledged and
   * dropped instead of looping forever as a poison message.
   */
  private async toClaimed(reply: StreamReadReply): Promise<ClaimedJob[]> {
    if (reply === null || reply === undefined) {
      return [];
    }

    const claimed: ClaimedJob[] = [];
    const malformed: string[] = [];

    for (const stream of reply) {
      for (const entry of stream.messages) {
        const streamId = String(entry.id);
        const raw = readStreamField(entry.message, STREAM_FIELD);

        if (raw === undefined) {
          malformed.push(streamId);
          continue;
        }

        try {
          claimed.push({ streamId, envelope: JSON.parse(raw) as JobEnvelope });
        } catch {
          malformed.push(streamId);
        }
      }
    }

    if (malformed.length > 0) {
      this.logger.warn(`Discarding ${malformed.length} malformed job entry(ies) from the stream`);
      await (await this.client()).xAck(this.keys.stream, this.keys.group, malformed);
    }

    return claimed;
  }
}

function readStreamField(message: unknown, field: string): string | undefined {
  if (message instanceof Map) {
    const value = message.get(field);

    return typeof value === 'string' ? value : undefined;
  }

  if (typeof message === 'object' && message !== null) {
    const value = (message as Record<string, unknown>)[field];

    return typeof value === 'string' ? value : undefined;
  }

  return undefined;
}

function isBusyGroup(error: unknown): boolean {
  return isRedisError(error, 'BUSYGROUP');
}

function isRedisError(error: unknown, code: string): boolean {
  return error instanceof Error && error.message.includes(code);
}
