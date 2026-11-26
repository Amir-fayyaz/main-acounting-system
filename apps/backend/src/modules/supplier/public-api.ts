/**
 * The published contract of the Supplier domain (PUR-001).
 *
 * Cross-module consumers use this file rather than reaching into the domain's
 * folders. Persistence adapters, use cases and the presentation layer are added
 * by later sub-issues; this file is the boundary they will build on.
 */
export { Supplier } from './domain/aggregates/supplier.js';
export type {
  CreateSupplierInput,
  SupplierCreationOutcome,
  SupplierSnapshot,
} from './domain/aggregates/supplier.js';

export {
  SupplierDuplicatePolicy,
  type SupplierDuplicateAssessment,
  type SupplierDuplicateCandidate,
  type SupplierDuplicateDecision,
  type SupplierDuplicateRecord,
  type SupplierNameNormalizer,
} from './domain/policies/supplier-duplicate.policy.js';

export {
  SupplierAlreadyActiveError,
  SupplierAlreadyInactiveError,
  SupplierCodeDuplicateError,
  SupplierIdentificationDuplicateError,
  SupplierInactiveError,
  SupplierNotFoundError,
} from './domain/errors/supplier.errors.js';

export { SupplierCode } from './domain/value-objects/supplier-code.js';
export { SupplierName } from './domain/value-objects/supplier-name.js';
export { SupplierIdentificationNumber } from './domain/value-objects/supplier-identification-number.js';
export {
  SupplierContactInfo,
  type SupplierContactInfoProps,
} from './domain/value-objects/supplier-contact-info.js';
export {
  SupplierStatus,
  type SupplierStatusValue,
} from './domain/value-objects/supplier-status.js';
export {
  generateSupplierId,
  isSupplierId,
  supplierIdFrom,
  type SupplierId,
} from './domain/value-objects/supplier-id.js';

export { SUPPLIER_LOOKUP_PORT } from './application/supplier.tokens.js';
export type {
  SupplierLookupPort,
  SupplierLookupView,
} from './application/ports/supplier-lookup.port.js';
export { SupplierLookupService } from './application/services/supplier-lookup.service.js';
