import { describe, expect, it } from 'vitest';

import { InvalidPrimitiveError } from '../primitives/invalid-primitive-error.js';
import { MessageKind } from './message-kind.js';
import type { MessageOptions } from './message-metadata.js';
import { Query } from './query.js';

class GetSupplierBalance extends Query<{ supplierId: string; asOf?: string }> {
  public constructor(params: { supplierId: string; asOf?: string }, options?: MessageOptions) {
    super('GetSupplierBalance', params, options);
  }
}

/** A query that takes its name from the test, so the rules can be probed. */
class AnyName extends Query<undefined> {
  public constructor(name: string) {
    super(name, undefined);
  }
}

describe('a representative query', () => {
  it('requests information with the parameters it needs', () => {
    const query = new GetSupplierBalance({ supplierId: 'sup-1', asOf: '2026-03-21' });

    expect(query.kind).toBe(MessageKind.QUERY);
    expect(query.name).toBe('GetSupplierBalance');
    expect(query.params).toEqual({ supplierId: 'sup-1', asOf: '2026-03-21' });
    expect(query.metadata.messageType).toBe('GetSupplierBalance');
    expect(query.metadata.version).toBe(1);
  });

  it('is data only — no callback, no writer, nothing that could act on state', () => {
    const query = new GetSupplierBalance({ supplierId: 'sup-1' });

    expect(Object.keys(query)).toEqual(['kind', 'name', 'metadata', 'params']);
    expect(typeof (query as unknown as Record<string, unknown>).params).toBe('object');
    expect(JSON.parse(JSON.stringify(query))).toEqual({
      kind: 'query',
      name: 'GetSupplierBalance',
      metadata: query.metadata,
      params: { supplierId: 'sup-1' },
    });
    expect(JSON.stringify(query)).not.toMatch(/status|route|header|http|sql|table/i);
  });

  it('is a value snapshot: the request cannot change while it is answered', () => {
    const params = { supplierId: 'sup-1' };
    const query = new GetSupplierBalance(params);

    expect(Object.isFrozen(query)).toBe(true);
    expect(Object.isFrozen(params)).toBe(true);
    expect(() => {
      params.supplierId = 'sup-2';
    }).toThrow(TypeError);
    expect(query.params.supplierId).toBe('sup-1');
  });
});

describe('tenant and correlation context', () => {
  it('carries whatever scope the application resolved for the read', () => {
    const query = new GetSupplierBalance(
      { supplierId: 'sup-1' },
      { tenantId: 'tenant-42', correlationId: 'req-9' },
    );

    expect(query.metadata.tenantId).toBe('tenant-42');
    expect(query.metadata.correlationId).toBe('req-9');
    expect(query.metadata).not.toHaveProperty('causationId');
  });
});

describe('the read wording of a query name', () => {
  it.each(['GetSupplierBalance', 'ListAccounts', 'SearchInvoices', 'FindReceipt', 'CountInvoices'])(
    'accepts %s',
    (name) => {
      expect(new AnyName(name).name).toBe(name);
    },
  );

  it('refuses an intent — that is a command', () => {
    expect(() => new AnyName('PostAccountingDocument')).toThrow(
      'Query: name must start with one of Get, List, Search, Find, Count, Sum, Exists',
    );
  });

  it('refuses a fact — that is an event', () => {
    expect(() => new AnyName('AccountingDocumentPosted')).toThrow(InvalidPrimitiveError);
  });

  it('refuses a noun phrase that never says how to read', () => {
    expect(() => new AnyName('SupplierBalance')).toThrow('Query: name must start with one of');
  });
});
