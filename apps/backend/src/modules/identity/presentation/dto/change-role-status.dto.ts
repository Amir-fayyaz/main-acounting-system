import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsInt, Min } from 'class-validator';

/**
 * Request body for `POST /api/v1/tenants/:tenantId/roles/:roleId/status`
 * (IAM-004; FND-006).
 *
 * `status` must be one of the two defined lifecycle states — an unknown state is
 * a client mistake and is rejected before a use case runs. Deactivation keeps the
 * role and its assignments; it never deletes them.
 */
export class ChangeRoleStatusDto {
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
