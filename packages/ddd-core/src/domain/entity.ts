/**
 * Base class for domain entities. Entities have a unique identity that
 * persists across state changes; equality is by identity, never by value.
 */
export abstract class Entity<TId> {
  protected constructor(public readonly id: TId) {}

  equals(other?: Entity<TId>): boolean {
    return Boolean(other && this.id === other.id);
  }
}
