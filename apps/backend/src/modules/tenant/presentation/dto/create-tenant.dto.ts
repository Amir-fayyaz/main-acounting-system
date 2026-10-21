import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length } from 'class-validator';
import { TenantName } from '../../domain/value-objects/tenant-name.js';

/**
 * Request body for creating a company (Tenant Presentation; FND-006).
 *
 * Only the display name is accepted. The creator is the authenticated
 * principal — never a user id in the body. A tenant id is never accepted
 * here: creation establishes a new boundary.
 */
export class CreateTenantDto {
  @ApiProperty({
    description: 'Company display name.',
    minLength: 1,
    maxLength: TenantName.MAX_LENGTH,
    example: 'Acme Trading Co.',
  })
  @IsString()
  @Length(1, TenantName.MAX_LENGTH)
  name!: string;
}
