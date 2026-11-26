import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../../../infrastructure/api/pagination/pagination-query.dto.js';

/**
 * Query parameters for listing and searching suppliers (S5; FND-006; 13-api-conventions).
 *
 * Inherits page and limit with default 1 and 20 (max 100).
 */
export class ListSuppliersQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    description: 'Filter suppliers by status (active, inactive, or all)',
    enum: ['active', 'inactive', 'all'],
    example: 'active',
  })
  @IsOptional()
  @IsIn(['active', 'inactive', 'all'])
  status?: 'active' | 'inactive' | 'all';

  @ApiPropertyOptional({
    description: 'Search text for supplier name, code, or identification number',
    example: 'پارس',
  })
  @IsOptional()
  @IsString()
  search?: string;
}
