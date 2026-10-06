import { validateMatches, validateNonBlank } from '../../../../shared/primitives/assert.js';
import { InvalidPrimitiveError } from '../../../../shared/primitives/invalid-primitive-error.js';

/** The canonical max length for a dotted permission key. */
export const PERMISSION_KEY_MAX_LENGTH = 120;

/**
 * The deterministic, programmatic name of a capability (IAM-004).
 *
 * A permission key is what the later authorization layer checks — `company.read`,
 * `user.manage` — so it is a *machine* name, not a label: lower-case,
 * dot-separated segments, no spaces, no free text. The stable permission
 * identity is the key itself: the same capability is named the same way in every
 * tenant, the same way in code and in a policy, and the same way across
 * deployments, which is exactly what makes an effective permission set
 * comparable and cacheable.
 *
 * The key is normalized (trimmed and lower-cased) before validating, so two
 * spellings of the same capability compare equal, and the shape is enforced
 * rather than assumed: at least two segments (`resource.action`), each starting
 * with a letter. There is deliberately no depth limit beyond the length bound —
 * a future domain may nest (`accounting.invoice.approve`) without a new rule.
 */
const KEY_PATTERN = /^[a-z][a-z0-9]*(\.[a-z][a-z0-9]*)+$/;

export class PermissionKey {
  /** The largest length {@link PermissionKey.from} accepts. */
  public static readonly MAX_LENGTH = PERMISSION_KEY_MAX_LENGTH;

  /** The canonical lower-case, dotted text. */
  public readonly value: string;

  private constructor(value: string) {
    this.value = value;
  }

  /**
   * Normalizes and validates a raw permission key.
   *
   * @throws InvalidPrimitiveError — blank, over-long, or not a dotted
   * lower-case capability name.
   */
  public static from(raw: string): PermissionKey {
    const normalized = validateNonBlank(raw, 'PermissionKey', 'key').toLowerCase();
    if (normalized.length > PERMISSION_KEY_MAX_LENGTH) {
      throw new InvalidPrimitiveError(
        'PermissionKey',
        `key must be at most ${PERMISSION_KEY_MAX_LENGTH} characters but received ${normalized.length}`,
      );
    }
    validateMatches(
      normalized,
      KEY_PATTERN,
      'PermissionKey',
      'key',
      'a dotted lower-case capability such as "company.read"',
    );
    return new PermissionKey(normalized);
  }

  /** True when `raw` normalizes to a key this primitive would accept. */
  public static is(raw: unknown): raw is string {
    if (typeof raw !== 'string') return false;
    const normalized = raw.trim().toLowerCase();
    return (
      normalized !== '' &&
      normalized.length <= PERMISSION_KEY_MAX_LENGTH &&
      KEY_PATTERN.test(normalized)
    );
  }

  /** Structural equality: the same capability. */
  public equals(other: PermissionKey): boolean {
    return other instanceof PermissionKey && other.value === this.value;
  }

  public toString(): string {
    return this.value;
  }

  /** Serializes as the plain dotted key (FND-006 serialization). */
  public toJSON(): string {
    return this.value;
  }
}
