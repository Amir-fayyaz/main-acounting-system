import { randomUUID } from 'node:crypto';

import { describeValue, validateMatches } from '../primitives/assert.js';
import { InvalidPrimitiveError } from '../primitives/invalid-primitive-error.js';

/**
 * The one identifier shared by every module (ADR-002 section 10).
 *
 * An id says *which* thing this is and nothing else: it carries no tenant, no
 * type and no ordering, so it can never leak a business meaning into the code
 * that only has to compare or store it. A module that needs a nominal type on
 * top of this (`type InvoiceId = EntityId`) adds the alias in its own layer —
 * the shared kernel stays unaware of any particular module.
 *
 * Identity is a UUID, which keeps ids collision-free across processes and
 * unguessable from one another, so an id in a URL discloses nothing about how
 * many records exist (06-security-engineering).
 */
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export class EntityId {
  /** The canonical lower-case UUID text. */
  public readonly value: string;

  private constructor(value: string) {
    this.value = value;
  }

  /** A fresh, globally unique id. */
  public static generate(): EntityId {
    return new EntityId(randomUUID());
  }

  /**
   * Wraps an existing UUID, e.g. one read from storage or received over the
   * wire. Case is folded to the canonical lower case so two spellings of the
   * same id compare equal.
   */
  public static from(value: string): EntityId {
    if (typeof value !== 'string') {
      throw new InvalidPrimitiveError(
        'EntityId',
        `value must be a UUID string but received ${describeValue(value)}`,
      );
    }
    const normalized = validateMatches(
      value.trim(),
      UUID_PATTERN,
      'EntityId',
      'value',
      'a UUID such as "018f0d3c-6d0f-7a4b-9d4e-2b3c4d5e6f70"',
    );
    return new EntityId(normalized.toLowerCase());
  }

  /** Whether `value` is a UUID this primitive would accept. */
  public static isValid(value: string): boolean {
    return typeof value === 'string' && UUID_PATTERN.test(value.trim());
  }

  /** Value equality: two ids are the same id when their UUIDs match. */
  public equals(other: EntityId): boolean {
    return other instanceof EntityId && this.value === other.value;
  }

  public toString(): string {
    return this.value;
  }

  /** Serializes as a bare UUID string, the identifier wire format of FND-006. */
  public toJSON(): string {
    return this.value;
  }
}
