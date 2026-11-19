import type { Supplier } from '../../domain/aggregates/supplier.js';

export interface SupplierContactInfoView {
  readonly phone?: string;
  readonly email?: string;
  readonly address?: string;
  readonly postalCode?: string;
}

export interface SupplierView {
  readonly id: string;
  readonly code: string;
  readonly name: string;
  readonly normalizedName: string;
  readonly identificationNumber?: string;
  readonly contactInfo?: SupplierContactInfoView;
  readonly status: 'active' | 'inactive';
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly revision: number;
}

export interface PossibleDuplicateSupplierView {
  readonly id: string;
  readonly code: string;
  readonly name: string;
  readonly normalizedName: string;
  readonly identificationNumber?: string;
  readonly status: 'active' | 'inactive';
}

export interface SupplierPageView {
  readonly items: readonly SupplierView[];
  readonly total: number;
  readonly page: number;
  readonly pageSize: number;
  readonly totalPages: number;
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

export function toSupplierView(supplier: Supplier, revision: number): SupplierView {
  const snapshot = supplier.snapshot();
  return {
    id: snapshot.id,
    code: snapshot.code,
    name: snapshot.name,
    normalizedName: snapshot.normalizedName,
    identificationNumber: snapshot.identificationNumber ?? undefined,
    contactInfo: snapshot.contactInfo
      ? {
          phone: snapshot.contactInfo.phone ?? undefined,
          email: snapshot.contactInfo.email ?? undefined,
          address: snapshot.contactInfo.address ?? undefined,
          postalCode: snapshot.contactInfo.postalCode ?? undefined,
        }
      : undefined,
    status: snapshot.status,
    createdAt: snapshot.createdAt,
    updatedAt: snapshot.updatedAt,
    revision,
  };
}

export function toPossibleDuplicateView(supplier: Supplier): PossibleDuplicateSupplierView {
  const snapshot = supplier.snapshot();
  return {
    id: snapshot.id,
    code: snapshot.code,
    name: snapshot.name,
    normalizedName: snapshot.normalizedName,
    identificationNumber: snapshot.identificationNumber ?? undefined,
    status: snapshot.status,
  };
}
