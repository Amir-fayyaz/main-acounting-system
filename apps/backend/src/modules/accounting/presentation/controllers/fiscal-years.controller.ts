import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
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
import { PaginationQueryDto } from '../../../../infrastructure/api/pagination/pagination-query.dto.js';
import type { DomainError } from '../../../../shared/errors/domain-error.js';
import { CreateFiscalYear } from '../../application/commands/create-fiscal-year.command.js';
import { GetFiscalYear } from '../../application/queries/get-fiscal-year.query.js';
import { ListFiscalPeriods } from '../../application/queries/list-fiscal-periods.query.js';
import { ListFiscalYears } from '../../application/queries/list-fiscal-years.query.js';
import { CreateFiscalYearUseCase } from '../../application/use-cases/create-fiscal-year.use-case.js';
import { GetFiscalYearUseCase } from '../../application/use-cases/get-fiscal-year.use-case.js';
import { ListFiscalPeriodsUseCase } from '../../application/use-cases/list-fiscal-periods.use-case.js';
import { ListFiscalYearsUseCase } from '../../application/use-cases/list-fiscal-years.use-case.js';
import { isTenantReference } from '../../domain/value-objects/tenant-reference.js';
import { CreateFiscalYearDto } from '../dto/create-fiscal-year.dto.js';
import {
  FiscalPeriodResponseDto,
  toFiscalPeriodResponse,
} from '../dto/fiscal-period-response.dto.js';
import {
  FiscalYearResponseDto,
  toFiscalYearResponse,
} from '../dto/fiscal-year-response.dto.js';
import { PaginatedFiscalPeriodsDto } from '../dto/paginated-fiscal-periods.dto.js';
import { PaginatedFiscalYearsDto } from '../dto/paginated-fiscal-years.dto.js';

/**
 * The fiscal year REST resource (FIS-002; FIS-004; FND-006; ADR-013).
 *
 * Modelled on `RolesController` (`identity/presentation`): the resource is
 * nested under the tenant (`/tenants/:tenantId/fiscal-years`), every operation
 * declares its capability with `@Authorize({ permission, tenantParam })`, and
 * the handler only validates input through the global pipe, delegates to a use
 * case and maps the outcome to a DTO — no business rule lives here
 * (`src/modules/README.md` rule 7).
 *
 * **Permission.** Every operation requires the one accounting capability the
 * FIS-005 use cases already check — `accounting.period.manage` — which the
 * authorization boundary verifies against the caller's active membership in
 * the path's tenant before this handler runs.
 *
 * **Tenant.** The tenant comes from the tenant context only: the boundary
 * proves the membership, the global tenant-scope interceptor publishes *that*
 * tenant as the ambient scope, and the use case compares its work against it
 * (SHR-007; IAM-007). No header, body or query field is read as tenant
 * identity; a `tenantId` in the body is rejected by the validation pipe as an
 * unknown property.
 *
 * **Error contract.** A failed outcome is rethrown as the `DomainError` it is,
 * so the shared exception filter serializes the module's own fiscal code with
 * the HTTP status of its category (doc 13): `FISCAL_YEAR_OVERLAP` answers 409,
 * `FISCAL_YEAR_NOT_FOUND` 404, rejected input 400, a business-rule refusal 422.
 * Unlike the tenant/role controllers, this one deliberately does *not* fold a
 * conflict into the generic `CONFLICT` code — the fiscal vocabulary is the
 * contract this resource documents.
 */
@ApiBearerAuth()
@ApiTags('fiscal-years')
@Controller('tenants/:tenantId/fiscal-years')
export class FiscalYearsController {
  public constructor(
    private readonly createFiscalYear: CreateFiscalYearUseCase,
    private readonly getFiscalYear: GetFiscalYearUseCase,
    private readonly listFiscalYears: ListFiscalYearsUseCase,
    private readonly listFiscalPeriods: ListFiscalPeriodsUseCase,
  ) {}

