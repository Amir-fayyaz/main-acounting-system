import { describe, expect, it } from 'vitest';

import { ConflictError, NotFoundError } from '../errors/category-errors.js';
import type { DomainError } from '../errors/domain-error.js';
import { Result } from '../errors/result.js';
import { EntityId } from '../id/entity-id.js';
import { PersistenceError, PersistenceFailureKind } from './persistence-error.js';
import type {
  AddsAggregate,
  ChecksExistence,
  FindsByCriteria,
  Loaded,
  LoadsById,
  UpdatesAggregate,
  WriteReceipt,
} from './repository-ports.js';
import { Revision } from './revision.js';

/**
 * Representative contract tests for the repository ports (SHR-004).
 *
 * There is no business-domain repository in the kernel — that belongs to the
 * owning module — so these tests build the smallest honest stand-in: a module
 * aggregate, a repository interface assembled from the shared capabilities, and
 * an in-memory adapter standing in for the future Drizzle one. If the adapter
 * can be written without touching the aggregate, and the use case can be
 * written without knowing which adapter it got, the contract does its job.
 *
 * The module-shaped names below (`Sample*`) stand for whatever the first real
 * module declares; nothing about them is special.
 */

/** A stand-in aggregate: enough shape to exercise the ports, no business rules. */
interface SampleAggregate {
  readonly id: EntityId;
  readonly name: string;
}

/** The module's own closed criterion — a filter, never a query. */
interface SampleCriteria {
  readonly namePrefix: string;
}

/**
 * The repository a module would declare in its `domain/`: assembled from the
 * shared capabilities plus one method of its own, with no criteria builder and
 * no generic base to grow into.
 */
interface SampleRepository
  extends
    LoadsById<EntityId, SampleAggregate>,
    AddsAggregate<SampleAggregate>,
    UpdatesAggregate<SampleAggregate>,
    ChecksExistence<EntityId>,
    FindsByCriteria<SampleCriteria, SampleAggregate> {}

interface StoredRow {
  readonly aggregate: SampleAggregate;
  readonly revision: Revision;
}

/**
 * The stand-in adapter — the shape a Drizzle implementation will have to
 * satisfy later, written here against nothing but the shared ports.
 */
class InMemorySampleStore implements SampleRepository {
  private readonly rows = new Map<string, StoredRow>();

  /** Test hook: makes the next write fail with the given kind. */
  private nextFailure: PersistenceFailureKind | undefined = undefined;

  public failNextWriteWith(kind: PersistenceFailureKind): void {
    this.nextFailure = kind;
  }

  public async get(id: EntityId): Promise<Loaded<SampleAggregate> | undefined> {
    const row = this.rows.get(id.value);
    return row === undefined ? undefined : { aggregate: row.aggregate, revision: row.revision };
  }

  public async exists(id: EntityId): Promise<boolean> {
    return this.rows.has(id.value);
  }

  public async add(aggregate: SampleAggregate): Promise<WriteReceipt> {
    this.throwIfScheduledToFail();
    if (this.rows.has(aggregate.id.value)) {
      throw new PersistenceError(PersistenceFailureKind.CONFLICT, 'SampleStore.add');
    }
    const revision = Revision.initial();
    this.rows.set(aggregate.id.value, { aggregate, revision });
    return { revision };
  }

  public async update(
    aggregate: SampleAggregate,
    expectedRevision: Revision,
  ): Promise<WriteReceipt> {
    this.throwIfScheduledToFail();
    const row = this.rows.get(aggregate.id.value);
    if (row === undefined) {
      throw new PersistenceError(PersistenceFailureKind.REJECTED, 'SampleStore.update');
    }
    if (!row.revision.equals(expectedRevision)) {
      throw new PersistenceError(PersistenceFailureKind.CONFLICT, 'SampleStore.update');
    }
    const revision = row.revision.next();
    this.rows.set(aggregate.id.value, { aggregate, revision });
    return { revision };
  }

  public async find(criteria: SampleCriteria): Promise<readonly Loaded<SampleAggregate>[]> {
    return [...this.rows.values()]
      .filter((row) => row.aggregate.name.startsWith(criteria.namePrefix))
      .map((row) => ({ aggregate: row.aggregate, revision: row.revision }));
  }

