import type {
  AddsAggregate,
  Loaded,
  LoadsById,
  UpdatesAggregate,
} from '../../../../shared/persistence/repository-ports.js';
import type { Supplier } from '../aggregates/supplier.js';
import type { SupplierId } from '../value-objects/supplier-id.js';
import type { SupplierCode } from '../value-objects/supplier-code.js';
import type { NormalizedSupplierName } from '../value-objects/normalized-supplier-name.js';
import type { LegalIdentificationNumber } from '../value-objects/legal-identification-number.js';

export interface SupplierListFilter {
  readonly status?: 'active' | 'inactive' | 'all';
  readonly page?: number;
  readonly pageSize?: number;
}

export interface SupplierPageResult {
  readonly items: readonly Loaded<Supplier>[];
  readonly total: number;
  readonly page: number;
  readonly pageSize: number;
  readonly totalPages: number;
}

/**
 * Persistence port for the Supplier aggregate (PUR-001; ADR-003 section 4).
 * Enforces tenant scoping on all queries.
 */
export interface SupplierRepository
  extends LoadsById<SupplierId, Supplier>, AddsAggregate<Supplier>, UpdatesAggregate<Supplier> {
  findByCode(tenantId: string, code: SupplierCode): Promise<Loaded<Supplier> | undefined>;

  findByIdentification(
    tenantId: string,
    identification: LegalIdentificationNumber,
  ): Promise<Loaded<Supplier> | undefined>;

  findByNormalizedName(
    tenantId: string,
    normalizedName: NormalizedSupplierName,
  ): Promise<readonly Loaded<Supplier>[]>;

  list(tenantId: string, filter: SupplierListFilter): Promise<SupplierPageResult>;

  search(tenantId: string, query: string, limit?: number): Promise<readonly Loaded<Supplier>[]>;
}
