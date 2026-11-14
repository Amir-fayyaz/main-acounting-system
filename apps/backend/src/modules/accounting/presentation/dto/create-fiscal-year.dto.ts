import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches, MaxLength } from 'class-validator';
import { FiscalYearLabel } from '../../domain/value-objects/fiscal-year-label.js';

const CALENDAR_DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Request body for `POST /api/v1/tenants/:tenantId/fiscal-years` (FIS-002;
 * FND-006).
 *
 * Only the label and the inclusive date range are supplied: the tenant is the
 * resource the year is created under, taken from the path, verified against the
 * caller's membership and published as the ambient tenant scope — never from
 * the body. An unknown property (for example a client-supplied `tenantId`) is
 * rejected by the global validation pipe rather than silently dropped.
 *
 * Boundary validation is a *client* guard, not the domain rule: the domain
 * still refuses a duplicate label, an overlapping range and a year that is not
 * exactly one Jalali year. It exists so an obvious mistake is answered with a
 * 400 and per-field detail before a use case runs.
 */
export class CreateFiscalYearDto {
  @ApiProperty({
    description: 'The human label of the year, unique within the company.',
    minLength: 1,
    maxLength: FiscalYearLabel.MAX_LENGTH,
    example: 'FY1405',
  })
  @IsString()
  @MaxLength(FiscalYearLabel.MAX_LENGTH)
  label!: string;

  @ApiProperty({
    description: 'Inclusive first day of the year (Gregorian calendar date).',
    pattern: '^\\d{4}-\\d{2}-\\d{2}$',
    example: '2026-03-21',
  })
  @IsString()
  @Matches(CALENDAR_DATE, {
    message: 'startDate must be a calendar date in YYYY-MM-DD format',
  })
  startDate!: string;

  @ApiProperty({
    description: 'Inclusive last day of the year (Gregorian calendar date).',
    pattern: '^\\d{4}-\\d{2}-\\d{2}$',
    example: '2027-03-20',
  })
  @IsString()
  @Matches(CALENDAR_DATE, {
    message: 'endDate must be a calendar date in YYYY-MM-DD format',
  })
  endDate!: string;
}
