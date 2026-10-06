import { ApiProperty } from '@nestjs/swagger';
import { PaginationMetaDto } from '../../../../infrastructure/api/pagination/pagination.js';
import { MembershipResponseDto } from './membership-response.dto.js';

/**
 * The pagination envelope of a membership collection (IAM-003; FND-006).
 *
 * `Paginated<T>` in `api/pagination` is the reusable shape; a concrete class is
 * declared here only because a generic type cannot be described in the generated
 * OpenAPI document without one.
 */
export class PaginatedMembershipsDto {
  @ApiProperty({ type: () => [MembershipResponseDto] })
  data!: MembershipResponseDto[];

  @ApiProperty({ type: () => PaginationMetaDto })
  meta!: PaginationMetaDto;
}