  @Post()
  @Authorize({ permission: 'accounting.period.manage', tenantParam: 'tenantId' })
  @ApiOperation({
    summary: 'Create a fiscal year',
    description:
      'Creates the annual frame and generates its twelve monthly periods in the same transaction. ' +
      'Requires an active membership in the tenant with "accounting.period.manage". The tenant is ' +
      'taken from the path and the verified membership — never from the body. An overlapping range ' +
      'is refused with FISCAL_YEAR_OVERLAP (409); a duplicate label with FISCAL_YEAR_LABEL_DUPLICATE (409).',
  })
  @ApiCreatedResponse({
    type: FiscalYearResponseDto,
    description: 'The fiscal year was created and its twelve periods generated.',
    examples: {
      created: {
        summary: 'A newly created fiscal year',
        value: {
          id: '018f0d3c-6d0f-7a4b-9d4e-2b3c4d5e6f70',
          tenantId: '018f0d3c-6d0f-7a4b-9d4e-2b3c4d5e6f71',
          label: 'FY1405',
          startDate: '2026-03-21',
          endDate: '2027-03-20',
          status: 'open',
          revision: 1,
          createdAt: '2026-11-01T09:30:00.000Z',
          updatedAt: '2026-11-01T09:30:00.000Z',
        },
      },
    },
  })
  @ApiBadRequestResponse({
    type: ApiErrorResponseDto,
    description: 'Request validation failed, or the input is not a usable year.',
    examples: {
      invalidBody: {
        summary: 'A malformed date',
        value: {
          error: {
            code: 'VALIDATION_FAILED',
            category: 'validation',
            message: 'The request contains invalid values.',
            correlationId: '2f0a4b1c-9c3d-4f2a-8b7e-0d1c2a3b4c5d',
            details: [
              {
                field: 'startDate',
                code: 'matches',
                message: 'startDate must be a calendar date in YYYY-MM-DD format',
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
      invalidRange: {
        summary: 'The range does not start strictly before its end',
        value: {
          error: {
            code: 'FISCAL_YEAR_INVALID_RANGE',
            category: 'domain',
            message: 'A fiscal year must start strictly before it ends.',
            correlationId: '2f0a4b1c-9c3d-4f2a-8b7e-0d1c2a3b4c5d',
            details: [
              {
                code: 'FISCAL_YEAR_INVALID_RANGE',
                field: 'startDate',
                message: 'startDate must be strictly before endDate',
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
    description: 'The caller lacks "accounting.period.manage" or has no membership in the company.',
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
                message: 'the operation requires "accounting.period.manage"',
              },
            ],
          },
        },
      },
      notAMember: {
        summary: 'The caller is not a member of the company',
        value: {
          error: {
            code: 'TENANT_ACCESS_DENIED',
            category: 'client',
            message: 'The authenticated principal cannot access this tenant.',
            correlationId: '2f0a4b1c-9c3d-4f2a-8b7e-0d1c2a3b4c5d',
          },
        },
      },
    },
  })
  @ApiConflictResponse({
    type: ApiErrorResponseDto,
    description: 'The requested year collides with an existing one of the same company.',
    examples: {
      overlap: {
        summary: 'Another year of this company already covers these dates',
        value: {
          error: {
            code: 'FISCAL_YEAR_OVERLAP',
            category: 'domain',
            message: 'A fiscal year of this company already covers part of the requested date range.',
            correlationId: '2f0a4b1c-9c3d-4f2a-8b7e-0d1c2a3b4c5d',
          },
        },
      },
      duplicateLabel: {
        summary: 'Another year of this company already uses that label',
        value: {
          error: {
            code: 'FISCAL_YEAR_LABEL_DUPLICATE',
            category: 'domain',
            message: 'Another fiscal year of this company already uses that label.',
            correlationId: '2f0a4b1c-9c3d-4f2a-8b7e-0d1c2a3b4c5d',
          },
        },
      },
    },
  })
  @ApiUnprocessableEntityResponse({
    type: ApiErrorResponseDto,
    description: 'A business rule refused the year (for example, it is not exactly one Jalali year).',
    examples: {
      notOneJalaliYear: {
        summary: 'The range does not span exactly one Jalali year',
        value: {
          error: {
            code: 'FISCAL_PERIOD_STRUCTURE',
            category: 'domain',
            message: 'A fiscal year must span exactly one Jalali year.',
            correlationId: '2f0a4b1c-9c3d-4f2a-8b7e-0d1c2a3b4c5d',
          },
        },
      },
    },
  })
  async create(
    @Param('tenantId') tenantId: string,
    @Body() body: CreateFiscalYearDto,
  ): Promise<FiscalYearResponseDto> {
    const outcome = await this.inTenantScope(tenantId, () =>
      this.createFiscalYear.execute(
        new CreateFiscalYear({
          label: body.label,
          startDate: body.startDate,
          endDate: body.endDate,
        }),
      ),
    );

    return outcome.match<FiscalYearResponseDto>({
      ok: toFiscalYearResponse,
      fail: (error) => this.raise(error),
    });
  }

  @Get()
  @Authorize({ permission: 'accounting.period.manage', tenantParam: 'tenantId' })
  @ApiOperation({
    summary: "List a company's fiscal years",
    description:
      'Returns the fiscal years of the caller\'s company in the standard pagination envelope. ' +
      'Requires an active membership in the tenant with "accounting.period.manage". ' +
      "Another company's years are never listed: the rows come from the verified tenant scope.",
  })
  @ApiOkResponse({
    type: PaginatedFiscalYearsDto,
    description: 'The fiscal years of the company, paginated.',
    examples: {
      page: {
        summary: 'The first page',
        value: {
          data: [
            {
              id: '018f0d3c-6d0f-7a4b-9d4e-2b3c4d5e6f70',
              tenantId: '018f0d3c-6d0f-7a4b-9d4e-2b3c4d5e6f71',
              label: 'FY1405',
              startDate: '2026-03-21',
              endDate: '2027-03-20',
              status: 'open',
              revision: 1,
              createdAt: '2026-11-01T09:30:00.000Z',
              updatedAt: '2026-11-01T09:30:00.000Z',
            },
          ],
          meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
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
            details: [{ field: 'limit', code: 'max', message: 'limit must not be greater than 100' }],
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
    description: 'The caller lacks "accounting.period.manage" or has no membership in the company.',
    examples: {
      missingPermission: {
        summary: 'A member without the capability',
        value: {
          error: {
            code: 'AUTHORIZATION_DENIED',
            category: 'client',
            message: 'The authenticated principal is not authorized to perform this operation.',
            correlationId: '2f0a4b1c-9c3d-4f2a-8b7e-0d1c2a3b4c5d',
          },
        },
      },
    },
  })
  async list(
    @Param('tenantId') tenantId: string,
    @Query() query: PaginationQueryDto,
  ): Promise<Paginated<FiscalYearResponseDto>> {
    const outcome = await this.inTenantScope(tenantId, () =>
      this.listFiscalYears.execute(new ListFiscalYears()),
    );

    return outcome.match<Paginated<FiscalYearResponseDto>>({
      ok: (years) => paginate(years.map(toFiscalYearResponse), query),
      fail: (error) => this.raise(error),
    });
  }

  @Get(':fiscalYearId')
  @Authorize({ permission: 'accounting.period.manage', tenantParam: 'tenantId' })
  @ApiOperation({
    summary: 'Get one fiscal year by id',
    description:
      'Requires an active membership in the tenant with "accounting.period.manage". A year of ' +
      "another company is answered exactly like one that does not exist (404), so the read never " +
      'confirms a foreign record.',
  })
  @ApiOkResponse({
    type: FiscalYearResponseDto,
    description: 'The requested fiscal year.',
    examples: {
      found: {
        summary: 'An open fiscal year',
        value: {
          id: '018f0d3c-6d0f-7a4b-9d4e-2b3c4d5e6f70',
          tenantId: '018f0d3c-6d0f-7a4b-9d4e-2b3c4d5e6f71',
          label: 'FY1405',
          startDate: '2026-03-21',
          endDate: '2027-03-20',
          status: 'open',
          revision: 1,
          createdAt: '2026-11-01T09:30:00.000Z',
          updatedAt: '2026-11-01T09:30:00.000Z',
        },
      },
    },
  })
  @ApiBadRequestResponse({
    type: ApiErrorResponseDto,
    description: 'The path identifier is not a well-formed fiscal year id.',
    examples: {
      invalidId: {
        summary: 'A malformed id',
        value: {
          error: {
            code: 'VALIDATION_FAILED',
            category: 'validation',
            message: 'The request contains invalid values.',
            correlationId: '2f0a4b1c-9c3d-4f2a-8b7e-0d1c2a3b4c5d',
            details: [
              {
                field: 'fiscalYearId',
                code: 'FISCAL_YEAR_ID_INVALID',
                message: 'fiscalYearId must be a well-formed id',
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
    description: 'The caller lacks "accounting.period.manage" or has no membership in the company.',
    examples: {
      missingPermission: {
        summary: 'A member without the capability',
        value: {
          error: {
            code: 'AUTHORIZATION_DENIED',
            category: 'client',
            message: 'The authenticated principal is not authorized to perform this operation.',
            correlationId: '2f0a4b1c-9c3d-4f2a-8b7e-0d1c2a3b4c5d',
          },
        },
      },
    },
  })
  @ApiNotFoundResponse({
    type: ApiErrorResponseDto,
    description: 'No fiscal year with that identity exists for this company.',
    examples: {
      notFound: {
        summary: 'Unknown or foreign fiscal year id',
        value: {
          error: {
            code: 'FISCAL_YEAR_NOT_FOUND',
            category: 'domain',
            message: 'No fiscal year with that identity exists for this company.',
            correlationId: '2f0a4b1c-9c3d-4f2a-8b7e-0d1c2a3b4c5d',
            details: [
              {
                code: 'FISCAL_YEAR_NOT_FOUND',
                field: 'fiscalYearId',
                message: 'fiscalYearId does not name a fiscal year of this company',
              },
            ],
          },
        },
      },
    },
  })
  async findOne(
    @Param('tenantId') tenantId: string,
    @Param('fiscalYearId') fiscalYearId: string,
  ): Promise<FiscalYearResponseDto> {
    const outcome = await this.inTenantScope(tenantId, () =>
      this.getFiscalYear.execute(new GetFiscalYear({ fiscalYearId })),
    );

    return outcome.match<FiscalYearResponseDto>({
      ok: toFiscalYearResponse,
      fail: (error) => this.raise(error),
    });
  }

  @Get(':fiscalYearId/periods')
  @Authorize({ permission: 'accounting.period.manage', tenantParam: 'tenantId' })
  @ApiOperation({
    summary: "List a fiscal year's periods",
    description:
      'Returns the year\'s monthly periods in sequence order, in the standard pagination envelope. ' +
      'Requires an active membership in the tenant with "accounting.period.manage". A year of ' +
      'another company is answered with FISCAL_YEAR_NOT_FOUND (404).',
  })
  @ApiOkResponse({
    type: PaginatedFiscalPeriodsDto,
    description: 'The periods of the fiscal year, in sequence order.',
    examples: {
      firstMonths: {
        summary: 'The first two months of the year',
        value: {
          data: [
            {
              id: '018f0d3c-6d0f-7a4b-9d4e-2b3c4d5e6f80',
              tenantId: '018f0d3c-6d0f-7a4b-9d4e-2b3c4d5e6f71',
              fiscalYearId: '018f0d3c-6d0f-7a4b-9d4e-2b3c4d5e6f70',
              jalaliYear: 1405,
              sequence: 1,
              startDate: '2026-03-21',
              endDate: '2026-04-19',
              state: 'open',
              createdAt: '2026-11-01T09:30:00.000Z',
              updatedAt: '2026-11-01T09:30:00.000Z',
            },
            {
              id: '018f0d3c-6d0f-7a4b-9d4e-2b3c4d5e6f81',
              tenantId: '018f0d3c-6d0f-7a4b-9d4e-2b3c4d5e6f71',
              fiscalYearId: '018f0d3c-6d0f-7a4b-9d4e-2b3c4d5e6f70',
              jalaliYear: 1405,
              sequence: 2,
              startDate: '2026-04-20',
              endDate: '2026-05-20',
              state: 'open',
              createdAt: '2026-11-01T09:30:00.000Z',
              updatedAt: '2026-11-01T09:30:00.000Z',
            },
          ],
          meta: { page: 1, limit: 20, total: 12, totalPages: 1 },
        },
      },
    },
  })
  @ApiBadRequestResponse({
    type: ApiErrorResponseDto,
    description: 'The path identifier or the pagination query is invalid.',
    examples: {
      invalidId: {
        summary: 'A malformed fiscal year id',
        value: {
          error: {
            code: 'VALIDATION_FAILED',
            category: 'validation',
            message: 'The request contains invalid values.',
            correlationId: '2f0a4b1c-9c3d-4f2a-8b7e-0d1c2a3b4c5d',
            details: [
              {
                field: 'fiscalYearId',
                code: 'FISCAL_YEAR_ID_INVALID',
                message: 'fiscalYearId must be a well-formed id',
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
    description: 'The caller lacks "accounting.period.manage" or has no membership in the company.',
    examples: {
      missingPermission: {
        summary: 'A member without the capability',
        value: {
          error: {
            code: 'AUTHORIZATION_DENIED',
            category: 'client',
            message: 'The authenticated principal is not authorized to perform this operation.',
            correlationId: '2f0a4b1c-9c3d-4f2a-8b7e-0d1c2a3b4c5d',
          },
        },
      },
    },
  })
  @ApiNotFoundResponse({
    type: ApiErrorResponseDto,
    description: 'No fiscal year with that identity exists for this company.',
    examples: {
      notFound: {
        summary: 'Unknown or foreign fiscal year id',
        value: {
          error: {
            code: 'FISCAL_YEAR_NOT_FOUND',
            category: 'domain',
            message: 'No fiscal year with that identity exists for this company.',
            correlationId: '2f0a4b1c-9c3d-4f2a-8b7e-0d1c2a3b4c5d',
          },
        },
      },
    },
  })
  async listPeriods(
    @Param('tenantId') tenantId: string,
    @Param('fiscalYearId') fiscalYearId: string,
    @Query() query: PaginationQueryDto,
  ): Promise<Paginated<FiscalPeriodResponseDto>> {
    const outcome = await this.inTenantScope(tenantId, () =>
      this.listFiscalPeriods.execute(new ListFiscalPeriods({ fiscalYearId })),
    );

    return outcome.match<Paginated<FiscalPeriodResponseDto>>({
      ok: (periods) => paginate(periods.map(toFiscalPeriodResponse), query),
      fail: (error) => this.raise(error),
    });
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

  /**
   * Rethrows a failed outcome as the `DomainError` it is.
   *
   * The shared exception filter maps the failure's *category* to the HTTP
   * status of doc 13 (409 conflict, 404 not found, 400 validation, 422 domain)
   * and serializes the module's own code verbatim. Nothing is folded into a
   * generic infrastructure code here — `FISCAL_YEAR_OVERLAP`,
   * `FISCAL_YEAR_NOT_FOUND` and friends are this resource's contract.
   */
  private raise(error: DomainError): never {
    throw error;
  }
}
