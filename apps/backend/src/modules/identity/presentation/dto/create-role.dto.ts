import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { ROLE_NAME_MAX_LENGTH } from '../../domain/value-objects/role-name.js';

/**
 * Request body for `POST /api/v1/tenants/:tenantId/roles` (IAM-004; FND-006).
 *
 * Only the name is supplied: the tenant is the resource the role is created
 * under, taken from the path and checked against the resolved tenant scope. The
 * role starts with no permissions — granting them is a separate operation.
 */
export class CreateRoleDto {
  @ApiProperty({
    description: 'The role name.',
    maxLength: ROLE_NAME_MAX_LENGTH,
    example: 'Accountant',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(ROLE_NAME_MAX_LENGTH)
  name!: string;
}
