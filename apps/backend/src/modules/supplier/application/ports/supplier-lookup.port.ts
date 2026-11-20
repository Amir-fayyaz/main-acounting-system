import type { DomainError } from '../../../../shared/errors/domain-error.js';
import type { Result } from '../../../../shared/errors/result.js';

export interface SupplierLookupView {
  readonly id: string;
  readonly code: string;
  readonly name: string;
  readonly status: 'active';
}

/**
 * Public lookup contract for other modules (PUR-001; ADR-002 section 12).
 * Resolves a supplier by identity and asserts that it is active.
 */
export interface SupplierLookup {
  /**
   * Resolves an active supplier by ID for the given tenant.
   * - If not found (or in a different tenant): fails with `SUPPLIER_NOT_FOUND`
   * - If found but inactive: fails with `SUPPLIER_INACTIVE`
   * - If found and active: succeeds with `SupplierLookupView`
   */
  resolveActiveSupplier(
    tenantId: string,
    supplierId: string,
  ): Promise<Result<SupplierLookupView, DomainError>>;
}
