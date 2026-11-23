import { EntityId } from '../../../../shared/id/entity-id.js';

/**
 * The stable identity of a supplier (PUR-001; ADR-002 section 10).
 *
 * The supplier module does not define a second identifier shape: a supplier id
 * is the shared {@link EntityId} under a nominal alias, exactly like the other
 * module-owned aggregates. The alias keeps call sites readable without letting a
 * tenant id, an account id or any other UUID be passed by accident.
 */
export type SupplierId = EntityId;

/** Wraps an existing supplier id, e.g. one read from storage. */
export function supplierIdFrom(value: string): SupplierId {
  return EntityId.from(value);
}

/** A fresh, globally unique supplier id. */
export function generateSupplierId(): SupplierId {
  return EntityId.generate();
}

/** Whether `value` is a well-formed supplier id. */
export function isSupplierId(value: string): boolean {
  return EntityId.isValid(value);
}
