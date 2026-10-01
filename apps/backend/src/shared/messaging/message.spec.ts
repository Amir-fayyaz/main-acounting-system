import { describe, expect, it } from 'vitest';

import { Command } from './command.js';
import { DomainEvent } from './domain-event.js';
import { MessageKind } from './message-kind.js';
import type { MessageOptions } from './message-metadata.js';
import { Query } from './query.js';
import { Message, causedBy } from './message.js';

interface PostingPayload {
  documentId: string;
  lines: Array<{ account: string; qty: number }>;
}

class PostAccountingDocument extends Command<PostingPayload> {
  public constructor(payload: PostingPayload, options?: MessageOptions) {
    super('PostAccountingDocument', payload, options);
  }
}

class GetAccountingDocument extends Query<{ documentId: string }> {
  public constructor(params: { documentId: string }, options?: MessageOptions) {
    super('GetAccountingDocument', params, options);
  }
}

class AccountingDocumentPosted extends DomainEvent<{ documentId: string }> {
  public constructor(data: { documentId: string }, options?: MessageOptions) {
    super('AccountingDocumentPosted', data, options);
  }
}

const payload: PostingPayload = { documentId: 'doc-1', lines: [{ account: '1101', qty: 2 }] };

describe('one envelope for the three kinds', () => {
  it('is a Message with a distinct kind, a stable name and its metadata', () => {
    const command = new PostAccountingDocument(payload);
    const query = new GetAccountingDocument({ documentId: 'doc-1' });
    const event = new AccountingDocumentPosted({ documentId: 'doc-1' });

    expect(command).toBeInstanceOf(Message);
    expect(query).toBeInstanceOf(Message);
    expect(event).toBeInstanceOf(Message);

    expect(command.kind).toBe(MessageKind.COMMAND);
    expect(query.kind).toBe(MessageKind.QUERY);
    expect(event.kind).toBe(MessageKind.EVENT);

    expect(command.name).toBe('PostAccountingDocument');
    expect(query.name).toBe('GetAccountingDocument');
    expect(event.name).toBe('AccountingDocumentPosted');

    expect(command.metadata.messageType).toBe(command.name);
    expect(query.metadata.messageType).toBe(query.name);
    expect(event.metadata.messageType).toBe(event.name);
  });

  it('holds nothing beyond kind, name, metadata and the body of its kind', () => {
    expect(Object.keys(new PostAccountingDocument(payload))).toEqual([
      'kind',
      'name',
      'metadata',
      'payload',
    ]);
    expect(Object.keys(new GetAccountingDocument({ documentId: 'doc-1' }))).toEqual([
      'kind',
      'name',
      'metadata',
      'params',
    ]);
    expect(Object.keys(new AccountingDocumentPosted({ documentId: 'doc-1' }))).toEqual([
      'kind',
      'name',
      'metadata',
      'data',
    ]);
  });

  it('gives each kind the word its own vocabulary uses for the body', () => {
    expect(new PostAccountingDocument(payload).payload).toEqual(payload);
    expect(new GetAccountingDocument({ documentId: 'doc-1' }).params).toEqual({
      documentId: 'doc-1',
    });
    expect(new AccountingDocumentPosted({ documentId: 'doc-1' }).data).toEqual({
      documentId: 'doc-1',
    });
  });

  it('serializes to plain data, body included', () => {
    const command = new PostAccountingDocument(payload);

    expect(JSON.parse(JSON.stringify(command))).toEqual({
      kind: 'command',
      name: 'PostAccountingDocument',
      metadata: command.metadata,
      payload,
    });
  });
});

describe('a message is a value snapshot', () => {
  it('is frozen, so nothing about it can be rewritten after it was raised', () => {
    const command = new PostAccountingDocument(payload);

    expect(Object.isFrozen(command)).toBe(true);
    expect(() => {
      (command as unknown as { name: string }).name = 'Renamed';
    }).toThrow(TypeError);
    expect(command.name).toBe('PostAccountingDocument');
  });

  it('freezes the body deeply, so a shared reference cannot change the outcome', () => {
    const body: PostingPayload = { documentId: 'doc-1', lines: [{ account: '1101', qty: 2 }] };
    const command = new PostAccountingDocument(body);

    expect(Object.isFrozen(body)).toBe(true);
    expect(Object.isFrozen(body.lines)).toBe(true);
    expect(Object.isFrozen(body.lines[0])).toBe(true);
    expect(() => {
      body.lines[0].qty = 3;
    }).toThrow(TypeError);
    expect(() => {
      (body as { documentId: string }).documentId = 'doc-2';
    }).toThrow(TypeError);
    expect(command.payload.lines[0].qty).toBe(2);
  });

  it('terminates on a self-referencing body instead of hanging', () => {
    const cyclic: Record<string, unknown> = { documentId: 'doc-1' };
    cyclic.self = cyclic;

    const command = new PostAccountingDocument(cyclic as unknown as PostingPayload);

    expect(Object.isFrozen(cyclic)).toBe(true);
    expect(Object.isFrozen(cyclic.self)).toBe(true);
    expect(command.payload).toBe(cyclic);
  });
});

describe('causedBy links an effect to its cause', () => {
  it('carries the cause id, the correlation of the flow and the tenant', () => {
    const command = new PostAccountingDocument(payload, {
      correlationId: 'corr-1',
      tenantId: 'tenant-42',
    });
    const options = causedBy(command);

    expect(options.causationId).toBe(command.metadata.messageId);
    expect(options.correlationId).toBe('corr-1');
    expect(options.tenantId).toBe('tenant-42');
    expect(options.messageId).toBeUndefined();
    expect(options.timestamp).toBeUndefined();
  });

  it('starts a correlation at the first message that has none', () => {
    const command = new PostAccountingDocument(payload);
    const options = causedBy(command);

    expect(options.correlationId).toBe(command.metadata.messageId);
    expect(options.causationId).toBe(command.metadata.messageId);
    expect(options.tenantId).toBeUndefined();
  });

  it('lets an override win over anything inherited', () => {
    const command = new PostAccountingDocument(payload, {
      correlationId: 'corr-1',
      tenantId: 'tenant-42',
    });
    const options = causedBy(command, {
      correlationId: 'other-flow',
      tenantId: 'tenant-99',
      messageId: 'event-1',
    });

    expect(options).toEqual({
      correlationId: 'other-flow',
      causationId: command.metadata.messageId,
      tenantId: 'tenant-99',
      messageId: 'event-1',
    });
  });

  it('produces options the next message accepts as they are', () => {
    const command = new PostAccountingDocument(payload, { tenantId: 'tenant-42' });
    const event = new AccountingDocumentPosted({ documentId: 'doc-1' }, causedBy(command));

    expect(event.metadata.causationId).toBe(command.metadata.messageId);
    expect(event.metadata.correlationId).toBe(command.metadata.messageId);
    expect(event.metadata.tenantId).toBe('tenant-42');
    expect(Object.isFrozen(event)).toBe(true);
  });
});
