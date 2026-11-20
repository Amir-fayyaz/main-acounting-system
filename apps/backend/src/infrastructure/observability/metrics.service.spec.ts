import { describe, expect, it } from 'vitest';
import { MetricsService } from './metrics.service.js';

async function exposition(service: MetricsService): Promise<string> {
  return await service.expose();
}

describe('MetricsService', () => {
  it('exports the standard Node.js process metrics automatically', async () => {
    const service = new MetricsService();
    const output = await exposition(service);

    expect(output).toMatch(/^nodejs_[a-z_]+ /m);
    expect(output).toMatch(/^process_[a-z_]+ /m);
  });

  it('observes job executions as histogram samples by name and status', async () => {
    const service = new MetricsService();

    service.observeExecution('sample.echo', 'success', 0.2);
    service.observeExecution('sample.echo', 'failure', 0.5);

    const output = await exposition(service);

    expect(output).toContain(
      'job_execution_duration_seconds_count{job_name="sample.echo",status="success"} 1',
    );
    expect(output).toContain(
      'job_execution_duration_seconds_count{job_name="sample.echo",status="failure"} 1',
    );
    // Bucket boundaries are respected: 0.5 falls into the 0.5 bucket.
    expect(output).toContain(
      'job_execution_duration_seconds_bucket{le="0.5",job_name="sample.echo",status="failure"} 1',
    );
  });

  it('reports the queue depth through the registered provider at scrape time', async () => {
    const service = new MetricsService();
    let depth = 4;
    service.setQueueDepthProvider(async () => depth);

    const before = await exposition(service);
    expect(before).toContain('job_queue_depth 4');

    depth = 9;
    const after = await exposition(service);
    expect(after).toContain('job_queue_depth 9');
  });

  it('reports zero queue depth when no provider is bound', async () => {
    const service = new MetricsService();
    const output = await exposition(service);

    // prom-client always exposes the gauge; without a provider it reads 0,
    // which "empty or unknown" is indistinguishable from — acceptable for a
    // process that owns no queue.
    expect(output).toContain('job_queue_depth 0');
  });

  it('reports outbox pending events through the registered provider at scrape time (FND-017)', async () => {
    const service = new MetricsService();
    let pending = 2;
    service.setOutboxPendingProvider(async () => pending);

    const before = await exposition(service);
    expect(before).toContain('outbox_pending_events 2');

    pending = 7;
    const after = await exposition(service);
    expect(after).toContain('outbox_pending_events 7');
  });

  it('reports zero outbox pending events when no provider is bound, and keeps the last value on a failing read', async () => {
    const service = new MetricsService();
    service.setOutboxPendingProvider(async () => 5);

    expect(await exposition(service)).toContain('outbox_pending_events 5');

    // The store goes unreachable mid-flight: the scrape must survive and keep
    // the last value rather than throwing or hanging (same trade as the
    // queue gauge).
    service.setOutboxPendingProvider(() => Promise.reject(new Error('mysql down')));
    expect(await exposition(service)).toContain('outbox_pending_events 5');

    const bare = new MetricsService();
    expect(await exposition(bare)).toContain('outbox_pending_events 0');
  });

  it('reports the database pool state from the connection accounting', async () => {
    const service = new MetricsService({
      pool: {
        _allConnections: { length: 4 },
        _freeConnections: { length: 1 },
        _connectionQueue: { length: 3 },
      },
    });
    const output = await exposition(service);

    expect(output).toContain('database_pool_connections{state="active"} 3');
    expect(output).toContain('database_pool_connections{state="idle"} 1');
    expect(output).toContain('database_pool_connections{state="waiting"} 3');
  });

  it('degrades pool gauges to zero when the pool is unavailable', async () => {
    const service = new MetricsService();
    const output = await exposition(service);

    expect(output).toContain('database_pool_connections{state="active"} 0');
    expect(output).toContain('database_pool_connections{state="waiting"} 0');
  });

  it('never fails the scrape when the queue depth provider throws', async () => {
    const service = new MetricsService();
    service.setQueueDepthProvider(async () => {
      throw new Error('redis is down');
    });

    const output = await exposition(service);

    // The scrape survives; the gauge keeps its last value (0) instead of
    // failing the exposition and hiding every other metric with it.
    expect(output).toContain('job_queue_depth 0');
  });

  it('does not hang the scrape when the queue depth provider never settles', async () => {
    // A Redis client stuck reconnecting neither answers nor rejects; the
    // scrape must still come back, at the cost of the read budget alone.
    const service = new MetricsService(undefined, 20);
    service.setQueueDepthProvider(() => new Promise<number>(() => undefined));

    const output = await exposition(service);

    expect(output).toContain('job_queue_depth 0');
  });
});
