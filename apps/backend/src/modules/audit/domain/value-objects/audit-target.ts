import { validateMatches, validateNonBlank } from '../../../../shared/primitives/assert.js';
import { InvalidPrimitiveError } from '../../../../shared/primitives/invalid-primitive-error.js';
import { assertOpaqueIdentifier } from '../audit-identifiers.js';

/** The canonical max length of a resource type name. */
export const AUDIT_TARGET_TYPE_MAX_LENGTH = 128;

/**
 * The type name of a resource an audited operation acted on.
 *
 * Same shape rule as an action name (`user`, `role`, `accounting.document`),
 * for the same reason: it is a machine name a query and an alert can rely on,
 * not a human label. Written as its own primitive because it is stored in its
 * own column and filtered on independently of the action.
 */
const TYPE_PATTERN = /^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)*$/;

/**
 * Whether `raw` names a resource type this primitive would accept.
 *
 * Exported because a *filter* has to answer the same question as the record
 * does — "is this a resource type at all?" — without inventing a second rule
 * that could disagree with this one.
 */
export function isAuditTargetType(raw: unknown): raw is string {
  if (typeof raw !== 'string') return false;
  const normalized = raw.trim().toLowerCase();

  return (
    normalized !== '' &&
    normalized.length <= AUDIT_TARGET_TYPE_MAX_LENGTH &&
    TYPE_PATTERN.test(normalized)
  );
}

/**
 * A reference to the resource an audited operation acted on (AUD-001;
 * ADR-003 section 21 — "on which object").
 *
 * A target is a *pair*: which kind of thing, and which one. Both are always
 * present, and neither is interpreted here — the audit capability stores the
 * reference and gives it back, so it stays generic across identity, tenant,
 * accounting, inventory, purchase and agent modules without knowing any of
 * them (the audit module embeds no business rule and no resource catalog).
 *
 * A half-specified target is refused rather than stored: an id with no type
 * cannot be filtered or resolved by a reader, so a record carrying one would be
 * permanently unusable for the question it claims to answer.
 */
export class AuditTarget {
  /** The resource type, e.g. `user`, `role`, `accounting.document`. */
  public readonly type: string;

  /** The resource's stable identity. */
  public readonly id: string;

  private constructor(type: string, id: string) {
    this.type = type;
    this.id = id;
  }

  /**
   * Builds a target reference.
   *
   * @throws InvalidPrimitiveError — a blank, over-long or wrongly shaped type,
   * or a malformed resource id.
   */
  public static of(type: string, id: string): AuditTarget {
    const normalizedType = validateNonBlank(type, 'AuditTarget', 'type').toLowerCase();

    if (normalizedType.length > AUDIT_TARGET_TYPE_MAX_LENGTH) {
      throw new InvalidPrimitiveError(
        'AuditTarget',
        `type must be at most ${AUDIT_TARGET_TYPE_MAX_LENGTH} characters but received ${normalizedType.length}`,
      );
    }

    validateMatches(
      normalizedType,
      TYPE_PATTERN,
      'AuditTarget',
      'type',
      'a lower-case resource type such as "user" or "accounting.document"',
    );

    return new AuditTarget(normalizedType, assertOpaqueIdentifier(id, 'AuditTarget', 'id'));
  }

  /** Value equality: the same reference to the same resource. */
  public equals(other: AuditTarget): boolean {
    return other instanceof AuditTarget && other.type === this.type && other.id === this.id;
  }

  public toString(): string {
    return `AuditTarget(${this.type}:${this.id})`;
  }
}
