import { describe, expect, it } from 'vitest';

import { LogContext } from './log-context.js';

describe('LogContext (FND-011)', () => {
  it('is undefined outside any scope', () => {
    expect(LogContext.current()).toBeUndefined();
  });

  it('propagates across awaits inside the scope', async () => {
    const seen: Array<string | undefined> = [];

    await LogContext.run({ correlationId: 'abc-123', service: 'backend' }, async () => {
      seen.push(LogContext.current()?.correlationId);
      await new Promise((resolve) => setTimeout(resolve, 0));
      seen.push(LogContext.current()?.correlationId);
    });

    expect(seen).toEqual(['abc-123', 'abc-123']);
  });

  it('isolates two concurrent executions', async () => {
    const seen: Array<string | undefined> = [];

    async function request(id: string, delayMs: number): Promise<void> {
      await LogContext.run({ correlationId: id }, async () => {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        seen.push(LogContext.current()?.correlationId);
      });
    }

    await Promise.all([request('first', 10), request('second', 0)]);

    expect(seen).toEqual(['second', 'first']);
  });

  it('restores the caller scope when the work settles', async () => {
    await LogContext.run({ correlationId: 'outer' }, async () => {
      await LogContext.run({ correlationId: 'inner' }, async () => {
        expect(LogContext.current()?.correlationId).toBe('inner');
      });

      expect(LogContext.current()?.correlationId).toBe('outer');
    });

    expect(LogContext.current()).toBeUndefined();
  });

  it('keeps the outer service when an inner scope only sets the correlation id', async () => {
    await LogContext.run({ service: 'backend' }, async () => {
      await LogContext.run({ correlationId: 'abc' }, async () => {
        expect(LogContext.current()).toEqual({ service: 'backend', correlationId: 'abc' });
      });
    });
  });
});
