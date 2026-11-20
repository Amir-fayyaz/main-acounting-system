import { ApiProperty } from '@nestjs/swagger';
import { PaginationMetaDto } from '../../../../infrastructure/api/pagination/pagination.js';
import { FiscalYearResponseDto } from './fiscal-year-response.dto.js';

/**
 * The pagination envelope of a fiscal year collection (FIS-002; FND-006).
 *
 * `Paginated<T>` in `api/pagination` is the reusable shape; a concrete class is
 * declared here only because a generic type cannot be described in the generated
 * OpenAPI document without one.
 */
export class PaginatedFiscalYearsDto {
  @ApiProperty({ type: () => [FiscalYearResponseDto] })
  data!: FiscalYearResponseDto[];

  @ApiProperty({ type: () => PaginationMetaDto })
  meta!: PaginationMetaDto;
}
