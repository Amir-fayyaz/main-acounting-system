import { and, asc, count, eq, like, type SQL } from 'drizzle-orm';

import type { Database } from '../../../../infrastructure/database/database.module.js';
import { scopedDatabase } from '../../../../infrastructure/database/scoped-database.js';
import {
  assertTenantCriterion,
  assertTenantOwnership,
  tenantEq,
} from '../../../../infrastructure/database/tenant-scoped.js';
import { staleRevisionConflict } from '../../../../shared/persistence/optimistic-concurrency.js';
import {
  PersistenceError,
  PersistenceFailureKind,
} from '../../../../shared/persistence/persistence-error.js';
import type { Loaded, WriteReceipt } from '../../../../shared/persistence/repository-ports.js';
import { Revision } from '../../../../shared/persistence/revision.js';
import { normalizePersianSearch } from '../../../../shared/text/persian-search.js';
import type { Supplier } from '../../domain/aggregates/supplier.js';
import {
  SupplierCodeDuplicateError,
  SupplierIdentificationDuplicateError,
} from '../../domain/errors/supplier.errors.js';
import type { SupplierId } from '../../domain/value-objects/supplier-id.js';
import type {
  ListSuppliersCriteria,
  PaginatedSuppliersResult,
  SearchSuppliersCriteria,
  SupplierRepository,
} from '../../application/ports/supplier-repository.port.js';
import {
  toSupplier,
  toSupplierRow,
  toSupplierUpdateValues,
  type SupplierRow,
} from './supplier.mapper.js';
import {
  SUPPLIERS_TENANT_CODE_UNIQUE,
  SUPPLIERS_TENANT_IDENTIFICATION_UNIQUE,
  suppliers,
} from './supplier.schema.js';

/**
 * Drizzle/MySQL implementation of the supplier persistence port (S3; SHR-004,
 * SHR-008; IAM-007).
 *
 * Three properties make the adapter correct rather than convenient:
 *
 * - **Every statement is tenant-filtered through the central mechanism.** Reads
 *   prove the criterion with `assertTenantCriterion` and narrow on the tenant
 *   column (or take the ambient tenant through `tenantEq`); writes call
 *   `assertTenantOwnership` immediately before the statement. The adapter never
 *   invents its own `where` on a tenant id the caller supplied, and with no
 *   scope it fails closed (IAM-007; doc 26).
 * - **`update` is one compare-and-swap.** The revision check and the write are
 *   the same statement; zero affected rows is the shared
 *   `staleRevisionConflict` (SHR-008), not a silent overwrite.
 * - **Driver vocabulary stops here.** Duplicate keys are translated into the
 *   supplier's own `SUPPLIER_CODE_DUPLICATE` / `SUPPLIER_IDENTIFICATION_DUPLICATE`
 *   errors, carried as the cause of a `PersistenceError` (the fiscal-year
 *   precedent). No SQL state, constraint text or driver message is returned,
 *   logged or serialized: `PersistenceError.toJSON` deliberately drops the cause.
 *
 * Search uses the stored `normalized_name` column and the tenant-leading index
 * from the schema. The query text itself goes through the same S2 normalizer, so
 * `بانك` finds `بانک` and Persian digits find ASCII ones. This is intentionally
 * the indexed starting point the ticket asks for; code/identification matching
 * stays with the in-memory double until a measured decision adds it.
 */
export class DrizzleSupplierRepository implements SupplierRepository {
  public constructor(private readonly database: Database) {}

  public async get(tenantId: string, id: SupplierId): Promise<Loaded<Supplier> | undefined> {
    assertTenantCriterion(tenantId, 'SupplierRepository.get');

    const rows = await scopedDatabase(this.database)
      .select()
      .from(suppliers)
      .where(and(eq(suppliers.id, id.value), tenantEq(suppliers.tenantId)))
      .limit(1);

    return toLoaded(rows[0]);
  }

  public async findByTenant(tenantId: string): Promise<readonly Loaded<Supplier>[]> {
    assertTenantCriterion(tenantId, 'SupplierRepository.findByTenant');

    const rows = await scopedDatabase(this.database)
      .select()
      .from(suppliers)
      .where(eq(suppliers.tenantId, tenantId))
      .orderBy(asc(suppliers.code));

    return rows.map(toLoadedAggregate);
  }

  public async add(supplier: Supplier): Promise<WriteReceipt> {
    assertTenantOwnership(supplier.tenantId, 'SupplierRepository.add');

    try {
      await scopedDatabase(this.database)
        .insert(suppliers)
        .values(toSupplierRow(supplier, Revision.initial()));
    } catch (error) {
      throw translateWriteFailure(error, 'SupplierRepository.add', supplier) ?? error;
    }

    return { revision: Revision.initial() };
  }

  public async update(supplier: Supplier, expectedRevision: Revision): Promise<WriteReceipt> {
    assertTenantOwnership(supplier.tenantId, 'SupplierRepository.update');

    let header;
    try {
      [header] = await scopedDatabase(this.database)
        .update(suppliers)
        .set(toSupplierUpdateValues(supplier, expectedRevision.next()))
        .where(
          and(
            eq(suppliers.id, supplier.id.value),
            eq(suppliers.revision, expectedRevision.value),
            tenantEq(suppliers.tenantId),
          ),
        );
    } catch (error) {
      throw translateWriteFailure(error, 'SupplierRepository.update', supplier) ?? error;
    }

    if (header.affectedRows === 0) {
      throw staleRevisionConflict('SupplierRepository.update', expectedRevision);
    }

    return { revision: expectedRevision.next() };
  }

