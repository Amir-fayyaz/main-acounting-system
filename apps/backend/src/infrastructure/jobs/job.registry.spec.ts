import { describe, expect, it } from 'vitest';
import type { RegisteredJob } from './job.definition.js';
import { UnknownJobTypeError } from './job.errors.js';
import { JobRegistry } from './job.registry.js';

const alpha: RegisteredJob = { type: 'test.alpha', async execute() {} };
const beta: RegisteredJob = { type: 'test.beta', async execute() {} };

describe('JobRegistry', () => {
  it('resolves a registered job by type', () => {
    const registry = new JobRegistry([alpha, beta]);

    expect(registry.require('test.alpha')).toBe(alpha);
    expect(registry.has('test.beta')).toBe(true);
    expect(registry.types()).toEqual(['test.alpha', 'test.beta']);
  });

  it('rejects a duplicate type at registration', () => {
    expect(() => new JobRegistry([alpha, { type: 'test.alpha', async execute() {} }])).toThrow(
      'Duplicate job type registration: "test.alpha"',
    );
  });

  it('reports an unregistered type instead of returning a silent default', () => {
    const registry = new JobRegistry([alpha]);

    expect(registry.get('test.missing')).toBeUndefined();
    expect(() => registry.require('test.missing')).toThrow(UnknownJobTypeError);
  });
});
