import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

/**
 * Request body for `PUT /api/v1/tenants/:tenantId/account-roles/:role`
 * (ACC-001.7).
 *
 * The role is a path segment and the account is the only body field. The tenant
 * is never accepted from the body. Whether the target is a valid account for
 * the role (active, postable, compatible type) is a domain decision and is
 * refused with `ACCOUNT_ROLE_INVALID_TARGET` (422).
 */
export class MapAccountRoleDto {
  @ApiProperty({
    description: 'The account to map to the role.',
    format: 'uuid',
    example: '018f0d3c-6d0f-7a4b-9d4e-2b3c4d5e6f70',
  })
  @IsUUID()
  accountId!: string;
}

/**
 * Request body for
 * `POST /api/v1/tenants/:tenantId/accounts/standard-template/activate`
 * (ACC-001.7).
 *
 * A second activation of the same version for the same company is refused with
 * `ACCOUNT_TEMPLATE_ALREADY_APPLIED` (409), so the endpoint is idempotent in the
 * sense that it never creates a duplicate chart — the retry is answered, not
 * repeated.
 */
export class ActivateStandardChartDto {
  @ApiProperty({
    description: 'The template version to activate.',
    maxLength: 64,
    example: 'ir-standard-v1',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  templateVersion!: string;
}
