import { ApiProperty } from '@nestjs/swagger';
import {
  TENANT_STATUS_VALUES,
  type TenantStatusValue,
} from '../../domain/value-objects/tenant-status.js';

/**
 * Response body for a company (tenant).
 */
export class TenantResponseDto {
  @ApiProperty({ description: 'Stable company identifier.', format: 'uuid' })
  id!: string;

  @ApiProperty({ description: 'Company display name.', example: 'Acme Trading Co.' })
  name!: string;

  @ApiProperty({ description: 'Lifecycle state.', enum: TENANT_STATUS_VALUES })
  status!: TenantStatusValue;

  @ApiProperty({
    description: 'Revision to send as expectedRevision on the next update.',
    minimum: 1,
  })
  revision!: number;

  @ApiProperty({ description: 'Creation instant, ISO-8601 UTC.', format: 'date-time' })
  createdAt!: string;

  @ApiProperty({ description: 'Last-change instant, ISO-8601 UTC.', format: 'date-time' })
  updatedAt!: string;
}
