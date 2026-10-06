import { ApiProperty } from '@nestjs/swagger';
import { PaginationMetaDto } from '../../../../infrastructure/api/pagination/pagination.js';
import { PermissionResponseDto } from './permission-response.dto.js';

/**
 * The pagination envelope of the permission catalog (IAM-004; FND-006).
 *
 * `Paginated<T>` in `api/pagination` is the reusable shape; a concrete class is
 * declared here only because a generic type cannot be described in the generated
 * OpenAPI document without one.
 */
export class PaginatedPermissionsDto {
  @ApiProperty({ type: () => [PermissionResponseDto] })
  data!: PermissionResponseDto[];

  @ApiProperty({ type: () => PaginationMetaDto })
  meta!: PaginationMetaDto;
}
