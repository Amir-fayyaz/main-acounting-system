import type { Loaded, WriteReceipt } from '../../../../shared/persistence/repository-ports.js';
import type { Revision } from '../../../../shared/persistence/revision.js';
import type { Supplier } from '../../domain/aggregates/supplier.js';
import type { SupplierId } from '../../domain/value-objects/supplier-id.js';
import type { SupplierStatusValue } from '../../domain/value-objects/supplier-status.js';

export interface ListSuppliersCriteria {
  readonly tenantId: string;
  readonly status?: SupplierStatusValue;
  readonly page: number;
  readonly pageSize: number;
}

export interface SearchSuppliersCriteria {
  readonly tenantId: string;
  readonly query: string;
  readonly status?: SupplierStatusValue;
  readonly page: number;
  readonly pageSize: number;
}

export interface PaginatedSuppliersResult {
  readonly items: readonly Loaded<Supplier>[];
  readonly total: number;
  readonly page: number;
  readonly pageSize: number;
}

/**
 * Persistence contract for the Supplier aggregate, owned by the Supplier module.
 */
export interface SupplierRepository {
  get(tenantId: string, id: SupplierId): Promise<Loaded<Supplier> | undefined>;
  findByTenant(tenantId: string): Promise<readonly Loaded<Supplier>[]>;
  add(supplier: Supplier): Promise<WriteReceipt>;
  update(supplier: Supplier, expectedRevision: Revision): Promise<WriteReceipt>;
  list(criteria: ListSuppliersCriteria): Promise<PaginatedSuppliersResult>;
  search(criteria: SearchSuppliersCriteria): Promise<PaginatedSuppliersResult>;
}
