import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

/**
 * Request body for
 * `POST /api/v1/tenants/:tenantId/memberships/:membershipId/roles` (IAM-004;
 * FND-006).
 *
 * Only the role is supplied: both the membership and the role must belong to the
 * tenant of the current tenant context, so a role from another tenant is refused
 * (404) — no cross-tenant assignment is possible, and the refusal does not
 * disclose that the role exists elsewhere.
 */
export class AssignRoleDto {
  @ApiProperty({
    description: 'The stable identity of the role to assign to the membership.',
    format: 'uuid',
    example: '018f0d3c-6d0f-7a4b-9d4e-2b3c4d5e6f70',
  })
  @IsUUID()
  roleId!: string;
}
