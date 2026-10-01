import { describe, expect, it } from 'vitest';

import { InvalidPrimitiveError } from '../primitives/invalid-primitive-error.js';
import {
  MAX_MESSAGE_VERSION,
  createMessageMetadata,
  type MessageMetadata,
  type MessageOptions,
} from './message-metadata.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ISO_UTC = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

describe('the defaults every message gets', () => {
  it('is complete without any options', () => {
    const metadata = createMessageMetadata('PostAccountingDocument');

    expect(metadata.messageId).toMatch(UUID);
    expect(metadata.messageType).toBe('PostAccountingDocument');
    expect(metadata.timestamp).toMatch(ISO_UTC);
    expect(metadata.timestamp).toBe(new Date(metadata.timestamp).toISOString());
    expect(metadata.version).toBe(1);
  });

  it('carries nothing beyond the seven fields the contract defines', () => {
    const bare = createMessageMetadata('PostAccountingDocument');
    const full = createMessageMetadata('PostAccountingDocument', {
      tenantId: 'tenant-42',
      correlationId: 'corr-1',
      causationId: 'cause-1',
    });

    expect(Object.keys(bare).sort()).toEqual(['messageId', 'messageType', 'timestamp', 'version']);
    expect(Object.keys(full).sort()).toEqual([
      'causationId',
      'correlationId',
      'messageId',
      'messageType',
      'tenantId',
      'timestamp',
      'version',
    ]);
  });

  it('generates a fresh id and a current timestamp per message', () => {
    const first = createMessageMetadata('PostAccountingDocument');
    const second = createMessageMetadata('PostAccountingDocument');

    expect(first.messageId).not.toBe(second.messageId);
    expect(Math.abs(Date.parse(first.timestamp) - Date.parse(second.timestamp))).toBeLessThan(
      60_000,
    );
  });
});

describe('pinned values', () => {
  it('keeps every value the caller states', () => {
    const metadata = createMessageMetadata('FiscalYearCreated', {
      messageId: 'op-0001',
      timestamp: '2026-10-02T09:30:00.000Z',
      version: 3,
      tenantId: 'tenant-42',
      correlationId: 'corr.1',
      causationId: 'cause:1',
    });

    expect(metadata).toEqual({
      messageId: 'op-0001',
      messageType: 'FiscalYearCreated',
      timestamp: '2026-10-02T09:30:00.000Z',
      version: 3,
      tenantId: 'tenant-42',
      correlationId: 'corr.1',
      causationId: 'cause:1',
    });
  });

  it('omits the optional context instead of storing undefined', () => {
    const metadata = createMessageMetadata('GetAccounts');

    expect(metadata.tenantId).toBeUndefined();
    expect(metadata).not.toHaveProperty('tenantId');
    expect(JSON.stringify(metadata)).not.toContain('tenantId');
  });

  it('is frozen so tracing context cannot be rewritten after the fact', () => {
    const metadata = createMessageMetadata('PostAccountingDocument', { tenantId: 'tenant-42' });

    expect(Object.isFrozen(metadata)).toBe(true);
    expect(() => {
      (metadata as unknown as { tenantId: string }).tenantId = 'tenant-99';
    }).toThrow(TypeError);
    expect(metadata.tenantId).toBe('tenant-42');
  });

  it('serializes to itself — plain data, no transport type', () => {
    const metadata = createMessageMetadata('PostAccountingDocument', {
      tenantId: 'tenant-42',
      correlationId: 'corr-1',
      causationId: 'cause-1',
    });

    expect(JSON.parse(JSON.stringify(metadata))).toEqual(metadata);
  });
});

describe('rejected metadata', () => {
  it.each<[string, MessageOptions]>([
    ['an empty id', { messageId: '' }],
    ['a blank id', { messageId: '   ' }],
    ['an id with a space', { messageId: 'op 1' }],
    ['an id that is a path', { messageId: '../../etc/passwd' }],
    ['an id that is structured', { messageId: '{"a":1}' }],
    ['an id over the length bound', { messageId: 'a'.repeat(129) }],
    ['a non-string id', { messageId: 42 } as unknown as MessageOptions],
    ['a blank tenant', { tenantId: ' ' }],
    ['a tenant that is not opaque', { tenantId: 'tenant/42' }],
    ['a blank correlation id', { correlationId: '' }],
    ['a causation id that is structured', { causationId: '{"causedBy":"x"}' }],
  ])('rejects %s', (_label, options) => {
    expect(() => createMessageMetadata('PostAccountingDocument', options)).toThrow(
      InvalidPrimitiveError,
    );
  });

  it.each<[string, string]>([
    ['a date without a time', '2026-10-02'],
    ['a local offset instead of UTC', '2026-10-02T09:30:00+03:00'],
    ['a timestamp without the Z', '2026-10-02T09:30:00'],
    ['nonsense', 'yesterday'],
    ['a blank timestamp', '   '],
    ['an impossible instant', '2026-13-45T99:99:99Z'],
    ['a non-string timestamp', '1759387800000'],
  ])('rejects %s', (_label, timestamp) => {
    expect(() => createMessageMetadata('PostAccountingDocument', { timestamp })).toThrow(
      InvalidPrimitiveError,
    );
  });

  it('rejects a timestamp that is not even a string', () => {
    expect(() =>
      createMessageMetadata('PostAccountingDocument', {
        timestamp: 1759387800000 as unknown as string,
      }),
    ).toThrow('MessageMetadata: timestamp must be a string but received 1759387800000');
  });

  it.each<[string, number | string]>([
    ['zero', 0],
    ['a negative version', -1],
    ['a fractional version', 1.5],
    ['a version past the bound', MAX_MESSAGE_VERSION + 1],
    ['a numeric string', '2'],
  ])('rejects a version of %s', (_label, version) => {
    expect(() =>
      createMessageMetadata('FiscalYearCreated', { version: version as number }),
    ).toThrow(InvalidPrimitiveError);
  });

  it('says what a timestamp must look like', () => {
    expect(() =>
      createMessageMetadata('PostAccountingDocument', { timestamp: '2026-10-02' }),
    ).toThrow(
      'MessageMetadata: timestamp must be an ISO 8601 UTC instant such as "2026-10-02T09:30:00.000Z"',
    );
  });

  it('requires a message type', () => {
    expect(() => createMessageMetadata('')).toThrow(
      'MessageMetadata: messageType must not be blank',
    );
  });

  it('bounds the contract version the model accepts', () => {
    expect(MAX_MESSAGE_VERSION).toBe(9999);
    expect(() =>
      createMessageMetadata('FiscalYearCreated', { version: MAX_MESSAGE_VERSION + 1 }),
    ).toThrow('MessageMetadata: version must be between 1 and 9999');
  });
});

describe('the metadata type carries no business or transport concept', () => {
  it('declares only identity, timing, tenant, tracing and version', () => {
    const declared: (keyof MessageMetadata)[] = [
      'messageId',
      'messageType',
      'timestamp',
      'version',
      'tenantId',
      'correlationId',
      'causationId',
    ];

    expect(declared).toHaveLength(7);
    for (const key of declared) {
      expect(key).not.toMatch(/http|status|header|route|body|query|customer|invoice|account/i);
    }
  });
});
