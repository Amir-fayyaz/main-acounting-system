import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
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
import type { DomainError } from '../../../../shared/errors/domain-error.js';
import {
  CreateAccount,
  DeactivateAccount,
  DeleteAccount,
  ReactivateAccount,
  UpdateAccount,
} from '../../application/commands/account.commands.js';
import { ActivateStandardChart } from '../../application/commands/activate-standard-chart.command.js';
import type { ListAccountsQuery } from '../../application/queries/account.queries.js';
import { CreateAccountUseCase } from '../../application/use-cases/account-management.use-case.js';
import { UpdateAccountUseCase } from '../../application/use-cases/account-management.use-case.js';
import { DeactivateAccountUseCase } from '../../application/use-cases/account-management.use-case.js';
import { ReactivateAccountUseCase } from '../../application/use-cases/account-management.use-case.js';
import { DeleteAccountUseCase } from '../../application/use-cases/account-management.use-case.js';
import {
  GetAccountTreeUseCase,
  ListAccountsUseCase,
} from '../../application/use-cases/account-query.use-case.js';
import { ActivateStandardChartUseCase } from '../../application/use-cases/activate-standard-chart.use-case.js';
import { isAccountId } from '../../domain/value-objects/account-id.js';
import { isTenantReference } from '../../domain/value-objects/tenant-reference.js';
import {
  AccountTreeQueryDto,
  CreateAccountDto,
  DeactivateAccountDto,
  ListAccountsQueryDto,
  ReactivateAccountDto,
  UpdateAccountDto,
} from '../dto/account.dto.js';
import {
  AccountResponseDto,
  AccountTreeResponseDto,
  PaginatedAccountsDto,
  StandardChartActivationResponseDto,
  toAccountResponse,
  toAccountTreeResponse,
} from '../dto/account-response.dto.js';
import { ActivateStandardChartDto } from '../dto/account-role.dto.js';

/** The capability required to read the chart of accounts. */
const READ_ACCOUNTS = 'accounting.account.read';
/** The capability required to change the chart of accounts. */
const MANAGE_ACCOUNTS = 'accounting.account.manage';

/**
 * The chart-of-accounts REST resource (ACC-001.7; FND-006; ADR-013).
 *
 * The resource is nested under the tenant (`/tenants/:tenantId/accounts`).
 * Every operation declares its capability with
 * `@Authorize({ permission, tenantParam })`, so the authorization boundary
 * proves the caller's membership and capability before the handler runs; the
 * handlers themselves only validate input, delegate to a use case and map the
 * outcome to a DTO (module rule 7).
 *
 * **Tenant.** The tenant comes from the tenant context only: the boundary
 * proves the membership, the global tenant-scope interceptor publishes that
 * tenant as the ambient scope, and every use case works against it. No header,
 * body or query field is read as tenant identity; a `tenantId` in the body is
 * rejected by the validation pipe as an unknown property.
 *
 * **Error contract.** A failed outcome is rethrown as the `DomainError` it is,
 * so the shared filter serializes the module's own code with the HTTP status of
 * its category (doc 13): `ACCOUNT_CODE_DUPLICATE` / `ACCOUNT_IN_USE` answer 409,
 * `ACCOUNT_NOT_FOUND` 404, an invalid hierarchy 422, rejected input 400.
 */
@ApiBearerAuth()
@ApiTags('accounts')
@Controller('tenants/:tenantId/accounts')
export class AccountsController {
  public constructor(
    private readonly createAccount: CreateAccountUseCase,
    private readonly updateAccount: UpdateAccountUseCase,
    private readonly deactivateAccount: DeactivateAccountUseCase,
    private readonly reactivateAccount: ReactivateAccountUseCase,
    private readonly deleteAccount: DeleteAccountUseCase,
    private readonly listAccounts: ListAccountsUseCase,
    private readonly getAccountTree: GetAccountTreeUseCase,
    private readonly activateStandardChart: ActivateStandardChartUseCase,
  ) {}

