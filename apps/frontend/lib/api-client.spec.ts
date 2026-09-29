import { fetchBackendReadiness } from './api-client';

describe('fetchBackendReadiness', () => {
  const originalFetch = globalThis.fetch;
  const fetchMock = jest.fn();

  beforeEach(() => {
    globalThis.fetch = fetchMock as unknown as typeof fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('parses a not-ready report returned with a 503 status', async () => {
    const report = {
      status: 'not-ready',
      checks: [{ name: 'redis', status: 'down', latencyMs: 3001, reason: 'timeout' }],
    };
    fetchMock.mockResolvedValue({ json: async () => report });

    const status = await fetchBackendReadiness();

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/health/ready'),
      expect.objectContaining({ cache: 'no-store' }),
    );
    expect(status).toEqual({ reachable: true, report });
  });

  it('reports an unreachable backend explicitly instead of throwing', async () => {
    fetchMock.mockRejectedValue(new Error('fetch failed'));

    const status = await fetchBackendReadiness();

    expect(status).toEqual({ reachable: false, error: 'fetch failed' });
  });
});
