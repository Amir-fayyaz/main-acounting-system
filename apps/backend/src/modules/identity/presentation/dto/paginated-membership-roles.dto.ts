import { ApiProperty } from '@nestjs/swagger';
import { PaginationMetaDto } from '../../../../infrastructure/api/pagination/pagination.js';
import { MembershipRoleResponseDto } from './membership-role-response.dto.js';

/**
 * The pagination envelope of a membership's role assignments (IAM-004; FND-006).
 *
 * `Paginated<T>` in `api/pagination` is the reusable shape; a concrete class is
 * declared here only because a generic type cannot be described in the generated
 * OpenAPI document without one.
 */
export class PaginatedMembershipRolesDto {
  @ApiProperty({ type: () => [MembershipRoleResponseDto] })
  data!: MembershipRoleResponseDto[];

  @ApiProperty({ type: () => PaginationMetaDto })
  meta!: PaginationMetaDto;
}
