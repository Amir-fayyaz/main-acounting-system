import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Min } from 'class-validator';

/**
 * Request body for
 * `POST /api/v1/tenants/:tenantId/memberships/:membershipId/roles/:assignmentId/remove`
 * (IAM-004; FND-006).
 *
 * Removal is a `POST .../remove` rather than a `DELETE`: it ends the assignment
 * through a state change (the record is retained as access history) and needs an
 * `expectedRevision` to protect it, and a body on `DELETE` is not reliably
 * transported.
 */
export class RemoveRoleDto {
  @ApiProperty({
    description: 'The revision the client last read; the write is refused if it moved.',
    minimum: 1,
    example: 1,
  })
  @IsInt()
  @Min(1)
  expectedRevision!: number;
}
