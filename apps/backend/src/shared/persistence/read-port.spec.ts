import { describe, expect, it } from 'vitest';

import { ReadPort } from './read-port.js';

/**
 * Representative contract tests for the read port (SHR-004; ADR-003 sections 6
 * and 14; ADR-009).
 *
 * A read port is the other half of persistence: not "how does a use case
 * change an aggregate", but "how does something look at data it does not own".
 * The stand-in below is the shape a reporting projection or a module query
 * adapter will take — plain data out, criteria in, no write surface at all.
 */

/** What the caller sees: a plain, serializable snapshot — not an aggregate. */
interface SampleSummary {
  readonly id: string;
  readonly name: string;
}

/** What the caller asks with: structured criteria, company scope included. */
interface SampleCriteria {
  readonly tenantId: string;
  readonly namePrefix: string;
}

/** The read port a module (or `reporting/`) would declare beside its query. */
type SampleSummaryRead = ReadPort<SampleCriteria, readonly SampleSummary[]>;

/** The stored row, which the read model deliberately does not expose. */
interface StoredRow {
  readonly id: string;
  readonly tenantId: string;
  readonly name: string;
}

class InMemorySampleSummaryRead implements SampleSummaryRead {
  public constructor(private readonly rows: readonly StoredRow[]) {}

  public async read(criteria: SampleCriteria): Promise<readonly SampleSummary[]> {
    return this.rows
      .filter((row) => row.tenantId === criteria.tenantId)
      .filter((row) => row.name.startsWith(criteria.namePrefix))
      .map((row) => ({ id: row.id, name: row.name }));
  }
}

const TENANT_A = 'tenant-a';
const TENANT_B = 'tenant-b';
const ROWS: readonly StoredRow[] = [
  { id: '1', tenantId: TENANT_A, name: 'anchor invoice' },
  { id: '2', tenantId: TENANT_A, name: 'annex receipt' },
  { id: '3', tenantId: TENANT_B, name: 'anchor invoice' },
];
const criteria = (tenantId: string, namePrefix = ''): SampleCriteria => ({ tenantId, namePrefix });

describe('read port — what comes back', () => {
  it('returns plain, serializable read models — never a live entity', async () => {
    const read = new InMemorySampleSummaryRead(ROWS);

    const summaries = await read.read(criteria(TENANT_A, 'anchor'));

    expect(summaries).toEqual([{ id: '1', name: 'anchor invoice' }]);
    expect(JSON.parse(JSON.stringify(summaries))).toEqual(summaries);
    expect(summaries[0]).not.toBe(ROWS[0]);
  });

  it('applies the company scope the application resolved, not one a client sent', async () => {
    const read = new InMemorySampleSummaryRead(ROWS);

    const forTenantA = await read.read(criteria(TENANT_A));
    const forTenantB = await read.read(criteria(TENANT_B));

    expect(forTenantA.map((row) => row.id)).toEqual(['1', '2']);
    expect(forTenantB.map((row) => row.id)).toEqual(['3']);
  });

  it('has no side effect: reading changes nothing', async () => {
    const read = new InMemorySampleSummaryRead(ROWS);
    const before = JSON.stringify(ROWS);

    await read.read(criteria(TENANT_A));
    await read.read(criteria(TENANT_B));

    expect(JSON.stringify(ROWS)).toBe(before);
    expect(await read.read(criteria(TENANT_A))).toEqual(await read.read(criteria(TENANT_A)));
  });
});

describe('read port — the contract surface', () => {
  it('carries no write: there is no path around the owning Domain', () => {
    const read = new InMemorySampleSummaryRead(ROWS);

    // @ts-expect-error — a read port exposes no update.
    expect(read.update).toBeUndefined();
    // @ts-expect-error — a read port exposes no add.
    expect(read.add).toBeUndefined();
    // @ts-expect-error — a read port exposes no delete.
    expect(read.delete).toBeUndefined();
  });

  it('is declared independently of any repository capability', async () => {
    const read: SampleSummaryRead = new InMemorySampleSummaryRead(ROWS);

    expect(typeof read.read).toBe('function');
    // @ts-expect-error — a read port is its own port, not a repository.
    expect(read.get).toBeUndefined();
    expect(await read.read(criteria(TENANT_A))).toHaveLength(2);
  });

  it('takes structured criteria, never a query string', () => {
    const read = new InMemorySampleSummaryRead(ROWS);
    type ReadByQueryString = (criteria: string) => Promise<readonly SampleSummary[]>;

    // Criteria are a module-owned object; a string storage might interpret is
    // not one, so unrestricted querying is not expressible through this port.
    // @ts-expect-error - read takes structured criteria, not a query string.
    const _readsQueryStrings: ReadByQueryString = read.read;
    expect(_readsQueryStrings).toBeTypeOf('function');
  });
});