  public async list(criteria: ListSuppliersCriteria): Promise<PaginatedSuppliersResult> {
    assertTenantCriterion(criteria.tenantId, 'SupplierRepository.list');

    const filters = and(
      eq(suppliers.tenantId, criteria.tenantId),
      criteria.status === undefined ? undefined : eq(suppliers.status, criteria.status),
    );

    return this.page(filters, criteria.page, criteria.pageSize);
  }

  public async search(criteria: SearchSuppliersCriteria): Promise<PaginatedSuppliersResult> {
    assertTenantCriterion(criteria.tenantId, 'SupplierRepository.search');

    const normalizedQuery = normalizePersianSearch(criteria.query);
    const filters = and(
      eq(suppliers.tenantId, criteria.tenantId),
      criteria.status === undefined ? undefined : eq(suppliers.status, criteria.status),
      normalizedQuery === ''
        ? undefined
        : like(suppliers.normalizedName, `%${escapeLikePattern(normalizedQuery)}%`),
    );

    return this.page(filters, criteria.page, criteria.pageSize);
  }

  /** The one paginated read shape both listing and searching use. */
  private async page(
    filters: SQL | undefined,
    page: number,
    pageSize: number,
  ): Promise<PaginatedSuppliersResult> {
    const rows = await scopedDatabase(this.database)
      .select()
      .from(suppliers)
      .where(filters)
      .orderBy(asc(suppliers.code))
      .limit(pageSize)
      .offset((page - 1) * pageSize);

    const [{ total }] = await scopedDatabase(this.database)
      .select({ total: count() })
      .from(suppliers)
      .where(filters);

    return {
      items: rows.map(toLoadedAggregate),
      total,
      page,
      pageSize,
    };
  }
}

/** Maps a row to the port's loaded shape, or `undefined` for no row. */
function toLoaded(row: SupplierRow | undefined): Loaded<Supplier> | undefined {
  return row === undefined ? undefined : toLoadedAggregate(row);
}

/** Maps a row to the aggregate plus the revision it was read at. */
function toLoadedAggregate(row: SupplierRow): Loaded<Supplier> {
  return { aggregate: toSupplier(row), revision: Revision.of(row.revision) };
}

/**
 * Escapes the `LIKE` metacharacters a user can type, so a search for `100%`
 * looks for that text instead of matching every supplier. MySQL's default
 * escape character is a backslash.
 */
function escapeLikePattern(value: string): string {
  return value.replace(/[\\%_]/g, (character) => `\\${character}`);
}

/**
 * Translates the refusals the database can issue for a supplier write, or
 * returns `undefined` for anything the adapter cannot classify — which then
 * propagates untouched rather than being guessed at.
 *
 * - `suppliers_tenant_code_unique` → `CONFLICT` caused by
 *   `SupplierCodeDuplicateError`;
 * - `suppliers_tenant_identification_unique` → `CONFLICT` caused by
 *   `SupplierIdentificationDuplicateError`;
 * - any other duplicate key (for example a primary-key race) → `CONFLICT` with
 *   the driver error as cause, because it is not one of this module's business
 *   rules;
 * - a refused constraint (the status check) → `REJECTED`: the store refused the
 *   shape and nothing was applied.
 *
 * The driver's own message is read only to pick the right supplier error; it is
 * never copied into the raised error's message or details.
 */
function translateWriteFailure(
  error: unknown,
  operation: string,
  supplier: Supplier,
): PersistenceError | undefined {
  const duplicate = findDriverError(error, 'ER_DUP_ENTRY');
  if (duplicate !== undefined) {
    const driverText = driverMessage(duplicate);
    if (driverText.includes(SUPPLIERS_TENANT_IDENTIFICATION_UNIQUE)) {
      return new PersistenceError(PersistenceFailureKind.CONFLICT, operation, {
        cause: new SupplierIdentificationDuplicateError(supplier.identificationNumber?.value ?? ''),
      });
    }
    if (driverText.includes(SUPPLIERS_TENANT_CODE_UNIQUE)) {
      return new PersistenceError(PersistenceFailureKind.CONFLICT, operation, {
        cause: new SupplierCodeDuplicateError(supplier.code.value),
      });
    }
    return new PersistenceError(PersistenceFailureKind.CONFLICT, operation, { cause: error });
  }

  if (findDriverError(error, 'ER_CHECK_CONSTRAINT_VIOLATED') !== undefined) {
    return new PersistenceError(PersistenceFailureKind.REJECTED, operation, { cause: error });
  }

  return undefined;
}

/**
 * Finds the driver failure with `code` in the wrapped chain (depth bounded at
 * five). Drizzle raises its own error and keeps the MySQL failure as the cause,
 * so reading only the outermost error would let a duplicate escape as an
 * unexpected 500 instead of a translated supplier conflict.
 */
function findDriverError(error: unknown, code: string): unknown {
  let current: unknown = error;

  for (let depth = 0; depth < 5 && typeof current === 'object' && current !== null; depth += 1) {
    if ((current as { readonly code?: unknown }).code === code) {
      return current;
    }
    current = (current as { readonly cause?: unknown }).cause;
  }

  return undefined;
}

/** Reads the driver's message for internal classification only. */
function driverMessage(error: unknown): string {
  const candidate = error as { readonly sqlMessage?: unknown; readonly message?: unknown };
  const text = candidate.sqlMessage ?? candidate.message;
  return typeof text === 'string' ? text : '';
}
