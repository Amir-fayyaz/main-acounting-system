import { validateMatches, validateNonBlank } from '../../../../shared/primitives/assert.js';
import { InvalidPrimitiveError } from '../../../../shared/primitives/invalid-primitive-error.js';

/** The canonical max length of a stable action name. */
export const AUDIT_ACTION_MAX_LENGTH = 128;

/**
 * The stable name of a recorded action (AUD-001; ADR-003 section 21;
 * ADR-010 section 9).
 *
 * An action name is the *machine* identity of what happened — `user.signed_in`,
 * `company.created`, `accounting.document.posted` — so an audit trail can be
 * queried, alerted on and compared across deployments without parsing prose
 * (ADR-015 section 6: an audit record is data, not a log line).
 *
 * The shape is enforced rather than assumed:
 *
 * ```text
 * module.verb            user.signed_in
 * module.entity.verb     accounting.document.posted
 * ```
 *
 * at least two lower-case dot-separated segments, each starting with a letter,
 * underscores allowed inside a segment (`signed_in`), at most 128 characters.
 * A single segment is refused on purpose: an action must name the capability
 * that owns it, which is what keeps names from colliding across modules
 * (ADR-002 section 12 — the owning module names its own facts).
 *
 * This primitive judges *form* only. Which actions exist, and what they mean,
 * is decided by the module that performs them; the Audit capability neither
 * defines a business action nor restricts the vocabulary to a fixed list
 * (AUD-001: "business modules remain responsible for their own
 * business-specific action names").
 */
const ACTION_PATTERN = /^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$/;

const ACTION_EXPECTATION =
  'a dotted lower-case action name such as "user.signed_in" or "accounting.document.posted"';

export class AuditAction {
  /** The normalized, lower-case, dotted action name. */
  public readonly value: string;

  private constructor(value: string) {
    this.value = value;
  }

  /**
   * Normalizes and validates a raw action name.
   *
   * @throws InvalidPrimitiveError — blank, over-long, or not a dotted
   * lower-case action name. A malformed action is a programming error in the
   * caller that stated a fact, so it is rejected rather than stored as given.
   */
  public static from(raw: string): AuditAction {
    const normalized = validateNonBlank(raw, 'AuditAction', 'action').toLowerCase();

    if (normalized.length > AUDIT_ACTION_MAX_LENGTH) {
      throw new InvalidPrimitiveError(
        'AuditAction',
        `action must be at most ${AUDIT_ACTION_MAX_LENGTH} characters but received ${normalized.length}`,
      );
    }

    validateMatches(normalized, ACTION_PATTERN, 'AuditAction', 'action', ACTION_EXPECTATION);

    return new AuditAction(normalized);
  }

  /** True when `raw` normalizes to a name this primitive would accept. */
  public static is(raw: unknown): raw is string {
    if (typeof raw !== 'string') return false;
    const normalized = raw.trim().toLowerCase();

    return (
      normalized !== '' &&
      normalized.length <= AUDIT_ACTION_MAX_LENGTH &&
      ACTION_PATTERN.test(normalized)
    );
  }

  /** Value equality: the same action name. */
  public equals(other: AuditAction): boolean {
    return other instanceof AuditAction && this.value === other.value;
  }

  public toString(): string {
    return this.value;
  }

  /** Serializes as the canonical action-name string. */
  public toJSON(): string {
    return this.value;
  }
}
