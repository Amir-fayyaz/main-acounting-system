import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

import { PaginationQueryDto } from '../../../../infrastructure/api/pagination/pagination-query.dto.js';
import { AccountCode } from '../../domain/value-objects/account-code.js';
import { ACCOUNT_TYPE_VALUES } from '../../domain/value-objects/account-type.values.js';
import { NORMAL_BALANCE_VALUES } from '../../domain/value-objects/account-normal-balance.values.js';

const ACCOUNT_NAME_MAX_LENGTH = 200;

/**
 * Converts the query-string spellings `true` / `false` to a boolean.
 *
 * Explicit conversion is required because the global pipe disables implicit
 * coercion: `@Type(() => Boolean)` would turn the string `"false"` into `true`
 * (a non-empty string is truthy), so the value is checked literally instead.
 */
function toBoolean({ value }: { readonly value: unknown }): unknown {
  if (value === 'true' || value === true) {
    return true;
  }
  if (value === 'false' || value === false) {
    return false;
  }

  return value;
}

/**
 * Request body for `POST /api/v1/tenants/:tenantId/accounts` (ACC-001.7).
 *
 * The tenant is the resource the account is created under — taken from the
 * path, proven against the caller's membership and published as the ambient
 * scope — and is never accepted in the body. `system` is not accepted either:
 * protected template accounts are created only by template activation, never by
 * a client.
 *
 * Boundary validation is a client guard; the domain remains the authority on
 * duplicate codes, parent compatibility and hierarchy invariants (ADR-013
 * section 7).
 */
