import { ApiProperty } from '@nestjs/swagger';
import { FISCAL_PERIOD_STATE_VALUES } from '../../domain/value-objects/fiscal-period-state.js';
import type { FiscalPeriodView } from '../../application/views/fiscal-period.view.js';

/**
 * The standard read shape of a fiscal period (FIS-004; FND-006).
 *
 * It follows FND-006 serialization: the id as a bare UUID string, calendar
 * dates as `YYYY-MM-DD`, date-times as ISO-8601 UTC, the state as its string
 * value. The DTO is separate from the aggregate (ADR-013 section 14) — the
 * response is built from the application view, never from domain state.
 */
export class FiscalPeriodResponseDto {
  @ApiProperty({ description: 'The stable fiscal period identity (UUID).' })
  id!: string;

  @ApiProperty({ description: 'The stable identity of the company that owns the period (UUID).' })
  tenantId!: string;

  @ApiProperty({ description: 'The fiscal year this period is a slice of (UUID).' })
  fiscalYearId!: string;

  @ApiProperty({ description: 'The Jalali calendar year the period belongs to.', example: 1405 })
  jalaliYear!: number;

  @ApiProperty({
    description: 'The month position inside the year, 1 (Farvardin) through 12 (Esfand).',
    minimum: 1,
    maximum: 12,
    example: 1,
  })
  sequence!: number;

  @ApiProperty({ description: 'Inclusive first day.', example: '2026-03-21' })
  startDate!: string;

  @ApiProperty({ description: 'Inclusive last day.', example: '2026-04-19' })
  endDate!: string;

  @ApiProperty({
    enum: FISCAL_PERIOD_STATE_VALUES,
    description: 'The lifecycle state of the period.',
    example: 'open',
  })
  state!: (typeof FISCAL_PERIOD_STATE_VALUES)[number];

  @ApiProperty({ description: 'When the period was created (UTC).' })
  createdAt!: string;

  @ApiProperty({ description: 'When the period was last updated (UTC).' })
  updatedAt!: string;
}

/** Maps the application view to the response DTO. */
export function toFiscalPeriodResponse(view: FiscalPeriodView): FiscalPeriodResponseDto {
  return {
    id: view.id,
    tenantId: view.tenantId,
    fiscalYearId: view.fiscalYearId,
    jalaliYear: view.jalaliYear,
    sequence: view.sequence,
    startDate: view.startDate,
    endDate: view.endDate,
    state: view.state,
    createdAt: view.createdAt,
    updatedAt: view.updatedAt,
  };
}
