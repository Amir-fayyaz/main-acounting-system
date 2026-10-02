import { validateIntegerInRange } from '../primitives/assert.js';

/**
 * The revision of a record as the persistence contract sees it (SHR-004;
 * ADR-004 section 27 — optimistic concurrency for business data).
 *
 * A revision answers one question: *is the row I read still the row I am
 * writing?* The application loads a record together with its revision, changes
 * it in Domain, and hands that same revision back on update. If anyone wrote in
 * between, the expected revision no longer matches, the store refuses the write,
 * and the caller is told to reload instead of silently overwriting someone
 * else's work. There is no last-write-wins path in this contract.
 *
 * The same token is what keeps history honest (ADR-003, sections 7–9): a
 * correction arrives as a new write against the current revision, never as an
 * invisible edit of what was already recorded, and a master-data change cannot
 * reach back and rewrite an old document, because that document was written at
 * a revision this contract never rewrites.
 *
 * A revision belongs to storage, not to the Domain: an aggregate does not have
 * to carry one. The port requires it at write time, and where the application
 * keeps it — beside the aggregate, in the read model, or in the use case — is
 * the module's own decision.
 *
 * Value semantics, like every shared primitive: two revisions are equal when
 * their numbers are equal.
 */

/**
 * The largest revision a record may reach — the signed 32-bit bound most
 * storage schemas use for a version column, so a contract that fits a common
 * column type never surprises an adapter later.
 */
export const MAX_REVISION = 2_147_483_647;

export class Revision {
  /** The canonical positive integer. */
  public readonly value: number;

  private constructor(value: number) {
    this.value = value;
  }

  /** The revision of a freshly created record: every store starts at `1`. */
  public static initial(): Revision {
    return new Revision(1);
  }

  /**
   * Wraps a revision read from storage.
   *
   * @throws InvalidPrimitiveError — zero, a negative, a fraction, a non-number
   * or a value above {@link MAX_REVISION} is a broken record or a broken
   * adapter, rejected rather than repaired.
   */
  public static of(value: number): Revision {
    return new Revision(validateIntegerInRange(value, 1, MAX_REVISION, 'Revision', 'value'));
  }

  /**
   * The revision after the next successful write.
   *
   * @throws InvalidPrimitiveError — at {@link MAX_REVISION} there is no next
   * revision, which is a signal that the bound must be revisited rather than a
   * number that silently wraps into a value older than the record itself.
   */
  public next(): Revision {
    return Revision.of(this.value + 1);
  }

  /** Value equality: the same revision number, the same revision. */
  public equals(other: unknown): boolean {
    return other instanceof Revision && other.value === this.value;
  }

  public toString(): string {
    return String(this.value);
  }

  /** Serializes as a bare number, the version column wire format. */
  public toJSON(): number {
    return this.value;
  }
}
