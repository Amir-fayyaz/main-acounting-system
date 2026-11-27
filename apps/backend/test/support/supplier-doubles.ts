import {
  Supplier,
  type SupplierSnapshot,
} from '../../src/modules/supplier/domain/aggregates/supplier.js';
import {
  SupplierCodeDuplicateError,
  SupplierIdentificationDuplicateError,
} from '../../src/modules/supplier/domain/errors/supplier.errors.js';
import type { SupplierId } from '../../src/modules/supplier/domain/value-objects/supplier-id.js';
import type {
  ListSuppliersCriteria,
  PaginatedSuppliersResult,
  SearchSuppliersCriteria,
  SupplierRepository,
} from '../../src/modules/supplier/application/ports/supplier-repository.port.js';
import { staleRevisionConflict } from '../../src/shared/persistence/optimistic-concurrency.js';
import {
  PersistenceError,
  PersistenceFailureKind,
} from '../../src/shared/persistence/persistence-error.js';
import type { Loaded, WriteReceipt } from '../../src/shared/persistence/repository-ports.js';
import { Revision } from '../../src/shared/persistence/revision.js';
import { matchesPersianSearch } from '../../src/shared/text/persian-search.js';
import type { TransactionBoundary } from '../../src/shared/transaction/transaction-boundary.js';

export class InMemorySupplierRepository implements SupplierRepository {
  private readonly records = new Map<string, { snapshot: SupplierSnapshot; revision: Revision }>();

  public seed(supplier: Supplier, revision: Revision = Revision.initial()): void {
    this.records.set(supplier.id.value, { snapshot: supplier.snapshot(), revision });
  }

  public async get(tenantId: string, id: SupplierId): Promise<Loaded<Supplier> | undefined> {
    const record = this.records.get(id.value);
    if (record === undefined || record.snapshot.tenantId !== tenantId) {
      return undefined;
    }
    return {
      aggregate: Supplier.rehydrate(record.snapshot),
      revision: record.revision,
    };
  }

  public async findByTenant(tenantId: string): Promise<readonly Loaded<Supplier>[]> {
    const items: Loaded<Supplier>[] = [];
    for (const record of this.records.values()) {
      if (record.snapshot.tenantId === tenantId) {
        items.push({
          aggregate: Supplier.rehydrate(record.snapshot),
          revision: record.revision,
        });
      }
    }
    return items;
  }

  public async add(supplier: Supplier): Promise<WriteReceipt> {
    if (this.records.has(supplier.id.value)) {
      throw new PersistenceError(PersistenceFailureKind.CONFLICT, 'Suppliers.add', {
        cause: new Error('Supplier id already exists'),
      });
    }

    const codeLower = supplier.code.value.toLowerCase();
    for (const record of this.records.values()) {
      if (record.snapshot.tenantId !== supplier.tenantId) continue;
      if (record.snapshot.code.toLowerCase() === codeLower) {
        throw new PersistenceError(PersistenceFailureKind.CONFLICT, 'Suppliers.add.code', {
          cause: new SupplierCodeDuplicateError(supplier.code.value),
        });
      }
      if (
        supplier.identificationNumber !== undefined &&
        record.snapshot.identificationNumber === supplier.identificationNumber.value
      ) {
        throw new PersistenceError(
          PersistenceFailureKind.CONFLICT,
          'Suppliers.add.identification',
          {
            cause: new SupplierIdentificationDuplicateError(
              supplier.identificationNumber?.value ?? '',
            ),
          },
        );
      }
    }

    const revision = Revision.initial();
    this.records.set(supplier.id.value, { snapshot: supplier.snapshot(), revision });
    return { revision };
  }

  public async update(supplier: Supplier, expectedRevision: Revision): Promise<WriteReceipt> {
    const existing = this.records.get(supplier.id.value);
    if (existing === undefined || existing.snapshot.tenantId !== supplier.tenantId) {
      throw staleRevisionConflict('Suppliers.update', expectedRevision);
    }
    if (!existing.revision.equals(expectedRevision)) {
      throw staleRevisionConflict('Suppliers.update', expectedRevision, existing.revision);
    }

    const codeLower = supplier.code.value.toLowerCase();
    for (const record of this.records.values()) {
      if (record.snapshot.id === supplier.id.value) continue;
      if (record.snapshot.tenantId !== supplier.tenantId) continue;
      if (record.snapshot.code.toLowerCase() === codeLower) {
        throw new PersistenceError(PersistenceFailureKind.CONFLICT, 'Suppliers.update.code', {
          cause: new SupplierCodeDuplicateError(supplier.code.value),
        });
      }
      if (
        supplier.identificationNumber !== undefined &&
        record.snapshot.identificationNumber === supplier.identificationNumber.value
      ) {
        throw new PersistenceError(
          PersistenceFailureKind.CONFLICT,
          'Suppliers.update.identification',
          {
            cause: new SupplierIdentificationDuplicateError(
              supplier.identificationNumber?.value ?? '',
            ),
          },
        );
      }
    }

    const nextRevision = expectedRevision.next();
    this.records.set(supplier.id.value, { snapshot: supplier.snapshot(), revision: nextRevision });
    return { revision: nextRevision };
  }

  public async list(criteria: ListSuppliersCriteria): Promise<PaginatedSuppliersResult> {
    const filtered: Loaded<Supplier>[] = [];
    for (const record of this.records.values()) {
      if (record.snapshot.tenantId !== criteria.tenantId) continue;
      if (criteria.status !== undefined && record.snapshot.status !== criteria.status) continue;
      filtered.push({
        aggregate: Supplier.rehydrate(record.snapshot),
        revision: record.revision,
      });
    }

    filtered.sort((a, b) => a.aggregate.code.value.localeCompare(b.aggregate.code.value));
    const start = (criteria.page - 1) * criteria.pageSize;
    return {
      items: filtered.slice(start, start + criteria.pageSize),
      total: filtered.length,
      page: criteria.page,
      pageSize: criteria.pageSize,
    };
  }

  public async search(criteria: SearchSuppliersCriteria): Promise<PaginatedSuppliersResult> {
    const filtered: Loaded<Supplier>[] = [];
    for (const record of this.records.values()) {
      if (record.snapshot.tenantId !== criteria.tenantId) continue;
      if (criteria.status !== undefined && record.snapshot.status !== criteria.status) continue;

      const matches =
        matchesPersianSearch(record.snapshot.name, criteria.query) ||
        matchesPersianSearch(record.snapshot.code, criteria.query) ||
        (record.snapshot.identificationNumber !== undefined &&
          matchesPersianSearch(record.snapshot.identificationNumber, criteria.query));

      if (matches) {
        filtered.push({
          aggregate: Supplier.rehydrate(record.snapshot),
          revision: record.revision,
        });
      }
    }

    filtered.sort((a, b) => a.aggregate.code.value.localeCompare(b.aggregate.code.value));
    const start = (criteria.page - 1) * criteria.pageSize;
    return {
      items: filtered.slice(start, start + criteria.pageSize),
      total: filtered.length,
      page: criteria.page,
      pageSize: criteria.pageSize,
    };
  }
}

export class RecordingTransactionBoundary implements TransactionBoundary {
  public executions = 0;

  public async execute<T>(work: () => Promise<T>): Promise<T> {
    this.executions += 1;
    return work();
  }
}