  private throwIfScheduledToFail(): void {
    if (this.nextFailure === undefined) {
      return;
    }
    const kind = this.nextFailure;
    this.nextFailure = undefined;
    throw new PersistenceError(kind, 'SampleStore.write', { cause: new Error('driver says no') });
  }
}

const sampleId = EntityId.from('018f0d3c-6d0f-7a4b-9d4e-2b3c4d5e6f70');
const sample = (name: string): SampleAggregate => ({ id: sampleId, name });

/**
 * A representative use case: how Application consumes the ports. It knows the
 * repository's shape and the shared error vocabulary — never the adapter, and
 * never MySQL. `beforeWrite` stands for the interval between load and save, in
 * which a concurrent writer may act.
 */
async function renameSample(
  repository: LoadsById<EntityId, SampleAggregate> & UpdatesAggregate<SampleAggregate>,
  id: EntityId,
  name: string,
  beforeWrite?: () => Promise<unknown>,
): Promise<Result<SampleAggregate, DomainError>> {
  const loaded = await repository.get(id);
  if (loaded === undefined) {
    return Result.fail(new NotFoundError('No such sample.'));
  }

  const renamed: SampleAggregate = { id: loaded.aggregate.id, name };
  try {
    await beforeWrite?.();
    await repository.update(renamed, loaded.revision);
  } catch (error) {
    if (error instanceof PersistenceError) {
      const domainError = error.toDomainError();
      if (domainError !== undefined) {
        // A lost race is the one storage failure a caller can act on.
        return Result.fail(domainError);
      }
      throw error; // everything else stays a technical failure for the boundary
    }
    throw error;
  }
  return Result.ok(renamed);
}

describe('repository port — reads', () => {
  it('returns what was stored together with the revision it carries', async () => {
    const store = new InMemorySampleStore();
    await store.add(sample('anchor'));

    const loaded = await store.get(sampleId);

    expect(loaded?.aggregate).toEqual(sample('anchor'));
    expect(loaded?.revision.value).toBe(1);
  });

  it('reports absence as undefined, leaving the business meaning to the use case', async () => {
    const store = new InMemorySampleStore();

    expect(await store.get(sampleId)).toBeUndefined();
    expect(await store.exists(sampleId)).toBe(false);
  });

  it('answers existence without loading the aggregate', async () => {
    const store = new InMemorySampleStore();
    await store.add(sample('anchor'));

    expect(await store.exists(sampleId)).toBe(true);
    expect(await store.exists(EntityId.generate())).toBe(false);
  });

  it("finds by the module's own closed criteria", async () => {
    const store = new InMemorySampleStore();
    await store.add(sample('anchor'));
    const other = { id: EntityId.generate(), name: 'other' };
    await store.add(other);

    const found = await store.find({ namePrefix: 'anc' });

    expect(found.map((loaded) => loaded.aggregate.name)).toEqual(['anchor']);
    expect(found[0]?.revision.value).toBe(1);
  });
});

describe('repository port — writes', () => {
  it('creates at revision one and advances by exactly one per successful write', async () => {
    const store = new InMemorySampleStore();

    const created = await store.add(sample('first'));
    const updated = await store.update(sample('second'), created.revision);

    expect(created.revision.value).toBe(1);
    expect(updated.revision.value).toBe(2);
    expect((await store.get(sampleId))?.revision.value).toBe(2);
  });

  it('refuses to create the same identity twice, reporting a conflict', async () => {
    const store = new InMemorySampleStore();
    await store.add(sample('anchor'));

    await expect(store.add(sample('replacement'))).rejects.toThrow(PersistenceError);
    await expect(store.add(sample('replacement'))).rejects.toMatchObject({
      kind: PersistenceFailureKind.CONFLICT,
      retryable: false,
      outcomeKnown: true,
    });
    expect((await store.get(sampleId))?.aggregate.name).toBe('anchor');
  });

  it('refuses a stale write and leaves the stored record untouched', async () => {
    const store = new InMemorySampleStore();
    const created = await store.add(sample('original'));

    // A second writer updates first; the first writer still believes `created`.
    await store.update(sample('rival'), created.revision);

    await expect(store.update(sample('stale'), created.revision)).rejects.toMatchObject({
      kind: PersistenceFailureKind.CONFLICT,
    });
    expect((await store.get(sampleId))?.aggregate.name).toBe('rival');
    expect((await store.get(sampleId))?.revision.value).toBe(2);
  });

  it('rejects a write against a record that was never loaded into existence', async () => {
    const store = new InMemorySampleStore();

    await expect(store.update(sample('ghost'), Revision.initial())).rejects.toMatchObject({
      kind: PersistenceFailureKind.REJECTED,
      retryable: false,
      outcomeKnown: true,
    });
  });
});

