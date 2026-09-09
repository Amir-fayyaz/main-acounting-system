import { InvalidValueError } from '../errors/invalid-value.error';
import { ValueObject } from '../value-object';

/**
 * Canonical RFC 4122 UUID v4 layout: 8-4-4-4-12 lowercase hex with the
 * version nibble fixed at `4` and the variant nibble in `[89ab]`. The
 * normalised form is what Postgres emits by default and what every
 * bounded context expects when looking up a tenant.
 */
const UUID_V4_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

/**
 * Strongly-typed tenant identifier (BR-TENANT-001, BR-TENANT-002). Every
 * tenant-scoped repository and use case accepts `TenantId` rather than a
 * raw string so a missing or malformed tenant context fails loudly at
 * the boundary instead of silently cross-pollinating tenant data.
 *
 * The string is normalised to lowercase + trimmed before being stored
 * so two equivalent ids produced on different platforms compare equal.
 */
export class TenantId extends ValueObject {
  private constructor(public readonly value: string) {
    super();
  }

  static of(candidate: string): TenantId {
    if (typeof candidate !== 'string') {
      throw new InvalidValueError('TenantId must be a string');
    }
    const normalized = candidate.trim().toLowerCase();
    if (normalized.length === 0) {
      throw new InvalidValueError('TenantId must not be empty');
    }
    if (!UUID_V4_PATTERN.test(normalized)) {
      throw new InvalidValueError(`Invalid tenant id: ${candidate}`);
    }
    return new TenantId(normalized);
  }

  toString(): string {
    return this.value;
  }
}
