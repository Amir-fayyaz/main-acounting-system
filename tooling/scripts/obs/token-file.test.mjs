/**
 * Token-file rendering (FND-017) — unit tests.
 *
 * The functions are pure (fs injectable) so these run with no filesystem and
 * no Docker; the assertions cover the rules `pnpm obs:up` relies on: a missing
 * token is refused without echoing values, the file gets restrictive
 * permissions, and its contents are only the token.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { requireMetricsToken, renderTokenFile, TOKEN_FILE_PATH } from './token-file.mjs';

/** A recording fake of the fs functions `renderTokenFile` touches. */
function fakeFs() {
  const calls = { mkdir: [], written: [], chmod: [] };

  return {
    calls,
    mkdirSync: (path, options) => calls.mkdir.push({ path, options }),
    writeFileSync: (path, data, options) => calls.written.push({ path, data, options }),
    chmodSync: (path, mode) => calls.chmod.push({ path, mode }),
  };
}

describe('requireMetricsToken', () => {
  it('returns the trimmed token when present', () => {
    assert.equal(requireMetricsToken({ METRICS_TOKEN: '  scrape-token  ' }), 'scrape-token');
  });

  it('refuses a missing or empty token without echoing anything', () => {
    assert.throws(
      () => requireMetricsToken({}, '.env'),
      (error) => error.message.includes('METRICS_TOKEN is missing or empty') &&
        error.message.includes('.env'),
    );
    assert.throws(() => requireMetricsToken({ METRICS_TOKEN: '   ' }));
  });
});

describe('renderTokenFile', () => {
  it('creates the parent directory and writes restrictive, token-only contents', () => {
    const fs = fakeFs();

    renderTokenFile(fs, 'infrastructure/observability/runtime/metrics_token', 'scrape-token');

    assert.deepEqual(fs.calls.mkdir, [
      { path: 'infrastructure/observability/runtime', options: { recursive: true } },
    ]);
    assert.deepEqual(fs.calls.written, [
      {
        path: 'infrastructure/observability/runtime/metrics_token',
        // Only the token — no comment, no key name, no echo of anything else.
        data: 'scrape-token\n',
        options: { encoding: 'utf8', mode: 0o600 },
      },
    ]);
    assert.deepEqual(fs.calls.chmod, [
      { path: 'infrastructure/observability/runtime/metrics_token', mode: 0o600 },
    ]);
  });

  it('survives a chmod failure (Windows has no POSIX permissions)', () => {
    const fs = fakeFs();

    fs.chmodSync = () => {
      throw new Error('chmod not supported');
    };

    renderTokenFile(fs, TOKEN_FILE_PATH, 'scrape-token');

    assert.equal(fs.calls.written.length, 1);
  });
});
