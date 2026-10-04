import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsInt, Min } from 'class-validator';
import {
  TENANT_STATUS_VALUES,
  type TenantStatusValue,
} from '../../domain/value-objects/tenant-status.js';

/**
 * Request body for a tenant lifecycle move (IAM-001; FND-006).
 *
 * Only the states the domain defines are accepted; whether the move is legal
 * *from the current state* is the domain's decision, not the DTO's.
 */
export class ChangeTenantStatusDto {
  @ApiProperty({
    description: 'The lifecycle state to move to.',
    enum: TENANT_STATUS_VALUES,
    example: 'inactive',
  })
  @IsIn(TENANT_STATUS_VALUES)
  status!: TenantStatusValue;

  @ApiProperty({
    description: 'The revision the client last read; the write is refused if it moved.',
    minimum: 1,
    example: 1,
  })
  @IsInt()
  @Min(1)
  expectedRevision!: number;
}
