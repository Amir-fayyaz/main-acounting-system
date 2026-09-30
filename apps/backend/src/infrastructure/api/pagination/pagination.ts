import { ApiProperty } from '@nestjs/swagger';
import type { PaginationQueryDto } from './pagination-query.dto.js';

/**
 * The reusable pagination contract (FND-006, ADR-013 section 10).
 *
 * A list endpoint returns `{ data, meta }` exactly as defined here; a module may
 * adopt it where pagination applies and must not invent a different shape. The
 * page numbers are 1-based, which is what a client UI expects.
 */

/** Page metadata. A class (not just a type) so OpenAPI can describe it. */
export class PaginationMetaDto {
  @ApiProperty({ description: '1-based page number.', minimum: 1, example: 1 })
  page!: number;

  @ApiProperty({ description: 'Maximum number of items per page.', minimum: 1, example: 20 })
  limit!: number;

  @ApiProperty({ description: 'Total number of items across all pages.', minimum: 0, example: 42 })
  total!: number;

  @ApiProperty({
    description: 'Total number of pages; 0 when the collection is empty.',
    minimum: 0,
    example: 3,
  })
  totalPages!: number;
}

/** The shape every paginated list response shares. */
export interface Paginated<T> {
  readonly data: readonly T[];
  readonly meta: PaginationMetaDto;
}

export function paginationMeta(total: number, query: PaginationQueryDto): PaginationMetaDto {
  const meta = new PaginationMetaDto();
  meta.page = query.page;
  meta.limit = query.limit;
  meta.total = total;
  meta.totalPages = total === 0 ? 0 : Math.ceil(total / query.limit);

  return meta;
}

/** Slices an in-memory collection into the standard envelope. */
export function paginate<T>(items: readonly T[], query: PaginationQueryDto): Paginated<T> {
  const start = (query.page - 1) * query.limit;

  return {
    data: items.slice(start, start + query.limit),
    meta: paginationMeta(items.length, query),
  };
}
