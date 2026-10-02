import { describe, expect, it } from 'vitest';

import { createTenantContext } from './tenant-context.js';
import { TenantScope } from './tenant-scope.js';
import { TenantContextMissingError } from './tenant.errors.js';

/** Lets pending continuations of every pending chain interleave. */
function interleave(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 5));
}

describe('TenantScope — availability', () => {
  it('reports missing outside any established scope', async () => {
    expect(TenantScope.current()).toEqual({ state: 'missing' });
    await interleave();
    expect(TenantScope.current().state).toBe('missing');
  });

  it('refuses require() outside any scope, naming the missing state', () => {
    let caught: unknown;

    try {
      TenantScope.require();
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(TenantContextMissingError);
    expect(caught).toMatchObject({ code: 'TENANT_CONTEXT_MISSING', state: 'missing' });
  });

  it('runs system-level work without a tenant under an explicit system scope', async () => {
    const observed = await TenantScope.runAsSystem(async () => {
      await interleave();

      let refusal: unknown;
      try {
        TenantScope.require();
      } catch (error) {
        refusal = error;
      }

      return { scope: TenantScope.current(), refusal };
    });

    expect(observed.scope).toEqual({ state: 'system' });
    expect(observed.refusal).toBeInstanceOf(TenantContextMissingError);
    expect(observed.refusal).toMatchObject({ state: 'system' });
  });
});

describe('TenantScope — propagation', () => {
  it('makes the tenant available to nested awaits without passing it down', async () => {
    const tenant = createTenantContext('tenant-42', { correlationId: 'flow-9' });

    const observed = await TenantScope.run(tenant, async () => {
      await interleave();
      await interleave();

      return TenantScope.require();
    });

    expect(observed).toBe(tenant);
    expect(observed.tenantId).toBe('tenant-42');
    expect(observed.correlationId).toBe('flow-9');
  });

  it('leaves the surrounding stack untouched when the scope ends', async () => {
    const tenant = createTenantContext('tenant-42');

    await TenantScope.run(tenant, async () => {
      expect(TenantScope.current().state).toBe('available');
    });

    expect(TenantScope.current().state).toBe('missing');
  });
});

describe('TenantScope — isolation between concurrent executions', () => {
  it('keeps two scopes running side by side independent of each other', async () => {
    const track = async (): Promise<string[]> => {
      const seen: string[] = [];

      for (let round = 0; round < 4; round += 1) {
        await interleave();
        const context = TenantScope.current();
        seen.push(context.state === 'available' ? context.tenantId : context.state);
      }

      return seen;
    };

    const first = TenantScope.run(createTenantContext('tenant-a'), track);
    expect(TenantScope.current().state).toBe('missing');
    const second = TenantScope.run(createTenantContext('tenant-b'), track);

    const [firstSeen, secondSeen] = await Promise.all([first, second]);

    expect(firstSeen).toEqual(['tenant-a', 'tenant-a', 'tenant-a', 'tenant-a']);
    expect(secondSeen).toEqual(['tenant-b', 'tenant-b', 'tenant-b', 'tenant-b']);
    expect(TenantScope.current().state).toBe('missing');
  });
});

describe('TenantScope — nesting', () => {
  it('shows the inner scope inside and restores the outer one afterwards', async () => {
    const outer = createTenantContext('tenant-outer', { correlationId: 'flow-outer' });
    const inner = createTenantContext('tenant-inner');

    const observed = await TenantScope.run(outer, async () => {
      const before = TenantScope.current();
      const inside = await TenantScope.run(inner, async () => {
        await interleave();

        return TenantScope.current();
      });
      const after = TenantScope.current();

      return { before, inside, after };
    });

    expect(observed.before).toEqual(outer);
    expect(observed.inside).toEqual(inner);
    expect(observed.after).toEqual(outer);
    expect(TenantScope.current().state).toBe('missing');
  });

  it('restores the outer scope when the inner one fails', async () => {
    const outer = createTenantContext('tenant-outer');
    const inner = createTenantContext('tenant-inner');

    const observed = await TenantScope.run(outer, async () => {
      await TenantScope.run(inner, () => Promise.reject(new Error('inner failed'))).catch(
        () => undefined,
      );

      return TenantScope.current();
    });

    expect(observed).toEqual(outer);
    expect(TenantScope.current().state).toBe('missing');
  });
});
