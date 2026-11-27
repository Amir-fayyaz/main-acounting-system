import type { Revision } from '../../../../shared/persistence/revision.js';
import { DateTime } from '../../../../shared/time/date-time.js';
import { Supplier } from '../../domain/aggregates/supplier.js';
import {
  SupplierContactInfo,
  type SupplierContactInfoProps,
} from '../../domain/value-objects/supplier-contact-info.js';
import { suppliers } from './supplier.schema.js';

/**
 * Bidirectional mapping between the `suppliers` row and the Supplier aggregate
 * (S3; ADR-003 section 16).
 *
 * Persistence and domain stay separate types: storage is relational columns,
 * the aggregate is invariants and value objects, and this file is the only
 * place they meet. Both directions go through the aggregate's own boundary:
 * `Supplier.rehydrate` re-validates every value object, and `Supplier.snapshot`
 * is the only source of the values a write sends.
 *
 * The normalized name is *not* recomputed here. The aggregate already computed
 * it once through the injected S2 normalizer when it was created; recomputing it
 * in the mapper would let the storage form drift from the form the duplicate
 * rule used, which is exactly the mismatch a duplicate check must not have.
 */

/** A stored `suppliers` row. */
export type SupplierRow = typeof suppliers.$inferSelect;

/** The values an insert supplies for one supplier. */
export type SupplierInsertValues = typeof suppliers.$inferInsert;

/** The mutable part of a row: what an update may write. */
export type SupplierUpdateValues = Omit<SupplierInsertValues, 'id' | 'tenantId' | 'createdAt'>;

/** Rebuilds the aggregate from a stored row, re-validating every value object. */
export function toSupplier(row: SupplierRow): Supplier {
  return Supplier.rehydrate({
    id: row.id,
    tenantId: row.tenantId,
    code: row.code,
    name: row.name,
    normalizedName: row.normalizedName,
    identificationNumber: row.identificationNumber ?? undefined,
    contactInfo: toContactInfo(row),
    status: row.status,
    createdAt: DateTime.from(row.createdAt),
    updatedAt: DateTime.from(row.updatedAt),
  });
}

/** The full set of row values for a *new* supplier at the initial revision. */
export function toSupplierRow(supplier: Supplier, revision: Revision): SupplierInsertValues {
  const snapshot = supplier.snapshot();
  const contact = snapshot.contactInfo;

  return {
    id: snapshot.id,
    tenantId: snapshot.tenantId,
    code: snapshot.code,
    name: snapshot.name,
    normalizedName: snapshot.normalizedName,
    identificationNumber: snapshot.identificationNumber ?? null,
    contactPhone: contact?.phone ?? null,
    contactEmail: contact?.email ?? null,
    contactAddress: contact?.address ?? null,
    contactPostalCode: contact?.postalCode ?? null,
    status: snapshot.status,
    revision: revision.value,
    createdAt: snapshot.createdAt.toDate(),
    updatedAt: snapshot.updatedAt.toDate(),
  };
}

/** The values an *update* writes, carrying the revision the CAS should store. */
export function toSupplierUpdateValues(
  supplier: Supplier,
  nextRevision: Revision,
): SupplierUpdateValues {
  const snapshot = supplier.snapshot();
  const contact = snapshot.contactInfo;

  return {
    code: snapshot.code,
    name: snapshot.name,
    normalizedName: snapshot.normalizedName,
    identificationNumber: snapshot.identificationNumber ?? null,
    contactPhone: contact?.phone ?? null,
    contactEmail: contact?.email ?? null,
    contactAddress: contact?.address ?? null,
    contactPostalCode: contact?.postalCode ?? null,
    status: snapshot.status,
    revision: nextRevision.value,
    updatedAt: snapshot.updatedAt.toDate(),
  };
}

/**
 * Rebuilds the optional contact value from its flat columns.
 *
 * `undefined` means "the supplier has no contact block at all"; a block whose
 * every field is `NULL` is the same absence, not four empty strings. The value
 * object normalizes blank strings to absent, so a hand-edited row cannot create
 * a second representation either.
 */
function toContactInfo(row: SupplierRow): SupplierContactInfoProps | undefined {
  if (
    row.contactPhone === null &&
    row.contactEmail === null &&
    row.contactAddress === null &&
    row.contactPostalCode === null
  ) {
    return undefined;
  }

  const contact = SupplierContactInfo.create({
    phone: row.contactPhone,
    email: row.contactEmail,
    address: row.contactAddress,
    postalCode: row.contactPostalCode,
  });
  return contact.toJSON();
}
