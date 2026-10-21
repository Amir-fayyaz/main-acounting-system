import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { LineStream, PROCESS_COLORS, redactSecrets, terminateProcessTree } from './processes.mjs';

describe('prefixLine helper via LineStream consumers', () => {
  it('each process has a distinguishable color and label', () => {
    assert.ok(PROCESS_COLORS.api.length > 0);
    assert.ok(PROCESS_COLORS.worker.length > 0);
    assert.ok(PROCESS_COLORS.scheduler.length > 0);
    assert.notEqual(PROCESS_COLORS.api, PROCESS_COLORS.worker);
    assert.notEqual(PROCESS_COLORS.worker, PROCESS_COLORS.scheduler);
  });
});

describe('LineStream', () => {
  it('emits complete lines and keeps the trailing fragment for the next chunk', () => {
    const lines = [];
    const stream = new LineStream((line) => lines.push(line));
    stream.push('one\ntwo\nthr');
    assert.deepEqual(lines, ['one', 'two']);
    stream.push('ee\nfour\r\nfive');
    assert.deepEqual(lines, ['one', 'two', 'three', 'four']);
    stream.flush();
    assert.deepEqual(lines, ['one', 'two', 'three', 'four', 'five']);
  });

  it('emits nothing when there is no complete line yet', () => {
    const lines = [];
    const stream = new LineStream((line) => lines.push(line));
    stream.push('partial');
    stream.push(' still partial');
    assert.deepEqual(lines, []);
    stream.flush();
    assert.deepEqual(lines, ['partial still partial']);
  });
});

describe('redactSecrets', () => {
  it('replaces every secret occurrence and ignores empties', () => {
    assert.equal(
      redactSecrets('password=super-secret password=super-secret user=accounting', [
        'super-secret',
        '',
      ]),
      'password=*** password=*** user=accounting',
    );
  });

  it('leaves text without secrets untouched', () => {
    assert.equal(redactSecrets('nothing to hide', []), 'nothing to hide');
  });
});

describe('terminateProcessTree', () => {
  it('is a no-op for missing or already-exited children', () => {
    terminateProcessTree(null);
    terminateProcessTree({ pid: 4242, exitCode: 0, killed: false });
    terminateProcessTree({ pid: 4242, exitCode: null, killed: true });
  });
});
