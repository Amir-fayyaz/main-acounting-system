import { ApiProperty } from '@nestjs/swagger';
import { PaginationMetaDto } from '../../../../infrastructure/api/pagination/pagination.js';
import { TenantMemberResponseDto } from './tenant-member-response.dto.js';

/**
 * The pagination envelope of a tenant's member collection (IAM-003; FND-006).
 *
 * `Paginated<T>` in `api/pagination` is the reusable shape; a concrete class is
 * declared here only because a generic type cannot be described in the generated
 * OpenAPI document without one.
 */
export class PaginatedTenantMembersDto {
  @ApiProperty({ type: () => [TenantMemberResponseDto] })
  data!: TenantMemberResponseDto[];

  @ApiProperty({ type: () => PaginationMetaDto })
  meta!: PaginationMetaDto;
}
