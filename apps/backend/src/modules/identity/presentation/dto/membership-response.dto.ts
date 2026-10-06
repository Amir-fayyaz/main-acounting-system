import { ApiProperty } from '@nestjs/swagger';

/**
 * The standard read shape of a membership (IAM-003; FND-006).
 *
 * It follows FND-006 serialization: ids as bare UUID strings, dates as ISO-8601
 * UTC, enums as strings. The resource carries the identities the relationship
 * refers to — the user and the tenant — and no business data copied from either.
 */
export class MembershipResponseDto {
  @ApiProperty({ description: 'The stable membership identity (UUID).' })
  id!: string;

  @ApiProperty({ description: 'The stable identity of the member user (UUID).' })
  userId!: string;

  @ApiProperty({ description: 'The stable identity of the tenant (UUID).' })
  tenantId!: string;

  @ApiProperty({ enum: ['active', 'inactive'], description: "The membership's lifecycle status." })
  status!: 'active' | 'inactive';

  @ApiProperty({ description: 'When the membership was created (UTC).' })
  createdAt!: string;

  @ApiProperty({ description: 'When the membership was last updated (UTC).' })
  updatedAt!: string;

  @ApiProperty({ description: 'The optimistic-concurrency revision of the record.' })
  revision!: number;
}
