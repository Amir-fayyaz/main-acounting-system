import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

/**
 * Request body for `POST /api/v1/tenants/:tenantId/memberships` (IAM-003;
 * FND-006).
 *
 * Only the user is supplied in the body: the tenant is the resource the
 * membership is created under, taken from the path and checked against the
 * resolved tenant scope. Validation at the HTTP boundary is a *client* guard,
 * not the domain rule, but a malformed id is rejected here with a 400 before a
 * use case runs.
 */
export class CreateMembershipDto {
  @ApiProperty({
    description: 'The stable identity of the user to link to the tenant.',
    format: 'uuid',
    example: '018f0d3c-6d0f-7a4b-9d4e-2b3c4d5e6f70',
  })
  @IsUUID()
  userId!: string;
}
