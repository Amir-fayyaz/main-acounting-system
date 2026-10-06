import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsString, MaxLength, Min } from 'class-validator';
import { PERMISSION_KEY_MAX_LENGTH } from '../../domain/value-objects/permission-key.js';

/**
 * Request body for `POST /api/v1/tenants/:tenantId/roles/:roleId/permissions`
 * (IAM-004; FND-006).
 *
 * The key must name a capability the catalog defines; an unknown capability is
 * refused (400) rather than stored, so a role's permission set is always
 * resolvable. Granting a key the role already grants is a conflict (409).
 */
export class GrantRolePermissionDto {
  @ApiProperty({
    description: 'The capability key to grant, from the permission catalog.',
    maxLength: PERMISSION_KEY_MAX_LENGTH,
    example: 'user.read',
  })
  @IsString()
  @MaxLength(PERMISSION_KEY_MAX_LENGTH)
  permissionKey!: string;

  @ApiProperty({
    description: 'The revision the client last read; the write is refused if it moved.',
    minimum: 1,
    example: 1,
  })
  @IsInt()
  @Min(1)
  expectedRevision!: number;
}
