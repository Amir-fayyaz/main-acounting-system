import { Inject, Injectable, Optional } from '@nestjs/common';
import { Gauge, Histogram, Registry, collectDefaultMetrics } from 'prom-client';
import { MYSQL_CONNECTION_POOL } from '../database/database.tokens.js';
import type { JobExecutionStatus } from '../jobs/job-metrics.js';

/**
 * The shape `prom-client` reads the connection accounting from.
 *
 * `mysql2`'s promise API wraps the callback-API pool, and the accounting
 * (`_allConnections`, `_freeConnections`, `_connectionQueue`) lives on the
 * wrapper. These are internal, so every read is defensive: a future driver
 * that drops or renames a field degrades the gauge to `0` instead of breaking
 * the scrape.
 */
interface InternalMysqlPool {
  readonly _allConnections?: { readonly length: number };
  readonly _freeConnections?: { readonly length: number };
  readonly _connectionQueue?: { readonly length: number };
}

interface DatabasePoolStats {
  readonly active: number;
  readonly idle: number;
  readonly waiting: number;
}

const ZERO_POOL_STATS: DatabasePoolStats = { active: 0, idle: 0, waiting: 0 };

/** The supported callback for the `job_queue_depth` gauge. */
export type QueueDepthProvider = () => Promise<number>;

/**
 * The process metrics layer (FND-014, 10-observability).
 *
 * One `Registry` per process holds everything `/api/metrics` serves:
 *
 * - the standard Node.js process metrics (memory, event loop lag, handles),
 *   collected by `prom-client`'s default collector;
 * - `http_request_duration_seconds`, a histogram labelled by `method`,
 *   `route` (the matched route pattern, never the raw URL, so the label
 *   cardinality stays bounded by the number of endpoints) and `status_code`;
 * - `job_execution_duration_seconds`, labelled by `job_name` (the registered
 *   job type) and `status` (`success` / `failure`), recorded by the
 *   `JobDispatcher`;
 * - `job_queue_depth`, the number of envelopes waiting in the stream, sourced
 *   from the queue port through a provider registered at module init
 *   (`JobQueueDepthBinder`) so the metrics layer never depends on the queue;
 * - `database_pool_connections`, the MySQL pool state (`active`, `idle`,
 *   `waiting`), read defensively from the pool accounting at scrape time.
 *
 * The service also *is* the `JobMetrics` port: the jobs infrastructure binds
 * its `JOB_METRICS` token to this class, so the dispatcher records through the
 * same contract without importing the Prometheus types.
 *
 * Collectors never throw: a failing probe is reported as `0` rather than
 * failing the whole scrape, because a broken metric must not hide the healthy
 * ones.
 */
@Injectable()
export class MetricsService {
  readonly registry = new Registry();

  private readonly httpRequestDuration: Histogram<string>;
  private readonly jobExecutionDuration: Histogram<string>;
  private readonly jobQueueDepth: Gauge<string>;
  private readonly databasePoolConnections: Gauge<string>;
  private queueDepthProvider?: QueueDepthProvider;

  constructor(@Optional() @Inject(MYSQL_CONNECTION_POOL) private readonly pool?: unknown) {
    collectDefaultMetrics({ register: this.registry });

    this.httpRequestDuration = new Histogram({
      name: 'http_request_duration_seconds',
      help: 'HTTP request duration, by method, matched route pattern and status code.',
      labelNames: ['method', 'route', 'status_code'],
      buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
      registers: [this.registry],
    });

    this.jobExecutionDuration = new Histogram({
      name: 'job_execution_duration_seconds',
      help: 'Background job execution duration, by registered job type and outcome.',
      labelNames: ['job_name', 'status'],
      buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10, 30, 60],
      registers: [this.registry],
    });

    this.jobQueueDepth = new Gauge({
      name: 'job_queue_depth',
      help: 'Job envelopes currently waiting in the queue stream.',
      registers: [this.registry],
      collect: async () => {
        const provider = this.queueDepthProvider;

        if (provider === undefined) {
          return;
        }

        try {
          this.jobQueueDepth.set(await provider());
        } catch {
          // The queue is unreachable; the gauge keeps its last value (0)
          // rather than failing the scrape and hiding every other metric.
        }
      },
    });

    this.databasePoolConnections = new Gauge({
      name: 'database_pool_connections',
      help: 'MySQL connection pool state: in-use, free and queued-waiting requests.',
      labelNames: ['state'],
      registers: [this.registry],
      collect: async () => {
        const stats = this.readPoolStats();

        this.databasePoolConnections.set({ state: 'active' }, stats.active);
        this.databasePoolConnections.set({ state: 'idle' }, stats.idle);
        this.databasePoolConnections.set({ state: 'waiting' }, stats.waiting);
      },
    });
  }

  /** The content type the exposition format requires (e.g. for `Content-Type`). */
  get contentType(): string {
    return this.registry.contentType;
  }

  /** The full Prometheus text exposition served by the `/api/metrics` endpoint. */
  async expose(): Promise<string> {
    return await this.registry.metrics();
  }

  /** Records one finished HTTP request. */
  observeHttpRequest(
    method: string,
    route: string,
    statusCode: number,
    durationSeconds: number,
  ): void {
    this.httpRequestDuration
      .labels(method, route, String(statusCode))
      .observe(Math.max(durationSeconds, 0));
  }

  /** Records one finished job execution (`success` or `failure`). */
  observeJobExecution(jobName: string, status: JobExecutionStatus, durationSeconds: number): void {
    this.jobExecutionDuration.labels(jobName, status).observe(Math.max(durationSeconds, 0));
  }

  /**
   * Registers where the queue depth gauge reads from. Called by the jobs
   * infrastructure at module init; without a provider the gauge reports no
   * sample instead of a lie.
   */
  setQueueDepthProvider(provider: QueueDepthProvider): void {
    this.queueDepthProvider = provider;
  }

  private readPoolStats(): DatabasePoolStats {
    if (this.pool === undefined || this.pool === null) {
      return ZERO_POOL_STATS;
    }

    // The promise-API pool wraps the callback-API pool that owns the accounting.
    const internal = (this.pool as { pool?: InternalMysqlPool }).pool;
    const total = internal?._allConnections?.length ?? 0;
    const idle = internal?._freeConnections?.length ?? 0;
    const waiting = internal?._connectionQueue?.length ?? 0;

    return { active: Math.max(total - idle, 0), idle, waiting };
  }
}
