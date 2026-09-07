import { ProcessHealthIndicator } from './process.health-indicator';

describe('ProcessHealthIndicator', () => {
  it('reports ok with runtime details while the process is alive', async () => {
    const indicator = new ProcessHealthIndicator();

    const result = await indicator.check();

    expect(result.status).toBe('ok');
    expect(result.name).toBe('process');
    expect(result.latencyMs).toBeGreaterThanOrEqual(0);
    expect(result.details).toEqual(
      expect.objectContaining({
        uptimeSeconds: expect.any(Number),
        pid: expect.any(Number),
        nodeVersion: expect.stringMatching(/^v\d+\./),
        rssBytes: expect.any(Number),
        heapUsedBytes: expect.any(Number),
      }),
    );
  });
});
