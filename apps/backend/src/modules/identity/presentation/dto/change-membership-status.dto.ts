import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsInt, Min } from 'class-validator';

/**
 * Request body for `POST /api/v1/tenants/:tenantId/memberships/:membershipId/status`
 * (IAM-003; FND-006).
 *
 * `status` must be one of the two defined lifecycle states — an unknown state is
 * a client mistake and is rejected before a use case runs. `expectedRevision` is
 * required for optimistic-concurrency protection.
 */
export class ChangeMembershipStatusDto {
  @ApiProperty({
    enum: ['active', 'inactive'],
    description: 'The target lifecycle status.',
    example: 'inactive',
  })
  @IsIn(['active', 'inactive'])
  status!: 'active' | 'inactive';

  @ApiProperty({
    description: 'The revision the client last read; the write is refused if it moved.',
    minimum: 1,
    example: 1,
  })
  @IsInt()
  @Min(1)
  expectedRevision!: number;
}
