import { normalizePersianText } from '../../../../shared/normalization/persian-text-normalizer.js';
import type { SupplierName } from './supplier-name.js';

/**
 * Normalized name used for duplicate detection and phonetic/spelling-tolerant search (PUR-BR-005).
 */
export class NormalizedSupplierName {
  public readonly value: string;

  private constructor(value: string) {
    this.value = value;
  }

  public static from(raw: string): NormalizedSupplierName {
    const normalized = normalizePersianText(raw);
    return new NormalizedSupplierName(normalized);
  }

  public static fromSupplierName(name: SupplierName): NormalizedSupplierName {
    return NormalizedSupplierName.from(name.value);
  }

  public equals(other: unknown): boolean {
    return other instanceof NormalizedSupplierName && other.value === this.value;
  }

  public toString(): string {
    return this.value;
  }
}
