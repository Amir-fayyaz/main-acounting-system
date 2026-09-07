import type { HealthIndicator } from '@shared/application';
import { HealthService } from './health.service';

const PACKAGE = { name: 'accounting-saas-backend', version: '9.9.9' };

const healthy: HealthIndicator = {
  name: 'healthy',
  check: () => Promise.resolve({ name: 'healthy', status: 'ok', latencyMs: 1 }),
};

const failing: HealthIndicator = {
  name: 'failing',
  check: () =>
    Promise.resolve({
      name: 'failing',
      status: 'error',
      latencyMs: 2,
      message: 'connection refused',
    }),
};

const throwing: HealthIndicator = {
  name: 'throwing',
  check: () => Promise.reject(new Error('boom')),
};

describe('HealthService', () => {
  it('reports ok when every indicator passes', async () => {
    const service = new HealthService([healthy], PACKAGE);

    const report = await service.checkAll();

    expect(report.status).toBe('ok');
    expect(report.checks).toHaveLength(1);
    expect(report.version).toBe('9.9.9');
    expect(report.uptimeSeconds).toBeGreaterThanOrEqual(0);
    expect(Number.isNaN(Date.parse(report.timestamp))).toBe(false);
  });

  it('reports error when any indicator fails and keeps the passing checks', async () => {
    const service = new HealthService([healthy, failing], PACKAGE);

    const report = await service.checkAll();

    expect(report.status).toBe('error');
    expect(report.checks.map((check) => check.name)).toEqual(['healthy', 'failing']);
    expect(report.checks[1]?.status).toBe('error');
  });

  it('turns an unexpected exception into an error check', async () => {
    const service = new HealthService([throwing], PACKAGE);

    const report = await service.checkAll();

    expect(report.status).toBe('error');
    expect(report.checks[0]).toEqual(
      expect.objectContaining({ name: 'throwing', status: 'error', message: 'boom' }),
    );
  });
});
