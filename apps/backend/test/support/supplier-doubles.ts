import { normalizePersianText } from '../../src/shared/normalization/persian-text-normalizer.js';
import { staleRevisionConflict } from '../../src/shared/persistence/optimistic-concurrency.js';
import {
  PersistenceError,
  PersistenceFailureKind,
} from '../../src/shared/persistence/persistence-error.js';
import type { Loaded, WriteReceipt } from '../../src/shared/persistence/repository-ports.js';
import { Revision } from '../../src/shared/persistence/revision.js';
import {
  Supplier,
  type SupplierSnapshot,
} from '../../src/modules/supplier/domain/aggregates/supplier.js';
import type {
  SupplierListFilter,
  SupplierPageResult,
  SupplierRepository,
} from '../../src/modules/supplier/domain/repositories/supplier.repository.js';
import type { SupplierId } from '../../src/modules/supplier/domain/value-objects/supplier-id.js';
import type { SupplierCode } from '../../src/modules/supplier/domain/value-objects/supplier-code.js';
import type { NormalizedSupplierName } from '../../src/modules/supplier/domain/value-objects/normalized-supplier-name.js';
import type { LegalIdentificationNumber } from '../../src/modules/supplier/domain/value-objects/legal-identification-number.js';

export class InMemorySupplierRepository implements SupplierRepository {
  private readonly records = new Map<string, { snapshot: SupplierSnapshot; revision: Revision }>();

  public addCalls = 0;
  public updateCalls = 0;

  public seed(supplier: Supplier, revision = 1): void {
    this.records.set(supplier.id.value, {
      snapshot: supplier.snapshot(),
      revision: Revision.of(revision),
    });
  }

  public clear(): void {
    this.records.clear();
    this.addCalls = 0;
    this.updateCalls = 0;
  }

  public async get(id: SupplierId): Promise<Loaded<Supplier> | undefined> {
    const entry = this.records.get(id.value);
    if (!entry) return undefined;
    return {
      aggregate: Supplier.rehydrate(entry.snapshot),
      revision: entry.revision,
    };
  }

  public async exists(id: SupplierId): Promise<boolean> {
    return this.records.has(id.value);
  }

  public async add(aggregate: Supplier): Promise<WriteReceipt> {
    this.addCalls += 1;
    if (this.records.has(aggregate.id.value)) {
      throw new PersistenceError(PersistenceFailureKind.CONFLICT, 'Supplier.add', {
        cause: `Supplier with id "${aggregate.id.value}" already exists.`,
      });
    }

    // Verify tenant-scoped uniqueness of code
    for (const record of this.records.values()) {
      if (
        record.snapshot.tenantId === aggregate.tenantId &&
        record.snapshot.code.toLowerCase() === aggregate.code.value.toLowerCase()
      ) {
        throw new PersistenceError(PersistenceFailureKind.CONFLICT, 'Supplier.add', {
          cause: `duplicate supplier code: ${aggregate.code.value}`,
        });
      }
      if (
        aggregate.identificationNumber !== undefined &&
        record.snapshot.tenantId === aggregate.tenantId &&
        record.snapshot.identificationNumber === aggregate.identificationNumber.value
      ) {
        throw new PersistenceError(PersistenceFailureKind.CONFLICT, 'Supplier.add', {
          cause: `duplicate supplier identification: ${aggregate.identificationNumber.value}`,
        });
      }
    }

    const initialRevision = Revision.initial();
    this.records.set(aggregate.id.value, {
      snapshot: aggregate.snapshot(),
      revision: initialRevision,
    });

    return { revision: initialRevision };
  }

