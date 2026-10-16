import { ApiProperty } from '@nestjs/swagger';

import { AUDIT_ACTOR_TYPES, type AuditActorType } from '../../domain/value-objects/audit-actor.js';
import type { AuditMetadata } from '../../domain/value-objects/audit-metadata.js';
import {
  AUDIT_OUTCOME_VALUES,
  type AuditOutcomeValue,
} from '../../domain/value-objects/audit-outcome.js';

/**
 * The standard read shape of an audit record (AUD-001; FND-006).
 *
 * One record of the trail as a client sees it: identifiers as bare UUID strings,
 * the instant as ISO-8601 UTC, the states as their string values and every
 * optional field present with `null` rather than omitted — so a client can tell
 * "this fact had no tenant" from "this response does not carry tenants" (the
 * FND-006 nullable convention).
 *
 * `metadata` is the sanitized context. It is documented as free-form because the
 * audit capability is generic — the keys belong to whichever module recorded the
 * fact — and it is *safe* to expose because a key naming credential material was
 * redacted before the record was ever written.
 */
export class AuditRecordResponseDto {
  @ApiProperty({ description: "The record's stable identity (UUID)." })
  id!: string;

  @ApiProperty({
    description: 'The tenant the fact belongs to, or null for a platform-level fact.',
    type: String,
    nullable: true,
  })
  tenantId!: string | null;

  @ApiProperty({
    enum: AUDIT_ACTOR_TYPES,
    description: 'Whether an authenticated user acted, or the system itself.',
  })
  actorType!: AuditActorType;

  @ApiProperty({
    description: 'The acting user id, or null when the system acted.',
    type: String,
    nullable: true,
  })
  actorUserId!: string | null;

  @ApiProperty({ description: 'The stable action name.', example: 'user.signed_in' })
  action!: string;

  @ApiProperty({
    description: 'The kind of resource the operation addressed, or null.',
    type: String,
    nullable: true,
  })
  targetType!: string | null;

  @ApiProperty({
    description: 'The identity of that resource, or null.',
    type: String,
    nullable: true,
  })
  targetId!: string | null;

  @ApiProperty({ enum: AUDIT_OUTCOME_VALUES, description: 'How the operation ended.' })
  outcome!: AuditOutcomeValue;

  @ApiProperty({ description: 'When the fact occurred (ISO-8601 UTC).' })
  occurredAt!: string;

  @ApiProperty({
    description: 'The flow the fact belongs to, or null.',
    type: String,
    nullable: true,
  })
  correlationId!: string | null;

  @ApiProperty({
    description: 'The direct cause of the fact, or null.',
    type: String,
    nullable: true,
  })
  causationId!: string | null;

  @ApiProperty({
    description:
      'Sanitized context recorded with the fact. Credential material is redacted before persistence and never appears here.',
    type: 'object',
    additionalProperties: true,
    example: { reason: 'INVALID_SECRET' },
  })
  metadata!: AuditMetadata;
}
