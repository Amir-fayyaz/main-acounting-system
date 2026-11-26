import type { SupplierStatusValue } from '../../domain/value-objects/supplier-status.js';
import type { SupplierActorPrincipal } from '../ports/supplier-authorization.port.js';

export interface GetSupplierByIdInput {
  readonly id: string;
  readonly principal?: SupplierActorPrincipal;
}

export class GetSupplierByIdQuery {
  public constructor(public readonly payload: GetSupplierByIdInput) {}
}

export interface ListSuppliersInput {
  readonly status?: SupplierStatusValue | 'all';
  readonly page?: number;
  readonly pageSize?: number;
  readonly principal?: SupplierActorPrincipal;
}

export class ListSuppliersQuery {
  public constructor(public readonly payload: ListSuppliersInput = {}) {}
}

export interface SearchSuppliersInput {
  readonly query: string;
  readonly status?: SupplierStatusValue | 'all';
  readonly page?: number;
  readonly pageSize?: number;
  readonly principal?: SupplierActorPrincipal;
}

export class SearchSuppliersQuery {
  public constructor(public readonly payload: SearchSuppliersInput) {}
}