export class CreateAccountDto {
  @ApiProperty({
    description: 'The account code, unique within the company.',
    maxLength: AccountCode.MAX_LENGTH,
    example: '110106',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(AccountCode.MAX_LENGTH)
  code!: string;

  @ApiProperty({
    description: 'The display name of the account.',
    maxLength: ACCOUNT_NAME_MAX_LENGTH,
    example: 'صندوق شعبه مرکزی',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(ACCOUNT_NAME_MAX_LENGTH)
  name!: string;

  @ApiPropertyOptional({
    description:
      'The parent account. Omit (or send null) for a root; a child inherits its ' +
      "parent's type and normal balance and gets level = parent.level + 1.",
    format: 'uuid',
    nullable: true,
    example: '018f0d3c-6d0f-7a4b-9d4e-2b3c4d5e6f70',
  })
  @IsOptional()
  @IsUUID()
  parentId?: string | null;

  @ApiProperty({
    enum: ACCOUNT_TYPE_VALUES,
    description: 'The account type.',
    example: 'asset',
  })
  @IsIn(ACCOUNT_TYPE_VALUES)
  type!: string;

  @ApiPropertyOptional({
    enum: NORMAL_BALANCE_VALUES,
    description: "The normal balance. Defaults to the type's own side.",
    example: 'debit',
  })
  @IsOptional()
  @IsIn(NORMAL_BALANCE_VALUES)
  normalBalance?: string;

  @ApiPropertyOptional({
    description: 'Whether the account can receive postings. Only a leaf may be postable.',
    default: false,
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  postable?: boolean;

  @ApiPropertyOptional({
    description: 'Whether the account starts active.',
    default: true,
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

/**
 * Request body for `PATCH /api/v1/tenants/:tenantId/accounts/:accountId`
 * (ACC-001.7).
 *
 * Only provided fields are applied. `version` is required: it names the state
 * the client read, and the write is refused with a conflict if someone else
 * changed the account in between (SHR-008; doc 22). Structure fields (`code`,
 * `type`, `normalBalance`, `parentId`) are refused by the domain for an account
 * already in use.
 */
export class UpdateAccountDto {
  @ApiPropertyOptional({
    description: 'The new account code.',
    maxLength: AccountCode.MAX_LENGTH,
    example: '110107',
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(AccountCode.MAX_LENGTH)
  code?: string;

  @ApiPropertyOptional({
    description: 'The new display name.',
    maxLength: ACCOUNT_NAME_MAX_LENGTH,
    example: 'صندوق شعبه شرق',
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(ACCOUNT_NAME_MAX_LENGTH)
  name?: string;

  @ApiPropertyOptional({
    description: 'Move the account under a new parent, or make it a root with null.',
    format: 'uuid',
    nullable: true,
    type: String,
    example: '018f0d3c-6d0f-7a4b-9d4e-2b3c4d5e6f70',
  })
  @IsOptional()
  @IsUUID()
  parentId?: string | null;

  @ApiPropertyOptional({
    enum: ACCOUNT_TYPE_VALUES,
    description: 'The new account type. Refused for a used account.',
    example: 'asset',
  })
  @IsOptional()
  @IsIn(ACCOUNT_TYPE_VALUES)
  type?: string;

  @ApiPropertyOptional({
    enum: NORMAL_BALANCE_VALUES,
    description: 'The new normal balance. Refused for a used account.',
    example: 'debit',
  })
  @IsOptional()
  @IsIn(NORMAL_BALANCE_VALUES)
  normalBalance?: string;

  @ApiPropertyOptional({
    description: 'Whether the account can receive postings. Only a childless account may be postable.',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  postable?: boolean;

  @ApiPropertyOptional({
    description:
      'Whether the account is active. Deactivation is refused while active children ' +
      'exist or while an accounting role points at the account.',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @ApiProperty({
    description: 'The revision the client last read; the write is refused if it moved.',
    minimum: 1,
    example: 1,
  })
  @IsInt()
  @Min(1)
  version!: number;
}

/** Request body for `POST .../accounts/:accountId/deactivate` (ACC-001.7). */
export class DeactivateAccountDto {
  @ApiProperty({
    description: 'The revision the client last read; the command is refused if it moved.',
    minimum: 1,
    example: 1,
  })
  @IsInt()
  @Min(1)
  version!: number;
}

/** Request body for `POST .../accounts/:accountId/reactivate` (ACC-001.7). */
export class ReactivateAccountDto {
  @ApiProperty({
    description: 'The revision the client last read; the command is refused if it moved.',
    minimum: 1,
    example: 2,
  })
  @IsInt()
  @Min(1)
  version!: number;
}

/**
 * Query parameters for `GET /api/v1/tenants/:tenantId/accounts` (ACC-001.7).
 *
 * `search` is matched against the code and the name after Persian
 * normalization, so `ي`/`ی`, `ك`/`ک` and Persian/Arabic-Indic digits find the
 * same accounts. Filters combine with AND.
 */
export class ListAccountsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    description: 'Free text matched against the account code or name (Persian-normalized).',
    maxLength: ACCOUNT_NAME_MAX_LENGTH,
    example: 'بانك',
  })
  @IsOptional()
  @IsString()
  @MaxLength(ACCOUNT_NAME_MAX_LENGTH)
  search?: string;

  @ApiPropertyOptional({
    enum: ACCOUNT_TYPE_VALUES,
    description: 'Restrict the result to one account type.',
    example: 'asset',
  })
  @IsOptional()
  @IsIn(ACCOUNT_TYPE_VALUES)
  type?: string;

  @ApiPropertyOptional({
    description: 'Restrict the result to active (`true`) or inactive (`false`) accounts.',
    type: Boolean,
    example: true,
  })
  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  active?: boolean;

  @ApiPropertyOptional({
    description: 'Restrict the result to postable (`true`) or grouping (`false`) accounts.',
    type: Boolean,
    example: true,
  })
  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  postable?: boolean;
}

/** Query parameters for `GET /api/v1/tenants/:tenantId/accounts/tree` (ACC-001.7). */
export class AccountTreeQueryDto {
  @ApiPropertyOptional({
    description: "Start the tree at this account instead of the chart's roots.",
    format: 'uuid',
    example: '018f0d3c-6d0f-7a4b-9d4e-2b3c4d5e6f70',
  })
  @IsOptional()
  @IsUUID()
  rootId?: string;
}
