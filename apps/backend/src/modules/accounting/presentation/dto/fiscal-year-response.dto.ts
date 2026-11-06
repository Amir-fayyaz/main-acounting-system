import { ApiProperty } from '@nestjs/swagger';
import { FISCAL_YEAR_STATUS_VALUES } from '../../domain/value-objects/fiscal-year-status.js';
import type { FiscalYearView } from '../../application/views/fiscal-year.view.js';

/**
 * The standard read shape of a fiscal year (FIS-002; FND-006).
 *
 * It follows FND-006 serialization: the id as a bare UUID string, calendar
 * dates as `YYYY-MM-DD`, date-times as ISO-8601 UTC, the status as its string
 * value. The DTO is separate from the aggregate (ADR-013 section 14) — the
 * response is built from the application view, never from domain state.
 */
export class FiscalYearResponseDto {
  @ApiProperty({ description: 'The stable fiscal year identity (UUID).' })
  id!: string;

  @ApiProperty({ description: 'The stable identity of the company that owns the year (UUID).' })
  tenantId!: string;

  @ApiProperty({ description: 'The human label, unique within the company.', example: 'FY1405' })
  label!: string;

  @ApiProperty({ description: 'Inclusive first day.', example: '2026-03-21' })
  startDate!: string;

  @ApiProperty({ description: 'Inclusive last day.', example: '2027-03-20' })
  endDate!: string;

  @ApiProperty({
    enum: FISCAL_YEAR_STATUS_VALUES,
    description: 'The lifecycle status of the year.',
    example: 'open',
  })
  status!: (typeof FISCAL_YEAR_STATUS_VALUES)[number];

  @ApiProperty({ description: 'The optimistic-concurrency revision of the record.', example: 1 })
  revision!: number;

  @ApiProperty({ description: 'When the year was created (UTC).' })
  createdAt!: string;

  @ApiProperty({ description: 'When the year was last updated (UTC).' })
  updatedAt!: string;
}

/** Maps the application view to the response DTO. */
export function toFiscalYearResponse(view: FiscalYearView): FiscalYearResponseDto {
  return {
    id: view.id,
    tenantId: view.tenantId,
    label: view.label,
    startDate: view.startDate,
    endDate: view.endDate,
    status: view.status,
    revision: view.revision,
    createdAt: view.createdAt,
    updatedAt: view.updatedAt,
  };
}
