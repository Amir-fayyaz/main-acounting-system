import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsString, Length, Min } from 'class-validator';
import { TenantName } from '../../domain/value-objects/tenant-name.js';

/**
 * Request body for updating a tenant's mutable profile (IAM-001; FND-006).
 *
 * `expectedRevision` is required: the update names the state it believes is
 * current, so an update prepared against a stale read is rejected as a conflict
 * instead of overwriting a concurrent change (SHR-008).
 */
export class UpdateTenantDto {
  @ApiProperty({
    description: 'The new tenant display name.',
    minLength: 1,
    maxLength: TenantName.MAX_LENGTH,
    example: 'Acme Trading Co. (renamed)',
  })
  @IsString()
  @Length(1, TenantName.MAX_LENGTH)
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
