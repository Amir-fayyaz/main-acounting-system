import { Body, Controller, Get, Param, Put, Query } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';

import { Authorize } from '../../../../infrastructure/api/authorization/authorization-policy.js';
import { ApiErrorResponseDto } from '../../../../infrastructure/api/errors/api-error.dto.js';
import { ApiErrorException } from '../../../../infrastructure/api/errors/api-error.exception.js';
import type { Paginated } from '../../../../infrastructure/api/pagination/pagination.js';
import { paginate } from '../../../../infrastructure/api/pagination/pagination.js';
import { PaginationQueryDto } from '../../../../infrastructure/api/pagination/pagination-query.dto.js';
import type { DomainError } from '../../../../shared/errors/domain-error.js';
import { GetRoleCompletenessUseCase } from '../../application/use-cases/account-role.use-case.js';
import { MapAccountRoleUseCase } from '../../application/use-cases/account-role.use-case.js';
import { ListAccountRoleMappingsUseCase } from '../../application/use-cases/account-query.use-case.js';
import type { AccountRole } from '../../domain/value-objects/account-role.js';
import { isTenantReference } from '../../domain/value-objects/tenant-reference.js';
import { MapAccountRoleDto } from '../dto/account-role.dto.js';
import {
  AccountRoleCompletenessResponseDto,
  AccountRoleResponseDto,
  PaginatedAccountRolesDto,
  toAccountRoleResponse,
} from '../dto/account-response.dto.js';

const READ_ACCOUNTS = 'accounting.account.read';
const MANAGE_ACCOUNTS = 'accounting.account.manage';

/**
 * The key-account role mapping of a company (ACC-001.5; ACC-001.7).
 *
 * A role names a business use — inventory, accounts payable, input VAT,
 * purchase discount — and points at exactly one account per company. The read
 * endpoints list every required role (mapped or not) and report what is still
 * missing; the update maps one role to a valid account. Purchase and the Agent
 * plan consume the mapping through the module's public contract, not over HTTP.
 *
 * The tenant is taken from the path and the verified membership only; no body
 * field selects it.
 */
@ApiBearerAuth()
@ApiTags('account-roles')
@Controller('tenants/:tenantId/account-roles')
export class AccountRolesController {
  public constructor(
    private readonly listMappings: ListAccountRoleMappingsUseCase,
    private readonly mapRole: MapAccountRoleUseCase,
    private readonly completeness: GetRoleCompletenessUseCase,
  ) {}

  @Get()
  @Authorize({ permission: READ_ACCOUNTS, tenantParam: 'tenantId' })
  @ApiOperation({
    summary: "List a company's account-role mapping",
    description:
      'Returns every required role with the account currently mapped to it, or `null` when it ' +
      'is unmapped, in the standard pagination envelope. Requires "accounting.account.read".',
  })
  @ApiOkResponse({
    type: PaginatedAccountRolesDto,
    description: 'The role mapping, paginated.',
    examples: {
      page: {
        summary: 'One role mapped, the rest still open',
        value: {
          data: [
            {
              role: 'inventory',
              accountId: '018f0d3c-6d0f-7a4b-9d4e-2b3c4d5e6f70',
              updatedAt: '2026-11-25T09:30:00.000Z',
            },
            { role: 'payable', accountId: null, updatedAt: null },
            { role: 'input_vat', accountId: null, updatedAt: null },
            { role: 'purchase_discount', accountId: null, updatedAt: null },
          ],
          meta: { page: 1, limit: 20, total: 4, totalPages: 1 },
        },
      },
    },
  })
  @ApiBadRequestResponse({
    type: ApiErrorResponseDto,
    description: 'Invalid pagination query.',
    examples: {
      limitTooLarge: {
        summary: 'A limit above the maximum',
        value: {
          error: {
            code: 'VALIDATION_FAILED',
            category: 'validation',
            message: 'The request contains invalid values.',
            correlationId: '2f0a4b1c-9c3d-4f2a-8b7e-0d1c2a3b4c5d',
            details: [
              { field: 'limit', code: 'max', message: 'limit must not be greater than 100' },
            ],
          },
        },
      },
    },
  })
  @ApiUnauthorizedResponse({
    type: ApiErrorResponseDto,
    description: 'Authentication is required.',
    examples: {
      unauthenticated: {
        summary: 'No valid bearer token',
        value: {
          error: {
            code: 'AUTHENTICATION_REQUIRED',
            category: 'client',
            message: 'Authentication is required.',
            correlationId: '2f0a4b1c-9c3d-4f2a-8b7e-0d1c2a3b4c5d',
          },
        },
      },
    },
  })
  @ApiForbiddenResponse({
    type: ApiErrorResponseDto,
    description: 'The caller lacks "accounting.account.read" or has no membership in the company.',
    examples: {
      missingPermission: {
        summary: 'A member without the capability',
        value: {
          error: {
            code: 'AUTHORIZATION_DENIED',
            category: 'client',
            message: 'The authenticated principal is not authorized to perform this operation.',
            correlationId: '2f0a4b1c-9c3d-4f2a-8b7e-0d1c2a3b4c5d',
            details: [
              {
                field: 'permission',
                code: 'PERMISSION_REQUIRED',
                message: 'the operation requires "accounting.account.read"',
              },
            ],
          },
        },
      },
    },
  })
  async list(
    @Param('tenantId') tenantId: string,
    @Query() query: PaginationQueryDto,
  ): Promise<Paginated<AccountRoleResponseDto>> {
    const outcome = await this.inTenantScope(tenantId, () => this.listMappings.execute());

    return outcome.match<Paginated<AccountRoleResponseDto>>({
      ok: (mappings) => paginate(mappings.map(toAccountRoleResponse), query),
      fail: (error) => this.raise(error),
    });
  }

