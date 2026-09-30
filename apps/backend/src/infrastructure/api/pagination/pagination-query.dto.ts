import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

/**
 * The query parameters of any paginated list endpoint (FND-006, ADR-013
 * section 10).
 *
 * A module reuses this DTO instead of redeclaring `page`/`limit`, so the bounds
 * and the serialized metadata stay identical across the API. `@Type(() => Number)`
 * is required because implicit conversion is disabled in the validation pipe: a
 * query string is converted only where it is explicitly requested.
 */
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

export class PaginationQueryDto {
  @ApiPropertyOptional({
    description: '1-based page number.',
    minimum: 1,
    default: 1,
    example: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @ApiPropertyOptional({
    description: `Items per page (1–${MAX_PAGE_SIZE}).`,
    minimum: 1,
    maximum: MAX_PAGE_SIZE,
    default: DEFAULT_PAGE_SIZE,
    example: DEFAULT_PAGE_SIZE,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_PAGE_SIZE)
  limit: number = DEFAULT_PAGE_SIZE;
}
