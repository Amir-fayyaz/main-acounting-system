import { describe, expect, it } from 'vitest';

import { ActorScope } from './actor-scope.js';

/**
 * The ambient actor scope (AUD-001).
 *
 * It pins the three properties the audit path depends on: the scope is absent
 * outside a run, it is visible for the whole asynchronous call chain of a run
 * and torn down when the run settles, and nested scopes neither leak into their
 * parent nor overwrite it.
 */
describe('actor scope', () => {
  it('is missing outside a run', () => {
    expect(ActorScope.current()).toBeUndefined();
  });

  it('provides the actor inside a run and returns the work result', () => {
    const seen = ActorScope.run('u-42', () => ActorScope.current());

    expect(seen).toEqual({ userId: 'u-42' });
    expect(ActorScope.current()).toBeUndefined();
  });

  it('restores the outer actor after a nested run', () => {
    const nested = ActorScope.run('outer', () => {
      const outer = ActorScope.current();
      const inner = ActorScope.run('inner', () => ActorScope.current());

      // The inner scope is gone once its own run returns; the outer one is intact.
      expect(ActorScope.current()).toEqual(outer);
      return inner;
    });

    expect(nested).toEqual({ userId: 'inner' });
    expect(ActorScope.current()).toBeUndefined();
  });

  it('keeps the value across async continuations inside the run', async () => {
    const observed = await ActorScope.run('u-7', async () => {
      await Promise.resolve();
      return ActorScope.current();
    });

    expect(observed).toEqual({ userId: 'u-7' });
    expect(ActorScope.current()).toBeUndefined();
  });

  it('keeps concurrent runs isolated from one another', async () => {
    const seen = await Promise.all([
      ActorScope.run('a', async () => {
        await Promise.resolve();
        return ActorScope.current()?.userId;
      }),
      ActorScope.run('b', async () => {
        await Promise.resolve();
        return ActorScope.current()?.userId;
      }),
    ]);

    expect(seen).toEqual(['a', 'b']);
    expect(ActorScope.current()).toBeUndefined();
  });
});
