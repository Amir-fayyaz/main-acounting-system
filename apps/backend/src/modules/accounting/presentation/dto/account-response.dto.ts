import { ApiProperty } from '@nestjs/swagger';

import { ACCOUNT_TYPE_VALUES } from '../../domain/value-objects/account-type.values.js';
import { NORMAL_BALANCE_VALUES } from '../../domain/value-objects/account-normal-balance.values.js';
import type { AccountView } from '../../application/views/account.view.js';
import type {
  AccountRoleAssignmentView,
  AccountTreeNodeView,
  AccountTreeView,
} from '../../application/views/account-tree.view.js';
import { PaginationMetaDto } from '../../../../infrastructure/api/pagination/pagination.js';

/**
 * The standard read shape of an account (ACC-001.7; FND-006).
 *
 * It follows the API conventions: the id as a bare UUID string, enums as their
 * string value, date-times as ISO-8601 UTC and `revision` as the token an
 * update must send back. The DTO is separate from the aggregate (ADR-013
 * section 14) and is built from the application view only.
 */
export class AccountResponseDto {
  @ApiProperty({ description: 'The stable account identity (UUID).' })
  id!: string;

  @ApiProperty({ description: 'The company that owns the account (UUID).' })
  tenantId!: string;

  @ApiProperty({ description: 'The account code, unique within the company.', example: '110101' })
  code!: string;

  @ApiProperty({ description: 'The display name of the account.', example: 'صندوق' })
  name!: string;

  @ApiProperty({ description: 'Depth in the chart; a root is 1.', minimum: 1, example: 4 })
  level!: number;

  @ApiProperty({
    description: 'The parent account, or null for a root.',
    nullable: true,
    type: String,
    example: '018f0d3c-6d0f-7a4b-9d4e-2b3c4d5e6f70',
  })
  parentId!: string | null;

  @ApiProperty({
    enum: ACCOUNT_TYPE_VALUES,
    description: 'The account type.',
    example: 'asset',
  })
  type!: string;

  @ApiProperty({
    enum: NORMAL_BALANCE_VALUES,
    description: 'The side on which the account increases.',
    example: 'debit',
  })
  normalBalance!: string;

  @ApiProperty({
    description: 'Whether a journal line may point at this account. Only a leaf is postable.',
    example: true,
  })
  postable!: boolean;

  @ApiProperty({
    description: 'Whether the account may receive new postings right now.',
    example: true,
  })
  active!: boolean;

  @ApiProperty({
    description: 'Whether the account was created by the standard template.',
    example: true,
  })
  system!: boolean;

  @ApiProperty({ description: 'When the account was created (UTC).' })
  createdAt!: string;

  @ApiProperty({ description: 'When the account was last updated (UTC).' })
  updatedAt!: string;

  @ApiProperty({
    description: 'The optimistic-concurrency token; send it back on update.',
    minimum: 1,
    example: 1,
  })
  revision!: number;
}

/** One node of the chart tree: an account plus its direct children. */
export class AccountTreeNodeDto extends AccountResponseDto {
  @ApiProperty({
    type: () => [AccountTreeNodeDto],
    description: 'The direct children, ordered by account code.',
  })
  children!: AccountTreeNodeDto[];
}

/** The tree resource: the whole chart, or one account's subtree. */
export class AccountTreeResponseDto {
  @ApiProperty({
    type: () => [AccountTreeNodeDto],
    description: 'The roots of the returned tree, ordered by account code.',
  })
  roots!: AccountTreeNodeDto[];
}

/** A page of accounts in the shared pagination envelope. */
export class PaginatedAccountsDto {
  @ApiProperty({ type: () => [AccountResponseDto] })
  data!: AccountResponseDto[];

  @ApiProperty({ type: PaginationMetaDto })
  meta!: PaginationMetaDto;
}

/** One role and the account currently mapped to it (null when unmapped). */
export class AccountRoleResponseDto {
  @ApiProperty({
    description: 'The accounting role key.',
    example: 'inventory',
  })
  role!: string;

  @ApiProperty({
    description: 'The mapped account, or null when the role is unmapped.',
    nullable: true,
    type: String,
    example: '018f0d3c-6d0f-7a4b-9d4e-2b3c4d5e6f70',
  })
  accountId!: string | null;

  @ApiProperty({
    description: 'When the mapping was last changed (UTC), or null when unmapped.',
    nullable: true,
    type: String,
    example: '2026-11-01T09:30:00.000Z',
  })
  updatedAt!: string | null;
}

/** A page of role mappings in the shared pagination envelope. */
export class PaginatedAccountRolesDto {
  @ApiProperty({ type: () => [AccountRoleResponseDto] })
  data!: AccountRoleResponseDto[];

  @ApiProperty({ type: PaginationMetaDto })
  meta!: PaginationMetaDto;
}

/** The completeness of the company's key-account mapping. */
export class AccountRoleCompletenessResponseDto {
  @ApiProperty({ description: 'Every role the purchase flow requires.', type: [String] })
  required!: string[];

  @ApiProperty({ description: 'The roles mapped to a valid account.', type: [String] })
  mapped!: string[];

  @ApiProperty({ description: 'The roles still unmapped or pointing at an invalid account.', type: [String] })
  missing!: string[];

  @ApiProperty({ description: 'True when no role is missing.', example: false })
  complete!: boolean;
}

/** The outcome of activating the standard chart for a company. */
export class StandardChartActivationResponseDto {
  @ApiProperty({ description: 'The template version that was applied.', example: 'ir-standard-v1' })
  templateVersion!: string;

  @ApiProperty({ description: 'How many accounts the activation created.', example: 45 })
  createdCount!: number;

  @ApiProperty({ type: () => [AccountResponseDto] })
  accounts!: AccountResponseDto[];
}

export function toAccountResponse(view: AccountView): AccountResponseDto {
  return {
    id: view.id,
    tenantId: view.tenantId,
    code: view.code,
    name: view.name,
    level: view.level,
    parentId: view.parentId,
    type: view.type,
    normalBalance: view.normalBalance,
    postable: view.postable,
    active: view.active,
    system: view.system,
    createdAt: view.createdAt,
    updatedAt: view.updatedAt,
    revision: view.revision,
  };
}

export function toAccountTreeNodeResponse(view: AccountTreeNodeView): AccountTreeNodeDto {
  return {
    ...toAccountResponse(view),
    children: view.children.map(toAccountTreeNodeResponse),
  };
}

export function toAccountTreeResponse(view: AccountTreeView): AccountTreeResponseDto {
  return { roots: view.roots.map(toAccountTreeNodeResponse) };
}

export function toAccountRoleResponse(view: AccountRoleAssignmentView): AccountRoleResponseDto {
  return {
    role: view.role,
    accountId: view.accountId,
    updatedAt: view.updatedAt,
  };
}
