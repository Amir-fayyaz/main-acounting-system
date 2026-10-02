import type { Revision } from './revision.js';

/**
 * The persistence port conventions every module composes its repository from
 * (SHR-004; ADR-002 section 8; ADR-003 sections 4, 14–16, 25; ADR-004
 * section 27).
 *
 * A repository belongs to the module that owns the data. Its interface is
 * declared in that module's `domain/`, its adapter in that module's
 * `infrastructure/persistence/`, and no other module may touch either. What the
 * kernel offers here is not a repository — it is the *vocabulary* of one: a
 * handful of narrow capabilities a module combines to describe exactly the data
 * access its own use cases need, and nothing more.
 *
 * ```ts
 * export interface AccountingDocumentsRepository
 *   extends LoadsById<EntityId, AccountingDocument>,
 *     AddsAggregate<AccountingDocument>,
 *     UpdatesAggregate<AccountingDocument> {
 *   findByNumber(criteria: DocumentNumberQuery): Promise<readonly Loaded<AccountingDocument>[]>;
 * }
 * ```
 *
 * Three deliberate refusals are part of the contract:
 *
 * - **No generic repository.** There is no `GenericRepository<T>`, no criteria
 *   builder, no expression tree, no SQL fragment and no unrestricted `query()`
 *   anywhere in the kernel. A port is assembled from the capabilities below and
 *   from methods a module writes for its own closed criteria, so it can never
 *   grow into a database gateway that exposes arbitrary tables (ADR-003,
 *   section 14 — the pattern that turns one module into everyone's ORM).
 * - **No upsert.** Creation is `add` and change is `update` against an explicit
 *   revision. A combined save would have to decide, silently, whether it is
 *   inserting or overwriting — exactly the ambiguity a financial record cannot
 *   afford (ADR-004, section 27: a conflict is reported, never absorbed).
 * - **No delete.** Nothing here removes a row. Data with operational history is
 *   never hard-deleted (ADR-003, section 10); correction, reversal and
 *   lifecycle states (`Inactive`, `Archived`, `Closed`) are Domain operations
 *   that the owning module declares on its own port, if at all.
 *
 * Everything is asynchronous and framework-free: an adapter may be MySQL with
 * Drizzle, an in-memory map in a test, or something else entirely — implementing
 * these interfaces requires no change to Domain code. Failures follow the one
 * boundary the architecture allows: absence is a normal read outcome, a lost
 * race and a refused write are a thrown {@link PersistenceError}, and an
 * expected business failure is a `Result` the use case returns (SHR-002).
 */

/**
 * An aggregate together with the revision it was read at.
 *
 * Handing both back from a read is what makes optimistic concurrency usable
 * without polluting the Domain: the use case loads, changes the aggregate in
 * Domain terms, then writes with `loaded.revision` as the expected one. If
 * anything wrote in between, the update fails as a conflict instead of
 * overwriting (ADR-004, section 27).
 */
export interface Loaded<TAggregate> {
  readonly aggregate: TAggregate;
  readonly revision: Revision;
}

/**
 * What a successful write returns: the revision the record now carries.
 *
 * Reporting it is what makes "done" unambiguous (ADR-004, section 31): a caller
 * learns both that the write landed and which revision to expect on its next
 * update. An adapter that cannot tell whether the write applied must throw a
 * {@link PersistenceError} with `outcomeKnown: false` rather than return a
 * receipt for work it is unsure about.
 */
export interface WriteReceipt {
  readonly revision: Revision;
}

/** Read an aggregate by identity. Absence is `undefined`, not an error. */
export interface LoadsById<TId, TAggregate> {
  /**
   * Returns the aggregate with the revision it was stored at, or `undefined`
   * when no such record exists.
   *
   * Absence is deliberately *not* a failure: whether a missing record is a
   * `NotFoundError`, a default or an invitation to create one is a business
   * decision the use case makes (SHR-002 — expected failures are decided by
   * Domain/Application, never invented by storage).
   */
  get(id: TId): Promise<Loaded<TAggregate> | undefined>;
}

/** Ask whether a record exists, without loading it. */
export interface ChecksExistence<TId> {
  exists(id: TId): Promise<boolean>;
}

/** Insert a new aggregate. Creating twice with one identity is a conflict. */
export interface AddsAggregate<TAggregate> {
  /**
   * Stores a record that does not exist yet, starting at
   * `Revision.initial()`.
   *
   * @throws PersistenceError — `CONFLICT` when the identity is already taken,
   * `REJECTED` when the store refuses the shape. Nothing is written on either.
   */
  add(aggregate: TAggregate): Promise<WriteReceipt>;
}

/** Change an aggregate that already exists, against the revision read. */
export interface UpdatesAggregate<TAggregate> {
  /**
   * Stores the aggregate only if the record still carries
   * `expectedRevision`, then advances it by one.
   *
   * The expected revision is a required parameter, not an option: the contract
   * has no path that writes without saying which state it believes is current,
   * so a silent last-write-wins overwrite is unrepresentable.
   *
   * @throws PersistenceError — `CONFLICT` on a stale revision or an unknown
   * id, `REJECTED` when the store refuses the shape. On failure the stored
   * record is untouched.
   */
  update(aggregate: TAggregate, expectedRevision: Revision): Promise<WriteReceipt>;
}

/**
 * Find aggregates by a *defined* criterion.
 *
 * `Criteria` is a closed type the module owns — a number, a period, a state, a
 * tenant scope — never an expression tree, a fragment of a query or a string
 * that storage interprets. A read the module did not foresee needs a new
 * criteria type and a reviewed port method, which is the point: the port grows
 * with decisions, not with curiosity (ADR-003, sections 4 and 25 — cross-module
 * and unrestricted access are not available for convenience).
 */
export interface FindsByCriteria<Criteria, TAggregate> {
  find(criteria: Criteria): Promise<readonly Loaded<TAggregate>[]>;
}
