import { ApiProperty } from '@nestjs/swagger';

import { PaginationMetaDto } from '../../../../infrastructure/api/pagination/pagination.js';
import { AuditRecordResponseDto } from './audit-record-response.dto.js';

/**
 * The pagination envelope of an audit trail read (AUD-001; FND-006).
 *
 * `Paginated<T>` in `api/pagination` is the reusable shape; a concrete class is
 * declared here only because a generic type cannot be described in the generated
 * OpenAPI document without one.
 */
export class PaginatedAuditRecordsDto {
  @ApiProperty({ type: () => [AuditRecordResponseDto] })
  data!: AuditRecordResponseDto[];

  @ApiProperty({ type: () => PaginationMetaDto })
  meta!: PaginationMetaDto;
}