  @Get('completeness')
  @Authorize({ permission: READ_ACCOUNTS, tenantParam: 'tenantId' })
  @ApiOperation({
    summary: 'Read role-mapping completeness',
    description:
      'Lists the required roles, those mapped to a currently valid account, and those still ' +
      'missing or pointing at an inactive, non-postable or incompatible account. Purchase and ' +
      'the Agent plan use the same answer through the module contract to fail early. Requires ' +
      '"accounting.account.read".',
  })
  @ApiOkResponse({
    type: AccountRoleCompletenessResponseDto,
    description: 'The completeness of the mapping.',
    examples: {
      incomplete: {
        summary: 'Two roles are still open',
        value: {
          required: ['inventory', 'payable', 'input_vat', 'purchase_discount'],
          mapped: ['inventory', 'payable'],
          missing: ['input_vat', 'purchase_discount'],
          complete: false,
        },
      },
    },
  })
  @ApiUnauthorizedResponse({
    type: ApiErrorResponseDto,
    description: 'Authentication is required.',
    examples: {
      unauthenticated: {
        summary: 'No valid bearer token',
        value: {
          error: {
            code: 'AUTHENTICATION_REQUIRED',
            category: 'client',
            message: 'Authentication is required.',
            correlationId: '2f0a4b1c-9c3d-4f2a-8b7e-0d1c2a3b4c5d',
          },
        },
      },
    },
  })
  @ApiForbiddenResponse({
    type: ApiErrorResponseDto,
    description: 'The caller lacks "accounting.account.read" or has no membership in the company.',
    examples: {
      missingPermission: {
        summary: 'A member without the capability',
        value: {
          error: {
            code: 'AUTHORIZATION_DENIED',
            category: 'client',
            message: 'The authenticated principal is not authorized to perform this operation.',
            correlationId: '2f0a4b1c-9c3d-4f2a-8b7e-0d1c2a3b4c5d',
            details: [
              {
                field: 'permission',
                code: 'PERMISSION_REQUIRED',
                message: 'the operation requires "accounting.account.read"',
              },
            ],
          },
        },
      },
    },
  })
  async readCompleteness(
    @Param('tenantId') tenantId: string,
  ): Promise<AccountRoleCompletenessResponseDto> {
    const result = await this.inTenantScope(tenantId, () => this.completeness.execute());

    return {
      required: [...result.required],
      mapped: [...result.mapped],
      missing: [...result.missing],
      complete: result.complete,
    };
  }

