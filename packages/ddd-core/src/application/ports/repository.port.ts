/**
 * Marker interface for an aggregate root that can be persisted. Bounded
 * contexts pass their concrete aggregate types (which always extend
 * `AggregateRoot<TId>` from this package) to `RepositoryPort<T>` to get a
 * strongly-typed persistence contract without coupling to a specific ORM.
 *
 * Defining this as a structural contract — instead of binding to
 * `AggregateRoot<TId>` directly — keeps repository signatures in adapter
 * code ergonomic and prevents accidental imports of the aggregate base class
 * from repository port call sites.
 */
export type Persistable = { readonly id: unknown };

/**
 * Generic, framework-free persistence contract for an aggregate. Adapters
 * (TypeORM, Prisma, in-memory fakes) translate these calls into the
 * underlying store.
 *
 * The contract is intentionally minimal: aggregates own their consistency
 * boundary, so the repository does not expose batch updates or generic
 * queries. Bounded contexts that need queryable reads build a dedicated
 * read-side port rather than extending this one.
 */
export interface RepositoryPort<T extends Persistable> {
  /** Load an aggregate by its identifier; returns `null` when not found. */
  findById(id: T['id']): Promise<T | null>;

  /** Persist a new aggregate or update an existing one. */
  save(aggregate: T): Promise<void>;

  /** Remove an aggregate from the underlying store. */
  delete(id: T['id']): Promise<void>;
}
