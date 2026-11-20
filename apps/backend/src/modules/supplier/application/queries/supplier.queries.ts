export interface GetSupplierByIdInput {
  readonly id: string;
}

export class GetSupplierByIdQuery {
  public constructor(public readonly payload: GetSupplierByIdInput) {}
}

export interface ListSuppliersInput {
  readonly status?: 'active' | 'inactive' | 'all';
  readonly page?: number;
  readonly pageSize?: number;
}

export class ListSuppliersQuery {
  public constructor(public readonly payload: ListSuppliersInput = {}) {}
}

export interface SearchSuppliersInput {
  readonly query: string;
  readonly limit?: number;
}

export class SearchSuppliersQuery {
  public constructor(public readonly payload: SearchSuppliersInput) {}
}
