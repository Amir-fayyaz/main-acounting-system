import { ApiProperty } from '@nestjs/swagger';
import { PaginationMetaDto } from '../../../../infrastructure/api/pagination/pagination.js';
import { SupplierResponseDto } from './supplier-response.dto.js';

/**
 * The pagination envelope for supplier collections (S5; FND-006; 13-api-conventions).
 */
export class PaginatedSuppliersDto {
  @ApiProperty({
    description: 'Array of suppliers for the current page',
    type: () => [SupplierResponseDto],
  })
  data!: SupplierResponseDto[];

  @ApiProperty({
    description: 'Pagination metadata',
    type: () => PaginationMetaDto,
  })
  meta!: PaginationMetaDto;
}
