import type { DomainError } from '../../../../shared/errors/domain-error.js';
import type { Result } from '../../../../shared/errors/result.js';
import type { SupplierStatusValue } from '../../domain/value-objects/supplier-status.js';

export interface SupplierLookupView {
  readonly id: string;
  readonly tenantId: string;
  readonly code: string;
  readonly name: string;
  readonly status: SupplierStatusValue;
}

/**
 * Cross-module public interface for resolving and verifying a supplier's usability.
 * Fails with `SUPPLIER_NOT_FOUND` or `SUPPLIER_INACTIVE`.
 */
export interface SupplierLookupPort {
  resolveActive(
    tenantId: string,
    supplierId: string,
  ): Promise<Result<SupplierLookupView, DomainError>>;
}
