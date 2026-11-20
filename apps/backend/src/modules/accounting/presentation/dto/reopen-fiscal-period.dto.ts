import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

/** Longest accepted justification; the column is bounded the same way. */
export const REOPEN_REASON_MAX_LENGTH = 500;

/**
 * Request body for `POST /api/v1/tenants/:tenantId/fiscal-periods/:periodId/reopen`
 * (FIS-005; FND-006).
 *
 * `reason` is **optional at the transport layer on purpose**: the requirement
 * that reopening a closed period carries a non-empty business justification is
 * a domain invariant, and the domain remains the final authority (ADR-013
 * section 7; doc 13, "Request validation"). A missing or blank reason therefore
 * reaches the use case and is refused with the module's own code
 * (`REOPEN_REASON_REQUIRED`, 400), which a client can switch on — a boundary
 * rule would have hidden that code behind a generic `VALIDATION_FAILED`.
 * A *non-string* reason is still rejected at the boundary with per-field
 * detail, because that is a malformed request rather than a business outcome.
 */
export class ReopenFiscalPeriodDto {
  @ApiPropertyOptional({
    description:
      'The business justification for reopening. Required by the domain: a missing or blank ' +
      'value is refused with REOPEN_REASON_REQUIRED (400).',
    maxLength: REOPEN_REASON_MAX_LENGTH,
    example: 'Correction of a misallocated expense entry.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(REOPEN_REASON_MAX_LENGTH)
  reason?: string;
}
