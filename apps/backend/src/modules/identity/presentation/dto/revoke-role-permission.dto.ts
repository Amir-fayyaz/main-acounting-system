import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsString, MaxLength, Min } from 'class-validator';
import { PERMISSION_KEY_MAX_LENGTH } from '../../domain/value-objects/permission-key.js';

/**
 * Request body for
 * `POST /api/v1/tenants/:tenantId/roles/:roleId/permissions/remove` (IAM-004;
 * FND-006).
 *
 * Removal is a `POST .../remove` rather than a `DELETE` with a body, matching the
 * membership-role removal operation: it ends the grant through a state change and
 * needs an `expectedRevision` to protect it, and a body on `DELETE` is not
 * reliably transported. Removing a capability takes effect immediately for
 * effective-permission resolution.
 */
export class RevokeRolePermissionDto {
  @ApiProperty({
    description: 'The capability key to remove from the role.',
    maxLength: PERMISSION_KEY_MAX_LENGTH,
    example: 'user.read',
  })
  @IsString()
  @MaxLength(PERMISSION_KEY_MAX_LENGTH)
  permissionKey!: string;

  @ApiProperty({
    description: 'The revision the client last read; the write is refused if it moved.',
    minimum: 1,
    example: 2,
  })
  @IsInt()
  @Min(1)
  expectedRevision!: number;
}