  @Post()
  @Authorize({ permission: MANAGE_ACCOUNTS, tenantParam: 'tenantId' })
  @ApiOperation({
    summary: 'Create an account',
    description:
      'Creates a root account, or a child under `parentId` in the same company. The child ' +
      'inherits its parent\'s type and normal balance and gets `level = parent.level + 1`. ' +
      'The code is unique per company; the same code in another company is allowed. The tenant ' +
      'comes from the path and the verified membership — never from the body. Requires ' +
      '"accounting.account.manage".',
  })
  @ApiCreatedResponse({
    type: AccountResponseDto,
    description: 'The account was created.',
    examples: {
      created: {
        summary: 'A postable detail account',
        value: {
          id: '018f0d3c-6d0f-7a4b-9d4e-2b3c4d5e6f70',
          tenantId: '018f0d3c-6d0f-7a4b-9d4e-2b3c4d5e6f71',
          code: '110106',
          name: 'صندوق شعبه مرکزی',
          level: 4,
          parentId: '018f0d3c-6d0f-7a4b-9d4e-2b3c4d5e6f72',
          type: 'asset',
          normalBalance: 'debit',
          postable: true,
          active: true,
          system: false,
          createdAt: '2026-11-25T09:30:00.000Z',
          updatedAt: '2026-11-25T09:30:00.000Z',
          revision: 1,
        },
      },
    },
  })
  @ApiBadRequestResponse({
    type: ApiErrorResponseDto,
    description: 'Request validation failed.',
    examples: {
      invalidBody: {
        summary: 'An unknown account type',
        value: {
          error: {
            code: 'VALIDATION_FAILED',
            category: 'validation',
            message: 'The request contains invalid values.',
            correlationId: '2f0a4b1c-9c3d-4f2a-8b7e-0d1c2a3b4c5d',
            details: [
              {
                field: 'type',
                code: 'isIn',
                message: 'type must be one of the following values: asset, liability, equity, revenue, expense',
              },
            ],
          },
        },
      },
      bodyTenantId: {
        summary: 'A client tries to choose the company id in the body',
        value: {
          error: {
            code: 'VALIDATION_FAILED',
            category: 'validation',
            message: 'The request contains invalid values.',
            correlationId: '2f0a4b1c-9c3d-4f2a-8b7e-0d1c2a3b4c5d',
            details: [
              {
                field: 'tenantId',
                code: 'whitelistValidation',
                message: 'property tenantId should not exist',
              },
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
  @ApiConflictResponse({
    type: ApiErrorResponseDto,
    description: 'The account code already exists in this company.',
    examples: {
      duplicateCode: {
        summary: 'Another account of this company uses that code',
        value: {
          error: {
            code: 'ACCOUNT_CODE_DUPLICATE',
            category: 'domain',
            message: 'An account with this code already exists in the tenant.',
            correlationId: '2f0a4b1c-9c3d-4f2a-8b7e-0d1c2a3b4c5d',
            details: [
              {
                code: 'ACCOUNT_CODE_DUPLICATE',
                field: 'code',
                message: 'Duplicate account code',
              },
            ],
          },
        },
      },
    },
  })
  @ApiUnprocessableEntityResponse({
    type: ApiErrorResponseDto,
    description: 'A hierarchy rule refused the account.',
    examples: {
      invalidParent: {
        summary: 'The parent is missing, inactive or belongs to another company',
        value: {
          error: {
            code: 'ACCOUNT_INVALID_PARENT',
            category: 'domain',
            message: 'The parent account does not exist or is not available for this operation.',
            correlationId: '2f0a4b1c-9c3d-4f2a-8b7e-0d1c2a3b4c5d',
          },
        },
      },
      typeMismatch: {
        summary: 'The child type differs from its parent',
        value: {
          error: {
            code: 'ACCOUNT_TYPE_MISMATCH',
            category: 'domain',
            message: 'A child account must have the same type as its parent.',
            correlationId: '2f0a4b1c-9c3d-4f2a-8b7e-0d1c2a3b4c5d',
          },
        },
      },
    },
  })
  async create(
    @Param('tenantId') tenantId: string,
    @Body() body: CreateAccountDto,
  ): Promise<AccountResponseDto> {
    const outcome = await this.inTenantScope(tenantId, () =>
      this.createAccount.execute(
        new CreateAccount({
          code: body.code,
          name: body.name,
          parentId: body.parentId ?? null,
          type: body.type,
          normalBalance: body.normalBalance,
          postable: body.postable,
          active: body.active,
          // A client may never mint a protected template account.
          system: false,
        }),
      ),
    );

    return outcome.match<AccountResponseDto>({
      ok: toAccountResponse,
      fail: (error) => this.raise(error),
    });
  }

  @Get()
  @Authorize({ permission: READ_ACCOUNTS, tenantParam: 'tenantId' })
  @ApiOperation({
    summary: "List a company's accounts",
    description:
      'Returns the flat chart in code order, in the standard pagination envelope. `search` is ' +
      'matched against the code and the name after Persian normalization: Arabic/Persian ' +
      'yeh and kaf variants and Persian or Arabic-Indic digits find the same account. ' +
      '`type`, `active` and `postable` combine with AND. Requires "accounting.account.read".',
  })
  @ApiOkResponse({
    type: PaginatedAccountsDto,
    description: 'The matching accounts, paginated.',
    examples: {
      page: {
        summary: 'A search that folds the Arabic kaf',
        value: {
          data: [
            {
              id: '018f0d3c-6d0f-7a4b-9d4e-2b3c4d5e6f70',
              tenantId: '018f0d3c-6d0f-7a4b-9d4e-2b3c4d5e6f71',
              code: '110102',
              name: 'بانک ملت',
              level: 4,
              parentId: '018f0d3c-6d0f-7a4b-9d4e-2b3c4d5e6f72',
              type: 'asset',
              normalBalance: 'debit',
              postable: true,
              active: true,
              system: true,
              createdAt: '2026-11-01T09:30:00.000Z',
              updatedAt: '2026-11-01T09:30:00.000Z',
              revision: 1,
            },
          ],
          meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
        },
      },
    },
  })
  @ApiBadRequestResponse({
    type: ApiErrorResponseDto,
    description: 'Invalid query or pagination parameters.',
    examples: {
      invalidFilter: {
        summary: 'A query string boolean that is not true/false',
        value: {
          error: {
            code: 'VALIDATION_FAILED',
            category: 'validation',
            message: 'The request contains invalid values.',
            correlationId: '2f0a4b1c-9c3d-4f2a-8b7e-0d1c2a3b4c5d',
            details: [
              { field: 'active', code: 'isBoolean', message: 'active must be a boolean value' },
            ],
          },
        },
      },
      queryTenantId: {
        summary: 'A client tries to choose the company id in the query',
        value: {
          error: {
            code: 'VALIDATION_FAILED',
            category: 'validation',
            message: 'The request contains invalid values.',
            correlationId: '2f0a4b1c-9c3d-4f2a-8b7e-0d1c2a3b4c5d',
            details: [
              {
                field: 'tenantId',
                code: 'whitelistValidation',
                message: 'property tenantId should not exist',
              },
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
    @Query() query: ListAccountsQueryDto,
  ): Promise<Paginated<AccountResponseDto>> {
    const filter: ListAccountsQuery = {
      ...(query.search === undefined ? {} : { search: query.search }),
      ...(query.type === undefined ? {} : { type: query.type }),
      ...(query.active === undefined ? {} : { active: query.active }),
      ...(query.postable === undefined ? {} : { postable: query.postable }),
    };

    const outcome = await this.inTenantScope(tenantId, () =>
      this.listAccounts.execute(filter),
    );

    return outcome.match<Paginated<AccountResponseDto>>({
      ok: (accounts) => paginate(accounts.map(toAccountResponse), query),
      fail: (error) => this.raise(error),
    });
  }

  @Get('tree')
  @Authorize({ permission: READ_ACCOUNTS, tenantParam: 'tenantId' })
  @ApiOperation({
    summary: "Read a company's chart as a tree",
    description:
      'Returns the whole chart as roots with their subtrees, in account-code order at every ' +
      'level. With `rootId` the response is that account\'s subtree, so a client can expand a ' +
      'large chart lazily. A root that does not exist in this company — including an id that ' +
      'belongs to another company — is answered with ACCOUNT_NOT_FOUND (404). Requires ' +
      '"accounting.account.read".',
  })
  @ApiOkResponse({
    type: AccountTreeResponseDto,
    description: 'The requested tree (or subtree).',
    examples: {
      subtree: {
        summary: 'The tree from the cash group',
        value: {
          roots: [
            {
              id: '018f0d3c-6d0f-7a4b-9d4e-2b3c4d5e6f72',
              tenantId: '018f0d3c-6d0f-7a4b-9d4e-2b3c4d5e6f71',
              code: '1101',
              name: 'موجودی نقد و بانک‌ها',
              level: 3,
              parentId: '018f0d3c-6d0f-7a4b-9d4e-2b3c4d5e6f73',
              type: 'asset',
              normalBalance: 'debit',
              postable: false,
              active: true,
              system: true,
              createdAt: '2026-11-01T09:30:00.000Z',
              updatedAt: '2026-11-01T09:30:00.000Z',
              revision: 1,
              children: [
                {
                  id: '018f0d3c-6d0f-7a4b-9d4e-2b3c4d5e6f70',
                  tenantId: '018f0d3c-6d0f-7a4b-9d4e-2b3c4d5e6f71',
                  code: '110101',
                  name: 'صندوق',
                  level: 4,
                  parentId: '018f0d3c-6d0f-7a4b-9d4e-2b3c4d5e6f72',
                  type: 'asset',
                  normalBalance: 'debit',
                  postable: true,
                  active: true,
                  system: true,
                  createdAt: '2026-11-01T09:30:00.000Z',
                  updatedAt: '2026-11-01T09:30:00.000Z',
                  revision: 1,
                  children: [],
                },
              ],
            },
          ],
        },
      },
    },
  })
  @ApiBadRequestResponse({
    type: ApiErrorResponseDto,
    description: 'The root id or tenant id is malformed.',
    examples: {
      invalidRootId: {
        summary: 'A malformed account id',
        value: {
          error: {
            code: 'VALIDATION_FAILED',
            category: 'validation',
            message: 'The request contains invalid values.',
            correlationId: '2f0a4b1c-9c3d-4f2a-8b7e-0d1c2a3b4c5d',
            details: [
              { field: 'rootId', code: 'isUuid', message: 'rootId must be a UUID' },
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
  @ApiNotFoundResponse({
    type: ApiErrorResponseDto,
    description: 'No such account in this company.',
    examples: {
      notFound: {
        summary: 'Unknown or foreign root id',
        value: {
          error: {
            code: 'ACCOUNT_NOT_FOUND',
            category: 'domain',
            message: 'The account could not be found in the current tenant.',
            correlationId: '2f0a4b1c-9c3d-4f2a-8b7e-0d1c2a3b4c5d',
            details: [
              {
                code: 'ACCOUNT_NOT_FOUND',
                field: 'id',
                message: 'Account not found',
              },
            ],
          },
        },
      },
    },
  })
  async tree(
    @Param('tenantId') tenantId: string,
    @Query() query: AccountTreeQueryDto,
  ): Promise<AccountTreeResponseDto> {
    const outcome = await this.inTenantScope(tenantId, () =>
      this.getAccountTree.execute(
        query.rootId === undefined ? {} : { rootId: query.rootId },
      ),
    );

    return outcome.match<AccountTreeResponseDto>({
      ok: toAccountTreeResponse,
      fail: (error) => this.raise(error),
    });
  }

  @Post('standard-template/activate')
  @Authorize({ permission: MANAGE_ACCOUNTS, tenantParam: 'tenantId' })
  @ApiOperation({
    summary: 'Activate the standard chart template',
    description:
      'Creates the versioned standard chart for this company in one transaction, parents ' +
      'before children, with the system flag. Activation is allowed once per company and ' +
      'version: a second call creates nothing and is refused with ' +
      'ACCOUNT_TEMPLATE_ALREADY_APPLIED (409). The accounts are normal accounts afterwards. ' +
      'Requires "accounting.account.manage".',
  })
  @ApiCreatedResponse({
    type: StandardChartActivationResponseDto,
    description: 'The standard chart was created.',
    examples: {
      activated: {
        summary: 'The beginning of the created chart',
        value: {
          templateVersion: 'ir-standard-v1',
          createdCount: 45,
          accounts: [
            {
              id: '018f0d3c-6d0f-7a4b-9d4e-2b3c4d5e6f70',
              tenantId: '018f0d3c-6d0f-7a4b-9d4e-2b3c4d5e6f71',
              code: '1',
              name: 'دارایی‌ها',
              level: 1,
              parentId: null,
              type: 'asset',
              normalBalance: 'debit',
              postable: false,
              active: true,
              system: true,
              createdAt: '2026-11-25T09:30:00.000Z',
              updatedAt: '2026-11-25T09:30:00.000Z',
              revision: 1,
            },
          ],
        },
      },
    },
  })
  @ApiBadRequestResponse({
    type: ApiErrorResponseDto,
    description: 'The template version is missing or malformed.',
    examples: {
      missingVersion: {
        summary: 'No template version was supplied',
        value: {
          error: {
            code: 'VALIDATION_FAILED',
            category: 'validation',
            message: 'The request contains invalid values.',
            correlationId: '2f0a4b1c-9c3d-4f2a-8b7e-0d1c2a3b4c5d',
            details: [
              {
                field: 'templateVersion',
                code: 'isString',
                message: 'templateVersion must be a string',
              },
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
  @ApiConflictResponse({
    type: ApiErrorResponseDto,
    description: 'The template was already applied to this company.',
    examples: {
      alreadyApplied: {
        summary: 'A second activation of the same version',
        value: {
          error: {
            code: 'ACCOUNT_TEMPLATE_ALREADY_APPLIED',
            category: 'domain',
            message: 'The standard chart template has already been applied to this company.',
            correlationId: '2f0a4b1c-9c3d-4f2a-8b7e-0d1c2a3b4c5d',
          },
        },
      },
      duplicateCode: {
        summary: 'A company account already uses one of the template codes',
        value: {
          error: {
            code: 'ACCOUNT_CODE_DUPLICATE',
            category: 'domain',
            message: 'An account with this code already exists in the tenant.',
            correlationId: '2f0a4b1c-9c3d-4f2a-8b7e-0d1c2a3b4c5d',
          },
        },
      },
    },
  })
  @ApiUnprocessableEntityResponse({
    type: ApiErrorResponseDto,
    description: 'The requested template is unknown or invalid.',
    examples: {
      unknownTemplate: {
        summary: 'An unknown template version',
        value: {
          error: {
            code: 'ACCOUNT_TEMPLATE_INVALID',
            category: 'domain',
            message: 'The standard chart template is not valid.',
            correlationId: '2f0a4b1c-9c3d-4f2a-8b7e-0d1c2a3b4c5d',
          },
        },
      },
    },
  })
  async activateTemplate(
    @Param('tenantId') tenantId: string,
    @Body() body: ActivateStandardChartDto,
  ): Promise<StandardChartActivationResponseDto> {
    const outcome = await this.inTenantScope(tenantId, () =>
      this.activateStandardChart.execute(
        new ActivateStandardChart({ templateVersion: body.templateVersion }),
      ),
    );

    return outcome.match<StandardChartActivationResponseDto>({
      ok: (result) => ({
        templateVersion: result.templateVersion,
        createdCount: result.createdCount,
        accounts: result.accounts.map(toAccountResponse),
      }),
      fail: (error) => this.raise(error),
    });
  }

  @Patch(':accountId')
  @Authorize({ permission: MANAGE_ACCOUNTS, tenantParam: 'tenantId' })
  @ApiOperation({
    summary: 'Update an account',
    description:
      'Applies only the provided changes. `version` is required: the update names the state ' +
      'the client read, so a concurrent change is answered with CONFLICT (409) instead of ' +
      'silently overwriting the winner. Structure fields are refused for an account already ' +
      'in use (ACCOUNT_IN_USE, 409). Requires "accounting.account.manage".',
  })
  @ApiOkResponse({
    type: AccountResponseDto,
    description: 'The account was updated.',
    examples: {
      updated: {
        summary: 'A renamed account at its next revision',
        value: {
          id: '018f0d3c-6d0f-7a4b-9d4e-2b3c4d5e6f70',
          tenantId: '018f0d3c-6d0f-7a4b-9d4e-2b3c4d5e6f71',
          code: '110106',
          name: 'صندوق شعبه شرق',
          level: 4,
          parentId: '018f0d3c-6d0f-7a4b-9d4e-2b3c4d5e6f72',
          type: 'asset',
          normalBalance: 'debit',
          postable: true,
          active: true,
          system: false,
          createdAt: '2026-11-25T09:30:00.000Z',
          updatedAt: '2026-11-25T10:00:00.000Z',
          revision: 2,
        },
      },
    },
  })
  @ApiBadRequestResponse({
    type: ApiErrorResponseDto,
    description: 'The body is invalid, the version is missing, or the account id is malformed.',
    examples: {
      missingVersion: {
        summary: 'No version was supplied',
        value: {
          error: {
            code: 'VALIDATION_FAILED',
            category: 'validation',
            message: 'The request contains invalid values.',
            correlationId: '2f0a4b1c-9c3d-4f2a-8b7e-0d1c2a3b4c5d',
            details: [
              { field: 'version', code: 'isInt', message: 'version must be an integer number' },
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
  @ApiNotFoundResponse({
    type: ApiErrorResponseDto,
    description: 'No such account in this company.',
    examples: {
      notFound: {
        summary: 'Unknown or foreign account id',
        value: {
          error: {
            code: 'ACCOUNT_NOT_FOUND',
            category: 'domain',
            message: 'The account could not be found in the current tenant.',
            correlationId: '2f0a4b1c-9c3d-4f2a-8b7e-0d1c2a3b4c5d',
          },
        },
      },
    },
  })
  @ApiConflictResponse({
    type: ApiErrorResponseDto,
    description: 'The account moved since it was read, or a used account was structurally changed.',
    examples: {
      staleVersion: {
        summary: 'The version in the body no longer matches the stored revision',
        value: {
          error: {
            code: 'CONFLICT',
            category: 'domain',
            message: 'The record was written by someone else; reload it and try again.',
            correlationId: '2f0a4b1c-9c3d-4f2a-8b7e-0d1c2a3b4c5d',
            details: [
              {
                code: 'STALE_REVISION',
                field: 'revision',
                message: 'The record is now at revision 2; this update was prepared against revision 1.',
              },
            ],
          },
        },
      },
      inUse: {
        summary: 'A used account\'s structure cannot change',
        value: {
          error: {
            code: 'ACCOUNT_IN_USE',
            category: 'domain',
            message: 'This account is in use and cannot be structurally changed.',
            correlationId: '2f0a4b1c-9c3d-4f2a-8b7e-0d1c2a3b4c5d',
          },
        },
      },
    },
  })
  @ApiUnprocessableEntityResponse({
    type: ApiErrorResponseDto,
    description: 'A hierarchy or lifecycle rule refused the change.',
    examples: {
      invalidParent: {
        summary: 'The new parent is missing, inactive or of another type',
        value: {
          error: {
            code: 'ACCOUNT_INVALID_PARENT',
            category: 'domain',
            message: 'The parent account does not exist or is not available for this operation.',
            correlationId: '2f0a4b1c-9c3d-4f2a-8b7e-0d1c2a3b4c5d',
          },
        },
      },
      roleProtected: {
        summary: 'The account is mapped to an accounting role',
        value: {
          error: {
            code: 'ACCOUNT_ROLE_ACCOUNT_PROTECTED',
            category: 'domain',
            message:
              'This account is assigned to an accounting role. Remap the role before disabling or making the account non-postable.',
            correlationId: '2f0a4b1c-9c3d-4f2a-8b7e-0d1c2a3b4c5d',
          },
        },
      },
    },
  })
  async update(
    @Param('tenantId') tenantId: string,
    @Param('accountId') accountId: string,
    @Body() body: UpdateAccountDto,
  ): Promise<AccountResponseDto> {
    const id = this.requireAccountId(accountId);
    const outcome = await this.inTenantScope(tenantId, () =>
      this.updateAccount.execute(
        new UpdateAccount({
          id,
          code: body.code,
          name: body.name,
          parentId: body.parentId,
          type: body.type,
          normalBalance: body.normalBalance,
          postable: body.postable,
          active: body.active,
          revision: body.version,
        }),
      ),
    );

    return outcome.match<AccountResponseDto>({
      ok: toAccountResponse,
      fail: (error) => this.raise(error),
    });
  }

  @Post(':accountId/deactivate')
  @Authorize({ permission: MANAGE_ACCOUNTS, tenantParam: 'tenantId' })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Deactivate an account',
    description:
      'Stops the account from receiving new postings while keeping it visible in history. ' +
      'Refused while active children exist (ACCOUNT_HAS_ACTIVE_CHILDREN, 409), while the account ' +
      'is in use (ACCOUNT_IN_USE, 409) or while an accounting role points at it ' +
      '(ACCOUNT_ROLE_ACCOUNT_PROTECTED, 422). `version` is required for optimistic concurrency. ' +
      'Requires "accounting.account.manage".',
  })
  @ApiOkResponse({
    type: AccountResponseDto,
    description: 'The account is now inactive.',
    examples: {
      deactivated: {
        summary: 'The deactivated account',
        value: {
          id: '018f0d3c-6d0f-7a4b-9d4e-2b3c4d5e6f70',
          tenantId: '018f0d3c-6d0f-7a4b-9d4e-2b3c4d5e6f71',
          code: '110106',
          name: 'صندوق شعبه شرق',
          level: 4,
          parentId: '018f0d3c-6d0f-7a4b-9d4e-2b3c4d5e6f72',
          type: 'asset',
          normalBalance: 'debit',
          postable: true,
          active: false,
          system: false,
          createdAt: '2026-11-25T09:30:00.000Z',
          updatedAt: '2026-11-25T10:15:00.000Z',
          revision: 3,
        },
      },
    },
  })
  @ApiBadRequestResponse({
    type: ApiErrorResponseDto,
    description: 'The body or the account id is invalid.',
    examples: {
      missingVersion: {
        summary: 'No version was supplied',
        value: {
          error: {
            code: 'VALIDATION_FAILED',
            category: 'validation',
            message: 'The request contains invalid values.',
            correlationId: '2f0a4b1c-9c3d-4f2a-8b7e-0d1c2a3b4c5d',
            details: [
              { field: 'version', code: 'isInt', message: 'version must be an integer number' },
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
  @ApiNotFoundResponse({
    type: ApiErrorResponseDto,
    description: 'No such account in this company.',
    examples: {
      notFound: {
        summary: 'Unknown or foreign account id',
        value: {
          error: {
            code: 'ACCOUNT_NOT_FOUND',
            category: 'domain',
            message: 'The account could not be found in the current tenant.',
            correlationId: '2f0a4b1c-9c3d-4f2a-8b7e-0d1c2a3b4c5d',
          },
        },
      },
    },
  })
  @ApiConflictResponse({
    type: ApiErrorResponseDto,
    description: 'The account moved, is in use, or has active children.',
    examples: {
      staleVersion: {
        summary: 'The version no longer matches the stored revision',
        value: {
          error: {
            code: 'CONFLICT',
            category: 'domain',
            message: 'The record was written by someone else; reload it and try again.',
            correlationId: '2f0a4b1c-9c3d-4f2a-8b7e-0d1c2a3b4c5d',
          },
        },
      },
      activeChildren: {
        summary: 'The account still has active children',
        value: {
          error: {
            code: 'ACCOUNT_HAS_ACTIVE_CHILDREN',
            category: 'domain',
            message: 'This account cannot be deactivated while it still has active child accounts.',
            correlationId: '2f0a4b1c-9c3d-4f2a-8b7e-0d1c2a3b4c5d',
          },
        },
      },
    },
  })
  @ApiUnprocessableEntityResponse({
    type: ApiErrorResponseDto,
    description: 'An accounting role still points at the account.',
    examples: {
      roleProtected: {
        summary: 'The role must be remapped first',
        value: {
          error: {
            code: 'ACCOUNT_ROLE_ACCOUNT_PROTECTED',
            category: 'domain',
            message:
              'This account is assigned to an accounting role. Remap the role before disabling or making the account non-postable.',
            correlationId: '2f0a4b1c-9c3d-4f2a-8b7e-0d1c2a3b4c5d',
          },
        },
      },
    },
  })
  async deactivate(
    @Param('tenantId') tenantId: string,
    @Param('accountId') accountId: string,
    @Body() body: DeactivateAccountDto,
  ): Promise<AccountResponseDto> {
    const id = this.requireAccountId(accountId);
    const outcome = await this.inTenantScope(tenantId, () =>
      this.deactivateAccount.execute(new DeactivateAccount({ id, revision: body.version })),
    );

    return outcome.match<AccountResponseDto>({
      ok: toAccountResponse,
      fail: (error) => this.raise(error),
    });
  }

  @Post(':accountId/reactivate')
  @Authorize({ permission: MANAGE_ACCOUNTS, tenantParam: 'tenantId' })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Reactivate an account',
    description:
      'Makes an inactive account available again. The parent must be active ' +
      '(ACCOUNT_PARENT_INACTIVE, 422). `version` is required for optimistic concurrency. ' +
      'Requires "accounting.account.manage".',
  })
  @ApiOkResponse({
    type: AccountResponseDto,
    description: 'The account is active again.',
    examples: {
      reactivated: {
        summary: 'The reactivated account',
        value: {
          id: '018f0d3c-6d0f-7a4b-9d4e-2b3c4d5e6f70',
          tenantId: '018f0d3c-6d0f-7a4b-9d4e-2b3c4d5e6f71',
          code: '110106',
          name: 'صندوق شعبه شرق',
          level: 4,
          parentId: '018f0d3c-6d0f-7a4b-9d4e-2b3c4d5e6f72',
          type: 'asset',
          normalBalance: 'debit',
          postable: true,
          active: true,
          system: false,
          createdAt: '2026-11-25T09:30:00.000Z',
          updatedAt: '2026-11-25T10:30:00.000Z',
          revision: 4,
        },
      },
    },
  })
  @ApiBadRequestResponse({
    type: ApiErrorResponseDto,
    description: 'The body or the account id is invalid.',
    examples: {
      missingVersion: {
        summary: 'No version was supplied',
        value: {
          error: {
            code: 'VALIDATION_FAILED',
            category: 'validation',
            message: 'The request contains invalid values.',
            correlationId: '2f0a4b1c-9c3d-4f2a-8b7e-0d1c2a3b4c5d',
            details: [
              { field: 'version', code: 'isInt', message: 'version must be an integer number' },
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
  @ApiNotFoundResponse({
    type: ApiErrorResponseDto,
    description: 'No such account in this company.',
    examples: {
      notFound: {
        summary: 'Unknown or foreign account id',
        value: {
          error: {
            code: 'ACCOUNT_NOT_FOUND',
            category: 'domain',
            message: 'The account could not be found in the current tenant.',
            correlationId: '2f0a4b1c-9c3d-4f2a-8b7e-0d1c2a3b4c5d',
          },
        },
      },
    },
  })
  @ApiConflictResponse({
    type: ApiErrorResponseDto,
    description: 'The account moved since it was read.',
    examples: {
      staleVersion: {
        summary: 'The version no longer matches the stored revision',
        value: {
          error: {
            code: 'CONFLICT',
            category: 'domain',
            message: 'The record was written by someone else; reload it and try again.',
            correlationId: '2f0a4b1c-9c3d-4f2a-8b7e-0d1c2a3b4c5d',
          },
        },
      },
    },
  })
  @ApiUnprocessableEntityResponse({
    type: ApiErrorResponseDto,
    description: 'The parent of the account is inactive.',
    examples: {
      inactiveParent: {
        summary: 'A child cannot be reactivated under an inactive parent',
        value: {
          error: {
            code: 'ACCOUNT_PARENT_INACTIVE',
            category: 'domain',
            message: 'The parent account must be active before this action is allowed.',
            correlationId: '2f0a4b1c-9c3d-4f2a-8b7e-0d1c2a3b4c5d',
          },
        },
      },
    },
  })
  async reactivate(
    @Param('tenantId') tenantId: string,
    @Param('accountId') accountId: string,
    @Body() body: ReactivateAccountDto,
  ): Promise<AccountResponseDto> {
    const id = this.requireAccountId(accountId);
    const outcome = await this.inTenantScope(tenantId, () =>
      this.reactivateAccount.execute(new ReactivateAccount({ id, revision: body.version })),
    );

    return outcome.match<AccountResponseDto>({
      ok: toAccountResponse,
      fail: (error) => this.raise(error),
    });
  }

  @Delete(':accountId')
  @Authorize({ permission: MANAGE_ACCOUNTS, tenantParam: 'tenantId' })
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete an unused account',
    description:
      'Removes an account that has no children, no postings and was not created by the ' +
      'standard template. A used account (ACCOUNT_IN_USE, 409), an account with children ' +
      '(ACCOUNT_HAS_CHILDREN, 422) and a system account (ACCOUNT_SYSTEM_PROTECTED, 422) are ' +
      'refused. Accounts with history are deactivated instead. Requires ' +
      '"accounting.account.manage".',
  })
  @ApiNoContentResponse({ description: 'The account was deleted; no body follows.' })
  @ApiBadRequestResponse({
    type: ApiErrorResponseDto,
    description: 'The account id is malformed.',
    examples: {
      invalidId: {
        summary: 'A malformed account id',
        value: {
          error: {
            code: 'VALIDATION_FAILED',
            category: 'validation',
            message: 'The request contains invalid values.',
            correlationId: '2f0a4b1c-9c3d-4f2a-8b7e-0d1c2a3b4c5d',
            details: [
              { field: 'accountId', code: 'ACCOUNT_ID_INVALID', message: 'accountId must be a well-formed id' },
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
  @ApiNotFoundResponse({
    type: ApiErrorResponseDto,
    description: 'No such account in this company.',
    examples: {
      notFound: {
        summary: 'Unknown or foreign account id',
        value: {
          error: {
            code: 'ACCOUNT_NOT_FOUND',
            category: 'domain',
            message: 'The account could not be found in the current tenant.',
            correlationId: '2f0a4b1c-9c3d-4f2a-8b7e-0d1c2a3b4c5d',
          },
        },
      },
    },
  })
  @ApiConflictResponse({
    type: ApiErrorResponseDto,
    description: 'The account is in use.',
    examples: {
      inUse: {
        summary: 'A used account cannot be deleted',
        value: {
          error: {
            code: 'ACCOUNT_IN_USE',
            category: 'domain',
            message: 'This account is in use and cannot be structurally changed.',
            correlationId: '2f0a4b1c-9c3d-4f2a-8b7e-0d1c2a3b4c5d',
          },
        },
      },
    },
  })
  @ApiUnprocessableEntityResponse({
    type: ApiErrorResponseDto,
    description: 'The account is protected or still has children.',
    examples: {
      systemProtected: {
        summary: 'A template account cannot be deleted',
        value: {
          error: {
            code: 'ACCOUNT_SYSTEM_PROTECTED',
            category: 'domain',
            message: 'System accounts cannot be structurally modified.',
            correlationId: '2f0a4b1c-9c3d-4f2a-8b7e-0d1c2a3b4c5d',
          },
        },
      },
      hasChildren: {
        summary: 'The account still has children',
        value: {
          error: {
            code: 'ACCOUNT_HAS_CHILDREN',
            category: 'domain',
            message: 'This account cannot be deleted while it still has child accounts.',
            correlationId: '2f0a4b1c-9c3d-4f2a-8b7e-0d1c2a3b4c5d',
          },
        },
      },
    },
  })
  async remove(
    @Param('tenantId') tenantId: string,
    @Param('accountId') accountId: string,
  ): Promise<void> {
    const id = this.requireAccountId(accountId);
    const outcome = await this.inTenantScope(tenantId, () =>
      this.deleteAccount.execute(new DeleteAccount({ id })),
    );

    outcome.match<void>({
      ok: () => undefined,
      fail: (error) => this.raise(error),
    });
  }

  /** Refuses a malformed path id as a validation failure (400), not a 500. */
  private requireAccountId(raw: string): string {
    if (!isAccountId(raw)) {
      throw ApiErrorException.validation([
        {
          field: 'accountId',
          code: 'ACCOUNT_ID_INVALID',
          message: 'accountId must be a well-formed id',
        },
      ]);
    }

    return raw;
  }

  /**
   * Checks that the route carries a well-formed tenant identifier and then
   * runs `work` under the tenant scope the trusted boundary published.
   *
   * The scope itself is established once, by the global tenant-scope
   * interceptor, from the tenant the authorization boundary proved for this
   * caller's membership (IAM-007). This helper therefore establishes nothing:
   * it refuses a malformed route identifier as not-found and lets the
   * established scope stand, so the use case's own tenant comparison is the
   * authority on whether a record may be read.
   */
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
