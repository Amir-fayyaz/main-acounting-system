import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  PreflightError,
  parseVersionFromOutput,
  probeNodeVersion,
  runPreflight,
  versionAtLeast,
} from './preflight.mjs';

describe('versionAtLeast', () => {
  it('compares semver with and without the v prefix', () => {
    assert.equal(versionAtLeast('v22.11.0', '22.0.0'), true);
    assert.equal(versionAtLeast('v22.0.0', '22.0.0'), true);
    assert.equal(versionAtLeast('21.9.0', '22.0.0'), false);
    assert.equal(versionAtLeast('23.0.0', '22.11.0'), true);
    assert.equal(versionAtLeast('v10.5.1', '10.0.0'), true);
  });
});

describe('parseVersionFromOutput', () => {
  it('finds the version inside tool output', () => {
    assert.equal(parseVersionFromOutput('12.10.1\n'), '12.10.1');
    assert.throws(() => parseVersionFromOutput('no version here'));
  });
});

describe('probeNodeVersion', () => {
  it('passes on 22+ and fails older versions with an actionable message', async () => {
    await probeNodeVersion({ nodeVersion: 'v22.11.0', required: '22.0.0' });
    await assert.rejects(
      probeNodeVersion({ nodeVersion: 'v20.10.0', required: '22.0.0' }),
      /Node\.js 22\.0\.0 or newer is required \(found v20\.10\.0\)/,
    );
  });
});

describe('runPreflight', () => {
  it('runs steps in order and reports the passed ids', async () => {
    const order = [];
    const passed = await runPreflight([
      { id: 'a', run: async () => order.push('a') },
      { id: 'b', run: async () => order.push('b') },
      { id: 'c', run: async () => order.push('c') },
    ]);
    assert.deepEqual(order, ['a', 'b', 'c']);
    assert.deepEqual(passed, ['a', 'b', 'c']);
  });

  it('fails fast: stops at the first failing step and prepromise steps never run', async () => {
    const executed = [];
    await assert.rejects(
      runPreflight([
        { id: 'docker-daemon', run: async () => executed.push('docker-daemon') },
        {
          id: 'ports',
          run: async () => {
            executed.push('ports');
            throw new Error('Port 3306 (MYSQL_PORT) is already in use by another process.');
          },
        },
        { id: 'never-runs', run: async () => executed.push('never-runs') },
      ]),
      (error) =>
        error instanceof PreflightError &&
        error.stepId === 'ports' &&
        /Port 3306/.test(error.message),
    );
    assert.deepEqual(executed, ['docker-daemon', 'ports']);
  });
});
