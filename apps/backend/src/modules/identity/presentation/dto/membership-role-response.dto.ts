import { ApiProperty } from '@nestjs/swagger';

/**
 * The standard read shape of a membership-role assignment (IAM-004; FND-006).
 *
 * It names the assignment, the role it holds and the role's current name and
 * state, so a client showing "the roles of this membership" does not have to
 * fetch each role. `status` is the *assignment* state (is the role currently
 * held?) and `roleStatus` is the *role* state (is the role itself in use?) —
 * deliberately separate, because a role can be deactivated while its assignments
 * remain as history.
 */
export class MembershipRoleResponseDto {
  @ApiProperty({ description: 'The stable assignment identity (UUID).' })
  id!: string;

  @ApiProperty({ description: 'The membership that holds (or held) the role (UUID).' })
  membershipId!: string;

  @ApiProperty({ description: 'The role that is (or was) held (UUID).' })
  roleId!: string;

  @ApiProperty({ description: "The role's current name." })
  roleName!: string;

  @ApiProperty({ enum: ['active', 'inactive'], description: "The role's own lifecycle status." })
  roleStatus!: 'active' | 'inactive';

  @ApiProperty({
    enum: ['active', 'inactive'],
    description: 'The assignment status: whether the role is currently held.',
  })
  status!: 'active' | 'inactive';

  @ApiProperty({ description: 'When the assignment was created (UTC).' })
  createdAt!: string;

  @ApiProperty({ description: 'When the assignment was last updated (UTC).' })
  updatedAt!: string;

  @ApiProperty({ description: 'The optimistic-concurrency revision of the record.' })
  revision!: number;
}
