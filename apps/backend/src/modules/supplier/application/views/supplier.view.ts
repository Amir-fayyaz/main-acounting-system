import type { Supplier } from '../../domain/aggregates/supplier.js';
import type { SupplierDuplicateRecord } from '../../domain/policies/supplier-duplicate.policy.js';
import type { SupplierStatusValue } from '../../domain/value-objects/supplier-status.js';

export interface SupplierContactInfoView {
  readonly phone?: string;
  readonly email?: string;
  readonly address?: string;
  readonly postalCode?: string;
}

export interface SupplierView {
  readonly id: string;
  readonly tenantId: string;
  readonly code: string;
  readonly name: string;
  readonly normalizedName: string;
  readonly identificationNumber?: string;
  readonly contactInfo?: SupplierContactInfoView;
  readonly status: SupplierStatusValue;
  readonly revision: number;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface PossibleDuplicateSupplierView {
  readonly id: string;
  readonly code: string;
  readonly name: string;
  readonly normalizedName: string;
  readonly identificationNumber?: string;
}

export type CreateSupplierResult =
  | {
      readonly status: 'created';
      readonly supplier: SupplierView;
    }
  | {
      readonly status: 'possible_duplicates';
      readonly duplicates: readonly PossibleDuplicateSupplierView[];
    };

export interface PaginatedSuppliersView {
  readonly items: readonly SupplierView[];
  readonly total: number;
  readonly page: number;
  readonly pageSize: number;
}

export function toSupplierView(supplier: Supplier, revision: number): SupplierView {
  const contact = supplier.contactInfo?.toJSON();
  return {
    id: supplier.id.value,
    tenantId: supplier.tenantId,
    code: supplier.code.value,
    name: supplier.name.value,
    normalizedName: supplier.normalizedName,
    identificationNumber: supplier.identificationNumber?.value,
    contactInfo: contact
      ? {
          phone: contact.phone ?? undefined,
          email: contact.email ?? undefined,
          address: contact.address ?? undefined,
          postalCode: contact.postalCode ?? undefined,
        }
      : undefined,
    status: supplier.status.value,
    revision,
    createdAt: supplier.createdAt.toIsoString(),
    updatedAt: supplier.updatedAt.toIsoString(),
  };
}

export function toPossibleDuplicateView(
  record: SupplierDuplicateRecord,
): PossibleDuplicateSupplierView {
  return {
    id: record.id.value,
    code: record.code.value,
    name: record.name.value,
    normalizedName: record.normalizedName,
    identificationNumber: record.identificationNumber?.value,
  };
}
