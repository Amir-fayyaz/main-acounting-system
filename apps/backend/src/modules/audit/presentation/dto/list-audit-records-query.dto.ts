import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsISO8601, IsOptional, IsString, MaxLength } from 'class-validator';

import { PaginationQueryDto } from '../../../../infrastructure/api/pagination/pagination-query.dto.js';
import { AUDIT_ACTION_MAX_LENGTH } from '../../domain/value-objects/audit-action.js';
import { AUDIT_TARGET_TYPE_MAX_LENGTH } from '../../domain/value-objects/audit-target.js';
import { AUDIT_OUTCOME_VALUES } from '../../domain/value-objects/audit-outcome.js';
import type { AuditOutcomeValue } from '../../domain/value-objects/audit-outcome.js';

/**
 * The query parameters of `GET /tenants/:tenantId/audit-records` (AUD-001;
 * FND-006; ADR-013 section 10).
 *
 * It extends the shared {@link PaginationQueryDto} rather than redeclaring
 * `page`/`limit`, so the bounds, the defaults and the serialized metadata stay
 * identical to every other list endpoint — the acceptance criteria require the
 * established pagination conventions, and reusing the DTO is how that stays
 * true.
 *
 * Every filter is a **narrowing** filter, and nothing here can widen the read:
 * the tenant is not a query parameter at all. It comes from the route, is
 * verified against the caller's membership by the authorization boundary, and
 * the trail is then read under that resolved scope. A client that adds
 * `tenantId=…` to the query string changes nothing (SHR-007 section 8).
 *
 * The filters are validated here as *client* input (a malformed one is a 400
 * with field detail) and again in the use case as *business* input, so a caller
 * that is not HTTP — a job, a test, another module — gets the same refusal.
 */
export class ListAuditRecordsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    description: 'Only facts performed by this user id (exact match).',
    example: '018f0d3c-6d0f-7a4b-9d4e-2b3c4d5e6f70',
  })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  actorUserId?: string;

  @ApiPropertyOptional({
    description: 'Only facts with this stable action name.',
    example: 'user.signed_in',
  })
  @IsOptional()
  @IsString()
  @MaxLength(AUDIT_ACTION_MAX_LENGTH)
  action?: string;

  @ApiPropertyOptional({
    description: 'Only facts about this kind of resource.',
    example: 'user',
  })
  @IsOptional()
  @IsString()
  @MaxLength(AUDIT_TARGET_TYPE_MAX_LENGTH)
  targetType?: string;

  @ApiPropertyOptional({
    description: 'Only facts about this resource id (exact match).',
    example: '018f0d3c-6d0f-7a4b-9d4e-2b3c4d5e6f70',
  })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  targetId?: string;

  @ApiPropertyOptional({
    enum: AUDIT_OUTCOME_VALUES,
    description: 'Only facts with this outcome.',
    example: 'denied',
  })
  @IsOptional()
  @IsIn(AUDIT_OUTCOME_VALUES)
  outcome?: AuditOutcomeValue;

  @ApiPropertyOptional({
    description:
      'Inclusive lower bound of the time window. Must be an ISO-8601 instant with a zone.',
    example: '2026-10-01T00:00:00.000Z',
  })
  @IsOptional()
  @IsISO8601({ strict: true })
  from?: string;

  @ApiPropertyOptional({
    description: 'Inclusive upper bound of the time window. Must not precede "from".',
    example: '2026-10-16T00:00:00.000Z',
  })
  @IsOptional()
  @IsISO8601({ strict: true })
  to?: string;
}
