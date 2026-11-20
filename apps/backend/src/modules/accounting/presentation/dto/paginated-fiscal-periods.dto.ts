import { ApiProperty } from '@nestjs/swagger';
import { PaginationMetaDto } from '../../../../infrastructure/api/pagination/pagination.js';
import { FiscalPeriodResponseDto } from './fiscal-period-response.dto.js';

/**
 * The pagination envelope of a fiscal period collection (FIS-004; FND-006).
 *
 * `Paginated<T>` in `api/pagination` is the reusable shape; a concrete class is
 * declared here only because a generic type cannot be described in the generated
 * OpenAPI document without one.
 */
export class PaginatedFiscalPeriodsDto {
  @ApiProperty({ type: () => [FiscalPeriodResponseDto] })
  data!: FiscalPeriodResponseDto[];

  @ApiProperty({ type: () => PaginationMetaDto })
  meta!: PaginationMetaDto;
}
