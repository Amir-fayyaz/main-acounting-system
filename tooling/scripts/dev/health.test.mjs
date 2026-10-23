import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { ReadyTimeoutError, buildReadyUrl, normalizeApiPrefix, waitForReady } from './health.mjs';

const now = () => Date.now();
const noDelay = async () => {};

describe('normalizeApiPrefix / buildReadyUrl', () => {
  it('builds the readiness URL from port and prefix (BACKEND_API_PREFIX respected)', () => {
    assert.equal(
      buildReadyUrl({ port: 3000, prefix: '/api' }),
      'http://localhost:3000/api/health/ready',
    );
    assert.equal(
      buildReadyUrl({ port: 3000, prefix: 'api' }),
      'http://localhost:3000/api/health/ready',
    );
    assert.equal(
      buildReadyUrl({ port: 3000, prefix: '/api/' }),
      'http://localhost:3000/api/health/ready',
    );
    assert.equal(buildReadyUrl({ port: 3000, prefix: '' }), 'http://localhost:3000/health/ready');
    assert.equal(
      buildReadyUrl({ port: 3000, prefix: '/api', host: '127.0.0.1' }),
      'http://127.0.0.1:3000/api/health/ready',
    );
    assert.equal(normalizeApiPrefix(undefined), '/api');
  });
});

describe('waitForReady', () => {
  it('resolves on a 2xx response', async () => {
    const url = 'http://localhost:3000/api/health/ready';
    const response = await waitForReady(url, {
      fetchImpl: async () => ({ ok: true, status: 200 }),
      delayFn: noDelay,
    });
    assert.equal(response.ok, true);
  });

  it('retries failed fetches and non-2xx responses until success', async () => {
    let attempts = 0;
    const url = 'http://localhost:3000/api/health/ready';
    const fetchImpl = async () => {
      attempts += 1;
      if (attempts < 3) throw new TypeError('connection refused');
      return { ok: attempts === 3, status: 503 };
    };
    await waitForReady(url, { fetchImpl, delayFn: noDelay, timeoutMs: 10_000 });
    assert.equal(attempts, 3);
  });

  it('times out naming the URL and the timeout', async () => {
    const url = 'http://localhost:3000/api/health/ready';
    const start = now();
    await assert.rejects(
      waitForReady(url, {
        fetchImpl: async () => ({ ok: false, status: 503 }),
        delayFn: noDelay,
        timeoutMs: 1_000,
      }),
      (error) => {
        assert.equal(error instanceof ReadyTimeoutError, true);
        assert.match(error.message, /Timed out after 1s/);
        assert.equal(error.url, url);
        assert.ok(now() - start >= 0);
        return true;
      },
    );
  });
});