  public async update(aggregate: Supplier, expectedRevision: Revision): Promise<WriteReceipt> {
    this.updateCalls += 1;
    const current = this.records.get(aggregate.id.value);
    if (!current) {
      throw new PersistenceError(PersistenceFailureKind.CONFLICT, 'Supplier.update', {
        cause: `Supplier "${aggregate.id.value}" does not exist.`,
      });
    }

    if (!current.revision.equals(expectedRevision)) {
      throw staleRevisionConflict('Supplier.update', expectedRevision, current.revision);
    }

    // Verify tenant-scoped uniqueness of code and identification for other records
    for (const [id, record] of this.records.entries()) {
      if (id === aggregate.id.value) continue;
      if (
        record.snapshot.tenantId === aggregate.tenantId &&
        record.snapshot.code.toLowerCase() === aggregate.code.value.toLowerCase()
      ) {
        throw new PersistenceError(PersistenceFailureKind.CONFLICT, 'Supplier.update', {
          cause: `duplicate supplier code: ${aggregate.code.value}`,
        });
      }
      if (
        aggregate.identificationNumber !== undefined &&
        record.snapshot.tenantId === aggregate.tenantId &&
        record.snapshot.identificationNumber === aggregate.identificationNumber.value
      ) {
        throw new PersistenceError(PersistenceFailureKind.CONFLICT, 'Supplier.update', {
          cause: `duplicate supplier identification: ${aggregate.identificationNumber.value}`,
        });
      }
    }

    const nextRevision = expectedRevision.next();
    this.records.set(aggregate.id.value, {
      snapshot: aggregate.snapshot(),
      revision: nextRevision,
    });

    return { revision: nextRevision };
  }

  public async findByCode(
    tenantId: string,
    code: SupplierCode,
  ): Promise<Loaded<Supplier> | undefined> {
    for (const record of this.records.values()) {
      if (
        record.snapshot.tenantId === tenantId &&
        record.snapshot.code.toLowerCase() === code.value.toLowerCase()
      ) {
        return {
          aggregate: Supplier.rehydrate(record.snapshot),
          revision: record.revision,
        };
      }
    }
    return undefined;
  }

  public async findByIdentification(
    tenantId: string,
    identification: LegalIdentificationNumber,
  ): Promise<Loaded<Supplier> | undefined> {
    for (const record of this.records.values()) {
      if (
        record.snapshot.tenantId === tenantId &&
        record.snapshot.identificationNumber === identification.value
      ) {
        return {
          aggregate: Supplier.rehydrate(record.snapshot),
          revision: record.revision,
        };
      }
    }
    return undefined;
  }

  public async findByNormalizedName(
    tenantId: string,
    normalizedName: NormalizedSupplierName,
  ): Promise<readonly Loaded<Supplier>[]> {
    const results: Loaded<Supplier>[] = [];
    for (const record of this.records.values()) {
      if (
        record.snapshot.tenantId === tenantId &&
        record.snapshot.normalizedName === normalizedName.value
      ) {
        results.push({
          aggregate: Supplier.rehydrate(record.snapshot),
          revision: record.revision,
        });
      }
    }
    return results;
  }

  public async list(tenantId: string, filter: SupplierListFilter): Promise<SupplierPageResult> {
    const filtered: Loaded<Supplier>[] = [];

    for (const record of this.records.values()) {
      if (record.snapshot.tenantId !== tenantId) continue;
      if (filter.status === 'active' && record.snapshot.status !== 'active') continue;
      if (filter.status === 'inactive' && record.snapshot.status !== 'inactive') continue;

      filtered.push({
        aggregate: Supplier.rehydrate(record.snapshot),
        revision: record.revision,
      });
    }

    // Sort by code ascending
    filtered.sort((a, b) => a.aggregate.code.value.localeCompare(b.aggregate.code.value));

    const page = Math.max(1, filter.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, filter.pageSize ?? 20));
    const total = filtered.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const slice = filtered.slice((page - 1) * pageSize, page * pageSize);

    return {
      items: slice,
      total,
      page,
      pageSize,
      totalPages,
    };
  }

  public async search(
    tenantId: string,
    query: string,
    limit = 20,
  ): Promise<readonly Loaded<Supplier>[]> {
    const normalizedQuery = normalizePersianText(query).toLowerCase();
    const results: Loaded<Supplier>[] = [];

    for (const record of this.records.values()) {
      if (record.snapshot.tenantId !== tenantId) continue;

      const normName = record.snapshot.normalizedName.toLowerCase();
      const code = record.snapshot.code.toLowerCase();
      const idNum = record.snapshot.identificationNumber?.toLowerCase() ?? '';

      if (
        normName.includes(normalizedQuery) ||
        code.includes(normalizedQuery) ||
        idNum.includes(normalizedQuery)
      ) {
        results.push({
          aggregate: Supplier.rehydrate(record.snapshot),
          revision: record.revision,
        });
        if (results.length >= limit) break;
      }
    }

    return results;
  }
}
