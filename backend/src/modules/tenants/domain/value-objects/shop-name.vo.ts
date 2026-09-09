import { ValueObject } from '@accounting-saas/ddd-core';
import { InvalidShopNameError } from '../errors/invalid-shop-name.error';

/**
 * Shop/store display name of a tenant (BR-TENANT-001). Trimmed, must be
 * non-empty and at most 100 characters.
 */
export class ShopName extends ValueObject {
  private constructor(public readonly value: string) {
    super();
  }

  static of(candidate: string): ShopName {
    if (typeof candidate !== 'string') {
      throw new InvalidShopNameError('Shop name must be a string');
    }
    const normalized = candidate.trim();
    if (normalized.length === 0) {
      throw new InvalidShopNameError('Shop name must not be empty');
    }
    if (normalized.length > 100) {
      throw new InvalidShopNameError('Shop name must not exceed 100 characters');
    }
    return new ShopName(normalized);
  }

  toString(): string {
    return this.value;
  }
}
