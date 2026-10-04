import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length } from 'class-validator';
import { TenantName } from '../../domain/value-objects/tenant-name.js';

/**
 * Request body for creating a tenant (IAM-001; FND-006).
 *
 * Validation at the HTTP boundary is a *client* guard, not the domain rule: the
 * domain still validates the name through `TenantName`. It exists so an
 * obvious mistake is answered with a 400 and per-field detail before a use case
 * runs.
 */
export class CreateTenantDto {
  @ApiProperty({
    description: 'The tenant display name.',
    minLength: 1,
    maxLength: TenantName.MAX_LENGTH,
    example: 'Acme Trading Co.',
  })
  @IsString()
  @Length(1, TenantName.MAX_LENGTH)
  name!: string;
}
