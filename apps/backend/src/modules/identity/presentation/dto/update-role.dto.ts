import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsString, MaxLength, Min } from 'class-validator';
import { ROLE_NAME_MAX_LENGTH } from '../../domain/value-objects/role-name.js';

/**
 * Request body for `PATCH /api/v1/tenants/:tenantId/roles/:roleId` (IAM-004;
 * FND-006).
 *
 * `expectedRevision` is required for optimistic-concurrency protection: the write
 * is refused if the role moved since the client read it.
 */
export class UpdateRoleDto {
  @ApiProperty({
    description: 'The new role name.',
    maxLength: ROLE_NAME_MAX_LENGTH,
    example: 'Senior Accountant',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(ROLE_NAME_MAX_LENGTH)
  name!: string;

  @ApiProperty({
    description: 'The revision the client last read; the write is refused if it moved.',
    minimum: 1,
    example: 1,
  })
  @IsInt()
  @Min(1)
  expectedRevision!: number;
}
