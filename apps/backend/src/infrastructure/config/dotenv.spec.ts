import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { loadDotEnvFiles, mergeEnvironmentValues, readEnvFile } from './dotenv.js';

describe('readEnvFile', () => {
  let directory: string;

  beforeEach(() => {
    directory = mkdtempSync(join(tmpdir(), 'env-file-'));
  });

  afterEach(() => {
    rmSync(directory, { recursive: true, force: true });
  });

  it('parses KEY=VALUE pairs', () => {
    const path = join(directory, '.env');
    writeFileSync(path, 'BACKEND_PORT=3001\nLOG_LEVEL=debug\n');

    expect(readEnvFile(path)).toEqual({ BACKEND_PORT: '3001', LOG_LEVEL: 'debug' });
  });

  it('contributes nothing when the file does not exist', () => {
    expect(readEnvFile(join(directory, 'missing.env'))).toEqual({});
  });
});

describe('mergeEnvironmentValues', () => {
  it('lets a later source win over an earlier one', () => {
    const target: Record<string, string | undefined> = {};

    mergeEnvironmentValues([{ BACKEND_PORT: '3000' }, { BACKEND_PORT: '3001' }], target);

    expect(target.BACKEND_PORT).toBe('3001');
  });

  it('never overwrites a value the process already holds', () => {
    const target: Record<string, string | undefined> = { BACKEND_PORT: '9999' };

    mergeEnvironmentValues([{ BACKEND_PORT: '3000' }], target);

    expect(target.BACKEND_PORT).toBe('9999');
  });
});

describe('loadDotEnvFiles', () => {
  it('is idempotent so the process entry point and the module can both call it', () => {
    const target: Record<string, string | undefined> = { BACKEND_PORT: '3000' };

    loadDotEnvFiles(target);
    const afterFirstCall = { ...target };
    loadDotEnvFiles(target);

    expect(target).toEqual(afterFirstCall);
  });
});
