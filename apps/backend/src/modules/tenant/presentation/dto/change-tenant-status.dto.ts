import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsInt, Min } from 'class-validator';
import {
  TENANT_STATUS_VALUES,
  type TenantStatusValue,
} from '../../domain/value-objects/tenant-status.js';

/**
 * Request body for changing company lifecycle state.
 * Target company is always the route `:id` — never a body tenant id.
 */
export class ChangeTenantStatusDto {
  @ApiProperty({
    description: 'Target lifecycle state.',
    enum: TENANT_STATUS_VALUES,
    example: 'inactive',
  })
  @IsIn([...TENANT_STATUS_VALUES])
  status!: TenantStatusValue;

  @ApiProperty({
    description: 'Revision last read; write is refused if the record moved.',
    minimum: 1,
    example: 1,
  })
  @IsInt()
  @Min(1)
  expectedRevision!: number;
}
