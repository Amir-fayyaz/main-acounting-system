import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsString, Length, Min } from 'class-validator';
import { TenantName } from '../../domain/value-objects/tenant-name.js';

/**
 * Request body for updating company settings (name).
 *
 * The target company is the route param `:id` only — a body field named
 * `tenantId` / `id` is ignored and must not be sent as a grant of access.
 * `expectedRevision` is required for optimistic concurrency (SHR-008).
 */
export class UpdateTenantDto {
  @ApiProperty({
    description: 'New company display name.',
    minLength: 1,
    maxLength: TenantName.MAX_LENGTH,
    example: 'Acme Trading Co. (renamed)',
  })
  @IsString()
  @Length(1, TenantName.MAX_LENGTH)
  name!: string;

  @ApiProperty({
    description: 'Revision last read; write is refused if the record moved.',
    minimum: 1,
    example: 1,
  })
  @IsInt()
  @Min(1)
  expectedRevision!: number;
}
