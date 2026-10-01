import { describe, expect, it } from 'vitest';

import { InvalidPrimitiveError } from '../primitives/invalid-primitive-error.js';
import { Command } from './command.js';
import { DomainEvent } from './domain-event.js';
import { MessageKind } from './message-kind.js';
import type { MessageOptions } from './message-metadata.js';
import { causedBy } from './message.js';

interface FiscalYearCreatedData {
  fiscalYearCode: string;
  startDate: string;
  openedBy: { userId: string; displayName: string };
}

class FiscalYearCreated extends DomainEvent<FiscalYearCreatedData> {
  public constructor(data: FiscalYearCreatedData, options?: MessageOptions) {
    super('FiscalYearCreated', data, options);
  }
}

class CreateFiscalYear extends Command<{ code: string }> {
  public constructor(payload: { code: string }, options?: MessageOptions) {
    super('CreateFiscalYear', payload, options);
  }
}

/** An event that takes its name from the test, so the rules can be probed. */
class AnyName extends DomainEvent<undefined> {
  public constructor(name: string, options?: MessageOptions) {
    super(name, undefined, options);
  }
}

const data: FiscalYearCreatedData = {
  fiscalYearCode: '1405',
  startDate: '2026-03-21',
  openedBy: { userId: 'user-1', displayName: 'Farah' },
};

describe('a representative event', () => {
  it('records a fact that already happened', () => {
    const event = new FiscalYearCreated(data);

    expect(event.kind).toBe(MessageKind.EVENT);
    expect(event.name).toBe('FiscalYearCreated');
    expect(event.data).toEqual(data);
    expect(event.metadata.messageType).toBe('FiscalYearCreated');
    expect(event.metadata.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
  });

  it('serializes to plain data, body included', () => {
    const event = new FiscalYearCreated(data);

    expect(JSON.parse(JSON.stringify(event))).toEqual({
      kind: 'event',
      name: 'FiscalYearCreated',
      metadata: event.metadata,
      data,
    });
    expect(JSON.stringify(event)).not.toMatch(/status|route|header|http/i);
  });
});

describe('immutability', () => {
  it('freezes the event itself', () => {
    const event = new FiscalYearCreated(data);

    expect(Object.isFrozen(event)).toBe(true);
    expect(() => {
      (event as unknown as { name: string }).name = 'FiscalYearAmended';
    }).toThrow(TypeError);
    expect(() => {
      (event as unknown as { kind: string }).kind = MessageKind.COMMAND;
    }).toThrow(TypeError);
    expect(event.name).toBe('FiscalYearCreated');
  });

  it('deep-freezes the data, so a fact cannot be edited after it was recorded', () => {
    const mutable: FiscalYearCreatedData = {
      fiscalYearCode: '1405',
      startDate: '2026-03-21',
      openedBy: { userId: 'user-1', displayName: 'Farah' },
    };
    const event = new FiscalYearCreated(mutable);

    expect(Object.isFrozen(mutable)).toBe(true);
    expect(Object.isFrozen(mutable.openedBy)).toBe(true);
    expect(() => {
      mutable.openedBy.displayName = 'Nadia';
    }).toThrow(TypeError);
    expect(event.data.openedBy.displayName).toBe('Farah');
  });

  it('freezes the metadata the event was traced with', () => {
    const event = new FiscalYearCreated(data, { correlationId: 'corr-1' });

    expect(Object.isFrozen(event.metadata)).toBe(true);
    expect(() => {
      (event.metadata as unknown as { correlationId: string }).correlationId = 'other';
    }).toThrow(TypeError);
  });
});

describe('versioning', () => {
  it('defaults to the first contract version', () => {
    expect(new FiscalYearCreated(data).metadata.version).toBe(1);
  });

  it('takes an explicit version when the contract evolves', () => {
    expect(new FiscalYearCreated(data, { version: 2 }).metadata.version).toBe(2);
    expect(new FiscalYearCreated(data, { version: 9999 }).metadata.version).toBe(9999);
  });

  it.each([
    ['zero', 0],
    ['a negative version', -1],
    ['a fractional version', 1.5],
    ['a string', '2'],
  ])('rejects %s so a version is always a stated contract number', (_label, version) => {
    expect(() => new FiscalYearCreated(data, { version: version as number })).toThrow(
      InvalidPrimitiveError,
    );
  });

  it('says what went wrong', () => {
    expect(() => new FiscalYearCreated(data, { version: 1.5 })).toThrow(
      'MessageMetadata: version must be an integer but received 1.5',
    );
    expect(() => new FiscalYearCreated(data, { version: 0 })).toThrow(
      'MessageMetadata: version must be between 1 and 9999 but received 0',
    );
  });
});

describe('the fact reading of an event name', () => {
  it.each([
    'FiscalYearCreated',
    'AccountingDocumentPosted',
    'PurchaseRecorded',
    'PeriodClosed',
    'PaymentSent',
  ])('accepts %s', (name) => {
    expect(new AnyName(name).name).toBe(name);
  });

  it('refuses an intent — those are commands, not facts', () => {
    expect(() => new AnyName('CreateFiscalYear')).toThrow(
      'DomainEvent: name must be a past-tense fact',
    );
    expect(() => new AnyName('PostAccountingDocument')).toThrow(InvalidPrimitiveError);
    expect(() => new AnyName('RecordPurchase')).toThrow(InvalidPrimitiveError);
  });

  it('refuses a read — that is a query', () => {
    expect(() => new AnyName('GetPayment')).toThrow(
      'DomainEvent: name must express an imperative intent',
    );
  });
});

describe('a fact carries the context it was raised in', () => {
  it('inherits correlation, cause and tenant from the command that produced it', () => {
    const command = new CreateFiscalYear(
      { code: '1405' },
      { tenantId: 'tenant-42', correlationId: 'req-7' },
    );
    const event = new FiscalYearCreated(data, causedBy(command));

    expect(event.metadata.causationId).toBe(command.metadata.messageId);
    expect(event.metadata.correlationId).toBe('req-7');
    expect(event.metadata.tenantId).toBe('tenant-42');
    expect(event.metadata.version).toBe(1);
  });

  it('starts the correlation itself when it has no cause to inherit from', () => {
    const event = new FiscalYearCreated(data);

    expect(event.metadata).not.toHaveProperty('causationId');
    expect(event.metadata.messageId).toMatch(/^[0-9a-f-]{36}$/i);
  });
});
