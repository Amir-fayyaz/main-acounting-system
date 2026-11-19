import { EntityId } from '../../../../shared/id/entity-id.js';

/**
 * The stable identity of a supplier (PUR-001; ADR-002 section 10).
 */
export type SupplierId = EntityId;

export function supplierIdFrom(value: string): SupplierId {
  return EntityId.from(value);
}

export function generateSupplierId(): SupplierId {
  return EntityId.generate();
}

export function isSupplierId(value: string): boolean {
  return EntityId.isValid(value);
}
