import { describe, expect, it } from 'vitest';

import { Command } from '../messaging/command.js';
import { DomainEvent } from '../messaging/domain-event.js';
import { causedBy } from '../messaging/message.js';
import type { MessageOptions } from '../messaging/message-metadata.js';
import { Query } from '../messaging/query.js';
import { createTenantContext } from './tenant-context.js';
import { tenantScopedMessageOptions } from './tenant-message-options.js';
import { TenantScope } from './tenant-scope.js';
import { TenantContextMissingError } from './tenant.errors.js';

class PostInvoice extends Command<{ total: number }> {
  public constructor(payload: { total: number }, options?: MessageOptions) {
    super('PostInvoice', payload, options);
  }
}

class GetInvoice extends Query<{ id: string }> {
  public constructor(params: { id: string }, options?: MessageOptions) {
    super('GetInvoice', params, options);
  }
}

class InvoicePosted extends DomainEvent<{ invoiceId: string }> {
  public constructor(data: { invoiceId: string }, options?: MessageOptions) {
    super('InvoicePosted', data, options);
  }
}

describe('tenantScopedMessageOptions — stamping the ambient scope', () => {
  it('stamps the current tenant and correlation onto a Command', async () => {
    const tenant = createTenantContext('tenant-42', { correlationId: 'flow-1' });

    const command = await TenantScope.run(tenant, async () => {
      await Promise.resolve();

      return new PostInvoice({ total: 100 }, tenantScopedMessageOptions());
    });

    expect(command.metadata.tenantId).toBe('tenant-42');
    expect(command.metadata.correlationId).toBe('flow-1');
  });

  it('stamps a Query the same way', async () => {
    const tenant = createTenantContext('tenant-42');

    const query = await TenantScope.run(tenant, async () =>
      Promise.resolve(new GetInvoice({ id: 'inv-1' }, tenantScopedMessageOptions())),
    );

    expect(query.metadata.tenantId).toBe('tenant-42');
    expect(query.metadata).not.toHaveProperty('correlationId');
  });

  it('preserves the tenant identity of a Domain Event raised inside the scope', async () => {
    const tenant = createTenantContext('tenant-42', { correlationId: 'flow-1' });

    const event = await TenantScope.run(tenant, async () =>
      Promise.resolve(new InvoicePosted({ invoiceId: 'inv-1' }, tenantScopedMessageOptions())),
    );

    expect(event.metadata.tenantId).toBe('tenant-42');
    expect(event.metadata.correlationId).toBe('flow-1');
  });

  it('keeps the inherited tenant and correlation of an effect raised under the same scope', async () => {
    const tenant = createTenantContext('tenant-42', { correlationId: 'flow-1' });

    const effect = await TenantScope.run(tenant, async () => {
      const cause = new PostInvoice({ total: 100 }, tenantScopedMessageOptions());

      await Promise.resolve();

      return {
        causeId: cause.metadata.messageId,
        message: new InvoicePosted(
          { invoiceId: 'inv-1' },
          tenantScopedMessageOptions(causedBy(cause)),
        ),
      };
    });

    expect(effect.message.metadata.tenantId).toBe('tenant-42');
    expect(effect.message.metadata.correlationId).toBe('flow-1');
    expect(effect.message.metadata.causationId).toBe(effect.causeId);
  });
});

describe('tenantScopedMessageOptions — refusal', () => {
  it('refuses to raise a tenant-scoped message outside any scope', () => {
    let caught: unknown;

    try {
      tenantScopedMessageOptions();
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(TenantContextMissingError);
    expect(caught).toMatchObject({ code: 'TENANT_CONTEXT_MISSING', state: 'missing' });
  });

  it('refuses under an explicit system scope', async () => {
    let caught: unknown;

    await TenantScope.runAsSystem(async () => {
      try {
        tenantScopedMessageOptions();
      } catch (error) {
        caught = error;
      }
    });

    expect(caught).toBeInstanceOf(TenantContextMissingError);
    expect(caught).toMatchObject({ state: 'system' });
  });
});

describe('tenantScopedMessageOptions — precedence', () => {
  it('lets an explicit tenant and correlation win over a different ambient scope', async () => {
    const tenant = createTenantContext('tenant-42', { correlationId: 'flow-1' });

    const command = await TenantScope.run(tenant, async () =>
      Promise.resolve(
        new PostInvoice(
          { total: 100 },
          tenantScopedMessageOptions({ tenantId: 'tenant-66', correlationId: 'flow-2' }),
        ),
      ),
    );

    expect(command.metadata.tenantId).toBe('tenant-66');
    expect(command.metadata.correlationId).toBe('flow-2');
  });

  it('inherits the cause tenant even when no ambient scope is available', () => {
    const cause = new PostInvoice({ total: 100 }, { tenantId: 'tenant-66' });
    const event = new InvoicePosted(
      { invoiceId: 'inv-1' },
      tenantScopedMessageOptions(causedBy(cause)),
    );

    expect(event.metadata.tenantId).toBe('tenant-66');
    expect(event.metadata.correlationId).toBe(cause.metadata.messageId);
  });
});
