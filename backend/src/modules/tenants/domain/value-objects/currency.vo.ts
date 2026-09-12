import { ValueObject } from '@accounting-saas/ddd-core';
import { InvalidValueError } from '@shared/domain/invalid-value.error';

/**
 * Immutable tenant-level base currency for accounting (issue #22). Stored as
 * an uppercase ISO 4217 alpha-3 code; the tenant's books are kept in this
 * currency and it never changes after creation.
 */
export class Currency extends ValueObject {
  private constructor(public readonly value: string) {
    super();
  }

  /** ISO 4217 alpha-3 currency codes the MVP accepts. */
  private static readonly ALLOWED = new Set(['IRR', 'USD', 'EUR', 'GBP', 'AED']);

  static of(candidate: string): Currency {
    const normalized = candidate?.trim().toUpperCase() ?? '';
    if (!/^[A-Z]{3}$/.test(normalized)) {
      throw new InvalidValueError('Currency must be a 3-letter ISO 4217 code');
    }
    if (!Currency.ALLOWED.has(normalized)) {
      throw new InvalidValueError(`Unsupported currency: ${normalized}`);
    }
    return new Currency(normalized);
  }

  equals(other?: ValueObject): boolean {
    return other instanceof Currency && other.value === this.value;
  }

  toString(): string {
    return this.value;
  }
}