describe('repository port — the contract surface', () => {
  it('exposes no hard delete anywhere (ADR-003, section 10)', async () => {
    const store = new InMemorySampleStore();

    // @ts-expect-error — the port vocabulary has no delete, so this is undefined.
    expect(store.delete).toBeUndefined();
  });

  it('gives a loads-only view of the port no write at all', async () => {
    const store = new InMemorySampleStore();
    const loadsOnly: LoadsById<EntityId, SampleAggregate> = store;
    type LoadsOnlyKeys = keyof LoadsById<EntityId, SampleAggregate>;

    // Composing only `LoadsById` is what makes a port read-only.
    // @ts-expect-error - `update` is not a key of a loads-only view.
    const _writeKey: LoadsOnlyKeys = 'update';
    expect(_writeKey).toBe('update');
    expect(await loadsOnly.get(sampleId)).toBeUndefined();
  });

  it('cannot be written without stating which revision is expected', async () => {
    const store = new InMemorySampleStore();
    type WriteWithoutRevision = (aggregate: SampleAggregate) => Promise<WriteReceipt>;

    // @ts-expect-error - a write must name the revision it expects.
    const _writeWithoutRevision: WriteWithoutRevision = store.update;
    expect(_writeWithoutRevision).toBeTypeOf('function');
  });

  it('refuses a query string as a criterion', async () => {
    const store = new InMemorySampleStore();
    type FindByQueryString = (criteria: string) => Promise<readonly Loaded<SampleAggregate>[]>;

    // @ts-expect-error - criteria are structured; SQL text is not a criterion.
    const _readsQueryStrings: FindByQueryString = store.find;
    expect(_readsQueryStrings).toBeTypeOf('function');
  });
});

describe('application boundary over the ports (representative use case)', () => {
  it('turns a missing record into the expected failure the use case decides about', async () => {
    const store = new InMemorySampleStore();

    const result = await renameSample(store, sampleId, 'renamed');

    expect(result.isFail()).toBe(true);
    expect(result.error()).toBeInstanceOf(NotFoundError);
  });

  it('carries a successful rename out as a value', async () => {
    const store = new InMemorySampleStore();
    await store.add(sample('before'));

    const result = await renameSample(store, sampleId, 'after');

    expect(result.value()).toEqual(sample('after'));
    expect((await store.get(sampleId))?.aggregate.name).toBe('after');
  });

  it('translates a lost race into the shared conflict instead of leaking storage', async () => {
    const store = new InMemorySampleStore();
    await store.add(sample('original'));

    // Between the use case's load and its save, a second writer updates the row.
    const result = await renameSample(store, sampleId, 'mine', () =>
      store.update(sample('rival'), Revision.initial()),
    );

    expect(result.isFail()).toBe(true);
    expect(result.error()).toBeInstanceOf(ConflictError);
    expect(result.errorOrThrow().message).toBe(
      'The record was changed by someone else. Reload it and try again.',
    );
    expect((await store.get(sampleId))?.aggregate.name).toBe('rival');
  });

  it('keeps an unreachable store technical: thrown, never returned', async () => {
    const store = new InMemorySampleStore();
    await store.add(sample('anchor'));
    store.failNextWriteWith(PersistenceFailureKind.UNAVAILABLE);

    await expect(renameSample(store, sampleId, 'renamed')).rejects.toThrow(PersistenceError);
    expect((await store.get(sampleId))?.aggregate.name).toBe('anchor');
  });
});
