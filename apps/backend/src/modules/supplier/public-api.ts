/**
 * The published contract of the Supplier capability (PUR-001; ADR-002 section 12).
 *
 * Only cross-module lookup and consumer errors are exported.
 * Internal aggregates, repositories, and persistence details are intentionally not exposed.
 */
export type {
  SupplierLookup,
  SupplierLookupView,
} from './application/ports/supplier-lookup.port.js';

export { SUPPLIER_LOOKUP } from './application/supplier.tokens.js';

export { SupplierNotFoundError, SupplierInactiveError } from './domain/errors/supplier.errors.js';
