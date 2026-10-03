import { ApiProperty } from '@nestjs/swagger';
import {
  TENANT_STATUS_VALUES,
  type TenantStatusValue,
} from '../../domain/value-objects/tenant-status.js';

/**
 * Response body for a tenant (IAM-001; FND-006).
 *
 * A DTO, never the aggregate: it carries plain, serializable values and the
 * revision the client needs for its next conditional update.
 */
export class TenantResponseDto {
  @ApiProperty({ description: 'Stable tenant (tenant) identifier.', format: 'uuid' })
  id!: string;

  @ApiProperty({ description: 'Tenant display name.' })
  name!: string;

  @ApiProperty({ description: 'Lifecycle state.', enum: TENANT_STATUS_VALUES })
  status!: TenantStatusValue;

  @ApiProperty({
    description: 'Revision to send as expectedRevision on the next update.',
    minimum: 1,
  })
  revision!: number;

  @ApiProperty({ description: 'Creation instant, ISO-8601 in UTC.', format: 'date-time' })
  createdAt!: string;

  @ApiProperty({ description: 'Last-change instant, ISO-8601 in UTC.', format: 'date-time' })
  updatedAt!: string;
}
