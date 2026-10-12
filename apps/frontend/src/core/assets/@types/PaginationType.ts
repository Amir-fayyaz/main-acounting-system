export interface PaginationMeta {
  currentPage: number;
  itemsPerPage: number;
  totalPages: number;
  totalItems: number;
}

export interface PaginationLinks {
  first?: string;
  last?: string;
  previous?: string;
  next?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
  links: PaginationLinks;
}
