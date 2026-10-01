import { describe, expect, it } from 'vitest';

import { InvalidPrimitiveError } from '../primitives/invalid-primitive-error.js';
import { Command } from './command.js';
import { MessageKind } from './message-kind.js';
import type { MessageOptions } from './message-metadata.js';

class CreateFiscalYear extends Command<{ code: string; startDate: string }> {
  public constructor(payload: { code: string; startDate: string }, options?: MessageOptions) {
    super('CreateFiscalYear', payload, options);
  }
}

/** A command that takes its name from the test, so the rules can be probed. */
class AnyName extends Command<undefined> {
  public constructor(name: string) {
    super(name, undefined);
  }
}

describe('a representative command', () => {
  it('states an intent with the input it needs', () => {
    const command = new CreateFiscalYear({ code: '1405', startDate: '2026-03-21' });

    expect(command.kind).toBe(MessageKind.COMMAND);
    expect(command.name).toBe('CreateFiscalYear');
    expect(command.payload).toEqual({ code: '1405', startDate: '2026-03-21' });
    expect(command.metadata.messageType).toBe('CreateFiscalYear');
    expect(command.metadata.messageId).toMatch(/^[0-9a-f-]{36}$/i);
    expect(command.metadata.version).toBe(1);
  });

  it('carries no outcome — the result belongs to the use case, not the ask', () => {
    const command = new CreateFiscalYear({ code: '1405', startDate: '2026-03-21' });

    expect(Object.keys(command)).toEqual(['kind', 'name', 'metadata', 'payload']);
    expect(JSON.parse(JSON.stringify(command))).toEqual({
      kind: 'command',
      name: 'CreateFiscalYear',
      metadata: command.metadata,
      payload: { code: '1405', startDate: '2026-03-21' },
    });
    expect(JSON.stringify(command)).not.toMatch(/status|route|header|http/i);
  });
});

describe('tenant scope', () => {
  it('carries the tenant the application resolved for the operation', () => {
    const command = new CreateFiscalYear(
      { code: '1405', startDate: '2026-03-21' },
      { tenantId: 'tenant-42' },
    );

    expect(command.metadata.tenantId).toBe('tenant-42');
  });

  it('has no tenant context when the operation is not tenant-scoped', () => {
    const command = new CreateFiscalYear({ code: '1405', startDate: '2026-03-21' });

    expect(command.metadata).not.toHaveProperty('tenantId');
  });

  it('refuses a tenant id that is not an opaque identifier', () => {
    expect(
      () =>
        new CreateFiscalYear({ code: '1405', startDate: '2026-03-21' }, { tenantId: 'tenant 42' }),
    ).toThrow(InvalidPrimitiveError);
  });
});

describe('correlation and idempotency', () => {
  it('joins the flow it was raised in', () => {
    const command = new CreateFiscalYear(
      { code: '1405', startDate: '2026-03-21' },
      { correlationId: 'req-7', causationId: 'api-call-1' },
    );

    expect(command.metadata.correlationId).toBe('req-7');
    expect(command.metadata.causationId).toBe('api-call-1');
  });

  it('accepts an explicit message id as the idempotency key', () => {
    const command = new CreateFiscalYear(
      { code: '1405', startDate: '2026-03-21' },
      { messageId: 'create-fiscal-year-1405' },
    );

    expect(command.metadata.messageId).toBe('create-fiscal-year-1405');
  });

  it('stays valid when re-raised with the same id', () => {
    const first = new CreateFiscalYear(
      { code: '1405', startDate: '2026-03-21' },
      { messageId: 'create-fiscal-year-1405' },
    );
    const second = new CreateFiscalYear(
      { code: '1405', startDate: '2026-03-21' },
      { messageId: 'create-fiscal-year-1405' },
    );

    expect(first.metadata.messageId).toBe(second.metadata.messageId);
    expect(first.name).toBe(second.name);
  });
});

describe('the intent reading of a command name', () => {
  it.each(['CreateFiscalYear', 'PostAccountingDocument', 'RecordPurchase', 'ApprovePayment'])(
    'accepts %s',
    (name) => {
      expect(new AnyName(name).name).toBe(name);
    },
  );

  it('refuses a name that reads as a query', () => {
    expect(() => new AnyName('GetFiscalYear')).toThrow(
      'Command: name must express an imperative intent',
    );
    expect(() => new AnyName('GetFiscalYear')).toThrow('that is a query name');
  });

  it('refuses a name that reads as a fact that already happened', () => {
    expect(() => new AnyName('FiscalYearCreated')).toThrow('Command: name must be imperative');
    expect(() => new AnyName('FiscalYearCreated')).toThrow('that is an event name');
  });

  it('refuses a nameless contract', () => {
    expect(() => new AnyName('   ')).toThrow('Command: name must not be blank');
  });
});