  @Put(':role')
  @Authorize({ permission: MANAGE_ACCOUNTS, tenantParam: 'tenantId' })
  @ApiOperation({
    summary: 'Map a role to an account',
    description:
      'Points a key account role at one account of this company. The target must exist in the ' +
      'company, be active, postable and of a type compatible with the role; otherwise the ' +
      'request is refused with ACCOUNT_ROLE_INVALID_TARGET (422). Re-mapping replaces the ' +
      'previous account. Requires "accounting.account.manage".',
  })
  @ApiOkResponse({
    type: AccountRoleResponseDto,
    description: 'The role now points at the account.',
    examples: {
      mapped: {
        summary: 'The inventory role mapped to the inventory account',
        value: {
          role: 'inventory',
          accountId: '018f0d3c-6d0f-7a4b-9d4e-2b3c4d5e6f70',
          updatedAt: '2026-11-25T09:30:00.000Z',
        },
      },
    },
  })
  @ApiBadRequestResponse({
    type: ApiErrorResponseDto,
    description: 'The body is missing the account id or it is malformed.',
    examples: {
      missingAccount: {
        summary: 'No account id was supplied',
        value: {
          error: {
            code: 'VALIDATION_FAILED',
            category: 'validation',
            message: 'The request contains invalid values.',
            correlationId: '2f0a4b1c-9c3d-4f2a-8b7e-0d1c2a3b4c5d',
            details: [
              { field: 'accountId', code: 'isUuid', message: 'accountId must be a UUID' },
            ],
          },
        },
      },
    },
  })
  @ApiUnauthorizedResponse({
    type: ApiErrorResponseDto,
    description: 'Authentication is required.',
    examples: {
      unauthenticated: {
        summary: 'No valid bearer token',
        value: {
          error: {
            code: 'AUTHENTICATION_REQUIRED',
            category: 'client',
            message: 'Authentication is required.',
            correlationId: '2f0a4b1c-9c3d-4f2a-8b7e-0d1c2a3b4c5d',
          },
        },
      },
    },
  })
  @ApiForbiddenResponse({
    type: ApiErrorResponseDto,
    description: 'The caller lacks "accounting.account.manage" or has no membership in the company.',
    examples: {
      missingPermission: {
        summary: 'A member without the capability',
        value: {
          error: {
            code: 'AUTHORIZATION_DENIED',
            category: 'client',
            message: 'The authenticated principal is not authorized to perform this operation.',
            correlationId: '2f0a4b1c-9c3d-4f2a-8b7e-0d1c2a3b4c5d',
            details: [
              {
                field: 'permission',
                code: 'PERMISSION_REQUIRED',
                message: 'the operation requires "accounting.account.manage"',
              },
            ],
          },
        },
      },
    },
  })
  @ApiUnprocessableEntityResponse({
    type: ApiErrorResponseDto,
    description: 'The role is unknown or the account is not a valid target for it.',
    examples: {
      invalidTarget: {
        summary: 'An inactive or incompatible account',
        value: {
          error: {
            code: 'ACCOUNT_ROLE_INVALID_TARGET',
            category: 'domain',
            message:
              'The account cannot be mapped to role "inventory": Account is inactive.',
            correlationId: '2f0a4b1c-9c3d-4f2a-8b7e-0d1c2a3b4c5d',
            details: [
              {
                code: 'ACCOUNT_ROLE_INVALID_TARGET',
                field: 'accountId',
                message: 'Account is inactive',
              },
            ],
          },
        },
      },
    },
  })
  async map(
    @Param('tenantId') tenantId: string,
    @Param('role') role: string,
    @Body() body: MapAccountRoleDto,
  ): Promise<AccountRoleResponseDto> {
    const outcome = await this.inTenantScope(tenantId, () =>
      this.mapRole.execute({ role: role as AccountRole, accountId: body.accountId }),
    );

    return outcome.match<AccountRoleResponseDto>({
      ok: () => ({
        role,
        accountId: body.accountId,
        updatedAt: new Date().toISOString(),
      }),
      fail: (error) => this.raise(error),
    });
  }

  /** Refuses a malformed route tenant id as not-found, before any use case runs. */
  private async inTenantScope<T>(rawId: string, work: () => Promise<T>): Promise<T> {
    if (!isTenantReference(rawId)) {
      throw ApiErrorException.notFound();
    }

    return work();
  }

  /** Rethrows a failed outcome as the `DomainError` it is. */
  private raise(error: DomainError): never {
    throw error;
  }
}
