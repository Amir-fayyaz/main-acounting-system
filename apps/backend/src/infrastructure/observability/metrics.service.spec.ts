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
});
