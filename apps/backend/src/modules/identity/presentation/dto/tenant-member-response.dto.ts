import { ApiProperty } from '@nestjs/swagger';

/**
 * The read shape of a tenant's member (IAM-003; FND-006).
 *
 * Reading the members of a tenant means reading users through their memberships:
 * the membership supplies the relationship and its lifecycle state, and the
 * referenced user supplies the display attributes. Membership state and user
 * state are serialized separately, so a client can tell an inactive membership
 * apart from an inactive user.
 */
export class TenantMemberResponseDto {
  @ApiProperty({ description: 'The stable membership identity (UUID).' })
  membershipId!: string;

  @ApiProperty({ enum: ['active', 'inactive'], description: "The membership's lifecycle status." })
  status!: 'active' | 'inactive';

  @ApiProperty({ description: 'The stable identity of the member user (UUID).' })
  userId!: string;

  @ApiProperty({ description: "The member's display name." })
  displayName!: string;

  @ApiProperty({ description: "The member's primary contact email." })
  email!: string;

  @ApiProperty({ enum: ['active', 'inactive'], description: "The user's own lifecycle status." })
  userStatus!: 'active' | 'inactive';

  @ApiProperty({ description: 'When the membership was created (UTC).' })
  createdAt!: string;

  @ApiProperty({ description: 'When the membership was last updated (UTC).' })
  updatedAt!: string;

  @ApiProperty({ description: 'The optimistic-concurrency revision of the membership.' })
  revision!: number;
}
