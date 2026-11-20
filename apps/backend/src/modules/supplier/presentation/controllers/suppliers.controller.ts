import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Res,
} from '@nestjs/common';
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
import {
  Paginated,
  paginate,
  paginationMeta,
} from '../../../../infrastructure/api/pagination/pagination.js';
import {
  type AuthenticatedPrincipal,
  CurrentPrincipal,
} from '../../../../infrastructure/api/principal/current-principal.decorator.js';
import type { DomainError } from '../../../../shared/errors/domain-error.js';
import { Result } from '../../../../shared/errors/result.js';
import { EntityId } from '../../../../shared/id/entity-id.js';
import {
  ActivateSupplierCommand,
  CreateSupplierCommand,
  DeactivateSupplierCommand,
  UpdateSupplierCommand,
} from '../../application/commands/supplier.commands.js';
import {
  GetSupplierByIdQuery,
  ListSuppliersQuery,
  SearchSuppliersQuery,
} from '../../application/queries/supplier.queries.js';
import { ActivateSupplierUseCase } from '../../application/use-cases/activate-supplier.use-case.js';
import { CreateSupplierUseCase } from '../../application/use-cases/create-supplier.use-case.js';
import { DeactivateSupplierUseCase } from '../../application/use-cases/deactivate-supplier.use-case.js';
import { GetSupplierByIdUseCase } from '../../application/use-cases/get-supplier-by-id.use-case.js';
import { ListSuppliersUseCase } from '../../application/use-cases/list-suppliers.use-case.js';
import { SearchSuppliersUseCase } from '../../application/use-cases/search-suppliers.use-case.js';
import { UpdateSupplierUseCase } from '../../application/use-cases/update-supplier.use-case.js';
import { ActivateSupplierDto } from '../dto/activate-supplier.dto.js';
import { CreateSupplierSuccessResponseDto } from '../dto/create-supplier-response.dto.js';
import { CreateSupplierDto } from '../dto/create-supplier.dto.js';
import { DeactivateSupplierDto } from '../dto/deactivate-supplier.dto.js';
import { ListSuppliersQueryDto } from '../dto/list-suppliers-query.dto.js';
import { PaginatedSuppliersDto } from '../dto/paginated-suppliers.dto.js';
import {
  PossibleDuplicatesResponseDto,
  toPossibleDuplicateDto,
} from '../dto/possible-duplicate-supplier.dto.js';
import { SupplierResponseDto, toSupplierResponse } from '../dto/supplier-response.dto.js';
import { UpdateSupplierDto } from '../dto/update-supplier.dto.js';

interface StatusCapableResponse {
  status(code: number): void;
}

const UNAUTHENTICATED_EXAMPLE = {
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
};

const FORBIDDEN_MANAGE_EXAMPLE = {
  missingPermission: {
    summary: 'Caller lacks "supplier.manage" capability',
    value: {
      error: {
        code: 'AUTHORIZATION_DENIED',
        category: 'client',
        message: 'The authenticated principal is not authorized to perform this operation.',
        correlationId: '2f0a4b1c-9c3d-4f2a-8b7e-0d1c2a3b4c5d',
      },
    },
  },
};

const FORBIDDEN_READ_EXAMPLE = {
  missingPermission: {
    summary: 'Caller lacks "supplier.read" capability',
    value: {
      error: {
        code: 'AUTHORIZATION_DENIED',
        category: 'client',
        message: 'The authenticated principal is not authorized to perform this operation.',
        correlationId: '2f0a4b1c-9c3d-4f2a-8b7e-0d1c2a3b4c5d',
      },
    },
  },
};

const VALIDATION_FAILED_EXAMPLE = {
  invalidInput: {
    summary: 'Invalid request input or forbidden property',
    value: {
      error: {
        code: 'VALIDATION_FAILED',
        category: 'validation',
        message: 'The request contains invalid values.',
        correlationId: '2f0a4b1c-9c3d-4f2a-8b7e-0d1c2a3b4c5d',
        details: [
          {
            field: 'expectedRevision',
            code: 'isInt',
            message: 'expectedRevision must be an integer number',
          },
        ],
      },
    },
  },
};

const NOT_FOUND_EXAMPLE = {
  notFound: {
    summary: 'Supplier not found in current tenant',
    value: {
      error: {
        code: 'SUPPLIER_NOT_FOUND',
        category: 'domain',
        message: 'Supplier was not found in the current tenant.',
        correlationId: '2f0a4b1c-9c3d-4f2a-8b7e-0d1c2a3b4c5d',
      },
    },
  },
};

const STALE_REVISION_EXAMPLE = {
  staleRevision: {
    summary: 'Concurrent modification collision',
    value: {
      error: {
        code: 'STALE_REVISION',
        category: 'domain',
        message: 'The record was modified by another transaction.',
        correlationId: '2f0a4b1c-9c3d-4f2a-8b7e-0d1c2a3b4c5d',
      },
    },
  },
};

const SUPPLIER_RESPONSE_EXAMPLE = {
  supplier: {
    summary: 'Supplier details representation',
    value: {
      id: '018f0d3c-6d0f-7a4b-9d4e-2b3c4d5e6f70',
      code: 'SUP-001',
      name: 'شرکت تامین آزمای پارس',
      normalizedName: 'شرکت تامین ازمای پارس',
      identificationNumber: '10101234567',
      contactInfo: {
        phone: '+982188776655',
        email: 'info@supplier.example.com',
        address: 'تهران، خیابان آزادی، پلاک ۱۲',
        postalCode: '1458889911',
      },
      status: 'active',
      revision: 1,
      createdAt: '2026-11-01T09:30:00.000Z',
      updatedAt: '2026-11-01T09:30:00.000Z',
    },
  },
};

const PAGINATED_SUPPLIERS_EXAMPLE = {
  page: {
    summary: 'First page of suppliers',
    value: {
      data: [
        {
          id: '018f0d3c-6d0f-7a4b-9d4e-2b3c4d5e6f70',
          code: 'SUP-001',
          name: 'شرکت تامین آزمای پارس',
          normalizedName: 'شرکت تامین ازمای پارس',
          identificationNumber: '10101234567',
          contactInfo: {
            phone: '+982188776655',
            email: 'info@supplier.example.com',
            address: 'تهران، خیابان آزادی، پلاک ۱۲',
            postalCode: '1458889911',
          },
          status: 'active',
          revision: 1,
          createdAt: '2026-11-01T09:30:00.000Z',
          updatedAt: '2026-11-01T09:30:00.000Z',
        },
      ],
      meta: {
        page: 1,
        limit: 20,
        total: 1,
        totalPages: 1,
      },
    },
  },
};

/**
 * The Supplier REST resource (S5; PUR-001; ADR-013; 13-api-conventions).
 *
 * Exposes supplier management endpoints nested under tenant (`/tenants/:tenantId/suppliers`).
 *
 * Invariants & Policies:
 * - Tenant identity is strictly derived from the route parameter and verified membership.
 *   Body or query `tenantId` is rejected by the validation whitelist.
 * - Write operations require the `supplier.manage` capability.
 * - Read operations require the `supplier.read` capability.
 * - Optimistic concurrency is enforced on updates and status changes via `expectedRevision`.
 * - Potential duplicate detection produces an explicit review response (200 OK with candidates),
 *   distinguishable from duplicate code/identification errors (409 Conflict).
 * - Domain errors are rethrown and mapped by the global exception filter to standard error contracts.
 */
@ApiBearerAuth()
@ApiTags('suppliers')
@Controller('tenants/:tenantId/suppliers')
export class SuppliersController {
  public constructor(
    private readonly createSupplier: CreateSupplierUseCase,
    private readonly getSupplierById: GetSupplierByIdUseCase,
    private readonly updateSupplier: UpdateSupplierUseCase,
    private readonly deactivateSupplier: DeactivateSupplierUseCase,
    private readonly activateSupplier: ActivateSupplierUseCase,
    private readonly listSuppliers: ListSuppliersUseCase,
    private readonly searchSuppliers: SearchSuppliersUseCase,
  ) {}

  @Post()
  @Authorize({ permission: 'supplier.manage', tenantParam: 'tenantId' })
  @ApiOperation({
    summary: 'Create a new supplier',
    description:
      'Creates a new supplier in the tenant scope with duplicate protection. ' +
      'If matching normalized names exist and confirmDuplicate is false, returns 200 OK with ' +
      'possible duplicate candidates. If confirmDuplicate is true or no duplicates match, ' +
      'creates the supplier and returns 201 Created. ' +
      'Requires active membership with "supplier.manage".',
  })
  @ApiCreatedResponse({
    type: CreateSupplierSuccessResponseDto,
    description: 'The supplier was successfully created.',
    examples: {
      created: {
        summary: 'Newly created supplier',
        value: {
          status: 'created',
          supplier: SUPPLIER_RESPONSE_EXAMPLE.supplier.value,
        },
      },
    },
  })
  @ApiOkResponse({
    type: PossibleDuplicatesResponseDto,
    description:
      'Potential duplicates detected with matching normalized names. Requires confirmDuplicate=true to proceed.',
    examples: {
      possibleDuplicates: {
        summary: 'Matching duplicate candidates found',
        value: {
          status: 'possible_duplicates',
          duplicates: [
            {
              id: '018f0d3c-6d0f-7a4b-9d4e-2b3c4d5e6f70',
              code: 'SUP-001',
              name: 'شرکت تامین آزمای پارس',
              normalizedName: 'شرکت تامین ازمای پارس',
              identificationNumber: '10101234567',
              status: 'active',
            },
          ],
        },
      },
    },
  })
  @ApiBadRequestResponse({
    type: ApiErrorResponseDto,
    description: 'Validation failed or forbidden properties provided.',
    examples: {
      missingField: {
        summary: 'Missing required code or name',
        value: {
          error: {
            code: 'VALIDATION_FAILED',
            category: 'validation',
            message: 'The request contains invalid values.',
            correlationId: '2f0a4b1c-9c3d-4f2a-8b7e-0d1c2a3b4c5d',
            details: [
              {
                field: 'code',
                code: 'isNotEmpty',
                message: 'code should not be empty',
              },
            ],
          },
        },
      },
      bodyTenantId: {
        summary: 'Attempt to supply tenantId in body',
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
  @ApiConflictResponse({
    type: ApiErrorResponseDto,
    description: 'Code or identification number collides with an existing supplier.',
    examples: {
      codeDuplicate: {
        summary: 'Supplier code already exists in tenant',
        value: {
          error: {
            code: 'SUPPLIER_CODE_DUPLICATE',
            category: 'domain',
            message: 'A supplier with code "SUP-001" already exists in this tenant.',
            correlationId: '2f0a4b1c-9c3d-4f2a-8b7e-0d1c2a3b4c5d',
            details: [
              {
                code: 'SUPPLIER_CODE_DUPLICATE',
                field: 'code',
                message: 'Code "SUP-001" is already in use.',
              },
            ],
          },
        },
      },
      identificationDuplicate: {
        summary: 'Identification number already exists in tenant',
        value: {
          error: {
            code: 'SUPPLIER_IDENTIFICATION_DUPLICATE',
            category: 'domain',
            message:
              'A supplier with identification number "10101234567" already exists in this tenant.',
            correlationId: '2f0a4b1c-9c3d-4f2a-8b7e-0d1c2a3b4c5d',
            details: [
              {
                code: 'SUPPLIER_IDENTIFICATION_DUPLICATE',
                field: 'identificationNumber',
                message: 'Identification number "10101234567" is already in use.',
              },
            ],
          },
        },
      },
    },
  })
  @ApiForbiddenResponse({
    type: ApiErrorResponseDto,
    description: 'Caller lacks "supplier.manage" capability or tenant membership.',
    examples: FORBIDDEN_MANAGE_EXAMPLE,
  })
  @ApiUnauthorizedResponse({
    type: ApiErrorResponseDto,
    description: 'Authentication required.',
    examples: UNAUTHENTICATED_EXAMPLE,
  })
  async create(
    @Param('tenantId') tenantId: string,
    @Body() body: CreateSupplierDto,
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
    @Res({ passthrough: true }) response: StatusCapableResponse,
  ): Promise<CreateSupplierSuccessResponseDto | PossibleDuplicatesResponseDto> {
    const outcome = await this.inTenantScope(tenantId, () =>
      this.createSupplier.execute(
        new CreateSupplierCommand({
          code: body.code,
          name: body.name,
          identificationNumber: body.identificationNumber,
          contactInfo: body.contactInfo,
          confirmDuplicate: body.confirmDuplicate,
          principal,
        }),
      ),
    );

    return outcome.match<CreateSupplierSuccessResponseDto | PossibleDuplicatesResponseDto>({
      ok: (result) => {
        if (result.status === 'possible_duplicates') {
          response.status(HttpStatus.OK);
          return {
            status: 'possible_duplicates',
            duplicates: result.duplicates.map(toPossibleDuplicateDto),
          };
        }
        response.status(HttpStatus.CREATED);
        return {
          status: 'created',
          supplier: toSupplierResponse(result.supplier),
        };
      },
      fail: (error) => this.raise(error),
    });
  }

  @Get(':supplierId')
  @Authorize({ permission: 'supplier.read', tenantParam: 'tenantId' })
  @ApiOperation({
    summary: 'Get a supplier by ID',
    description:
      'Retrieves supplier details by supplierId for the verified tenant. ' +
      'Requires active membership with "supplier.read". ' +
      'Returns 404 SUPPLIER_NOT_FOUND if not found or belongs to another tenant.',
  })
  @ApiOkResponse({
    type: SupplierResponseDto,
    description: 'The requested supplier representation.',
    examples: SUPPLIER_RESPONSE_EXAMPLE,
  })
  @ApiNotFoundResponse({
    type: ApiErrorResponseDto,
    description: 'No supplier with that ID exists in this tenant.',
    examples: NOT_FOUND_EXAMPLE,
  })
  @ApiForbiddenResponse({
    type: ApiErrorResponseDto,
    description: 'Caller lacks "supplier.read" capability.',
    examples: FORBIDDEN_READ_EXAMPLE,
  })
  @ApiUnauthorizedResponse({
    type: ApiErrorResponseDto,
    description: 'Authentication required.',
    examples: UNAUTHENTICATED_EXAMPLE,
  })
  async findOne(
    @Param('tenantId') tenantId: string,
    @Param('supplierId') supplierId: string,
  ): Promise<SupplierResponseDto> {
    const outcome = await this.inTenantScope(tenantId, () =>
      this.getSupplierById.execute(new GetSupplierByIdQuery({ id: supplierId })),
    );

    return outcome.match<SupplierResponseDto>({
      ok: toSupplierResponse,
      fail: (error) => this.raise(error),
    });
  }

  @Patch(':supplierId')
  @Authorize({ permission: 'supplier.manage', tenantParam: 'tenantId' })
  @ApiOperation({
    summary: 'Update an existing supplier',
    description:
      'Updates supplier properties. Requires active membership with "supplier.manage". ' +
      'Requires expectedRevision for optimistic concurrency; returns 409 if revision is stale. ' +
      'Returns 409 if new code or identification number collides with an existing supplier.',
  })
  @ApiOkResponse({
    type: SupplierResponseDto,
    description: 'The updated supplier representation.',
    examples: SUPPLIER_RESPONSE_EXAMPLE,
  })
  @ApiNotFoundResponse({
    type: ApiErrorResponseDto,
    description: 'No supplier with that ID exists in this tenant.',
    examples: NOT_FOUND_EXAMPLE,
  })
  @ApiConflictResponse({
    type: ApiErrorResponseDto,
    description: 'Revision collision (stale revision) or duplicate code/identification.',
    examples: STALE_REVISION_EXAMPLE,
  })
  @ApiBadRequestResponse({
    type: ApiErrorResponseDto,
    description: 'Validation failed.',
    examples: VALIDATION_FAILED_EXAMPLE,
  })
  @ApiForbiddenResponse({
    type: ApiErrorResponseDto,
    description: 'Caller lacks "supplier.manage" capability.',
    examples: FORBIDDEN_MANAGE_EXAMPLE,
  })
  @ApiUnauthorizedResponse({
    type: ApiErrorResponseDto,
    description: 'Authentication required.',
    examples: UNAUTHENTICATED_EXAMPLE,
  })
  async update(
    @Param('tenantId') tenantId: string,
    @Param('supplierId') supplierId: string,
    @Body() body: UpdateSupplierDto,
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
  ): Promise<SupplierResponseDto> {
    const outcome = await this.inTenantScope(tenantId, () =>
      this.updateSupplier.execute(
        new UpdateSupplierCommand({
          id: supplierId,
          expectedRevision: body.expectedRevision,
          code: body.code,
          name: body.name,
          identificationNumber: body.identificationNumber,
          contactInfo: body.contactInfo,
          principal,
        }),
      ),
    );

    return outcome.match<SupplierResponseDto>({
      ok: toSupplierResponse,
      fail: (error) => this.raise(error),
    });
  }

  @Post(':supplierId/deactivate')
  @HttpCode(HttpStatus.OK)
  @Authorize({ permission: 'supplier.manage', tenantParam: 'tenantId' })
  @ApiOperation({
    summary: 'Deactivate a supplier',
    description:
      'Marks a supplier as inactive. Inactive suppliers are excluded from other module lookups. ' +
      'Requires expectedRevision for optimistic concurrency; returns 422 if already inactive.',
  })
  @ApiOkResponse({
    type: SupplierResponseDto,
    description: 'The deactivated supplier representation.',
    examples: SUPPLIER_RESPONSE_EXAMPLE,
  })
  @ApiNotFoundResponse({
    type: ApiErrorResponseDto,
    description: 'No supplier with that ID exists in this tenant.',
    examples: NOT_FOUND_EXAMPLE,
  })
  @ApiUnprocessableEntityResponse({
    type: ApiErrorResponseDto,
    description: 'Supplier is already inactive.',
    examples: {
      alreadyInactive: {
        summary: 'Supplier already inactive',
        value: {
          error: {
            code: 'SUPPLIER_ALREADY_INACTIVE',
            category: 'domain',
            message: 'Supplier "018f0d3c-6d0f-7a4b-9d4e-2b3c4d5e6f70" is already inactive.',
            correlationId: '2f0a4b1c-9c3d-4f2a-8b7e-0d1c2a3b4c5d',
          },
        },
      },
    },
  })
  @ApiConflictResponse({
    type: ApiErrorResponseDto,
    description: 'Revision collision (stale revision).',
    examples: STALE_REVISION_EXAMPLE,
  })
  @ApiBadRequestResponse({
    type: ApiErrorResponseDto,
    description: 'Validation failed.',
    examples: VALIDATION_FAILED_EXAMPLE,
  })
  @ApiForbiddenResponse({
    type: ApiErrorResponseDto,
    description: 'Caller lacks "supplier.manage" capability.',
    examples: FORBIDDEN_MANAGE_EXAMPLE,
  })
  @ApiUnauthorizedResponse({
    type: ApiErrorResponseDto,
    description: 'Authentication required.',
    examples: UNAUTHENTICATED_EXAMPLE,
  })
  async deactivate(
    @Param('tenantId') tenantId: string,
    @Param('supplierId') supplierId: string,
    @Body() body: DeactivateSupplierDto,
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
  ): Promise<SupplierResponseDto> {
    const outcome = await this.inTenantScope(tenantId, () =>
      this.deactivateSupplier.execute(
        new DeactivateSupplierCommand({
          id: supplierId,
          expectedRevision: body.expectedRevision,
          principal,
        }),
      ),
    );

    return outcome.match<SupplierResponseDto>({
      ok: toSupplierResponse,
      fail: (error) => this.raise(error),
    });
  }

  @Post(':supplierId/activate')
  @HttpCode(HttpStatus.OK)
  @Authorize({ permission: 'supplier.manage', tenantParam: 'tenantId' })
  @ApiOperation({
    summary: 'Activate a supplier',
    description:
      'Re-activates an inactive supplier. ' +
      'Requires expectedRevision for optimistic concurrency; returns 422 if already active.',
  })
  @ApiOkResponse({
    type: SupplierResponseDto,
    description: 'The activated supplier representation.',
    examples: SUPPLIER_RESPONSE_EXAMPLE,
  })
  @ApiNotFoundResponse({
    type: ApiErrorResponseDto,
    description: 'No supplier with that ID exists in this tenant.',
    examples: NOT_FOUND_EXAMPLE,
  })
  @ApiUnprocessableEntityResponse({
    type: ApiErrorResponseDto,
    description: 'Supplier is already active.',
    examples: {
      alreadyActive: {
        summary: 'Supplier already active',
        value: {
          error: {
            code: 'SUPPLIER_ALREADY_ACTIVE',
            category: 'domain',
            message: 'Supplier "018f0d3c-6d0f-7a4b-9d4e-2b3c4d5e6f70" is already active.',
            correlationId: '2f0a4b1c-9c3d-4f2a-8b7e-0d1c2a3b4c5d',
          },
        },
      },
    },
  })
  @ApiConflictResponse({
    type: ApiErrorResponseDto,
    description: 'Revision collision (stale revision).',
    examples: STALE_REVISION_EXAMPLE,
  })
  @ApiBadRequestResponse({
    type: ApiErrorResponseDto,
    description: 'Validation failed.',
    examples: VALIDATION_FAILED_EXAMPLE,
  })
  @ApiForbiddenResponse({
    type: ApiErrorResponseDto,
    description: 'Caller lacks "supplier.manage" capability.',
    examples: FORBIDDEN_MANAGE_EXAMPLE,
  })
  @ApiUnauthorizedResponse({
    type: ApiErrorResponseDto,
    description: 'Authentication required.',
    examples: UNAUTHENTICATED_EXAMPLE,
  })
  async activate(
    @Param('tenantId') tenantId: string,
    @Param('supplierId') supplierId: string,
    @Body() body: ActivateSupplierDto,
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
  ): Promise<SupplierResponseDto> {
    const outcome = await this.inTenantScope(tenantId, () =>
      this.activateSupplier.execute(
        new ActivateSupplierCommand({
          id: supplierId,
          expectedRevision: body.expectedRevision,
          principal,
        }),
      ),
    );

    return outcome.match<SupplierResponseDto>({
      ok: toSupplierResponse,
      fail: (error) => this.raise(error),
    });
  }

  @Get()
  @Authorize({ permission: 'supplier.read', tenantParam: 'tenantId' })
  @ApiOperation({
    summary: 'List and search suppliers',
    description:
      'Returns suppliers of the verified tenant inside the standard pagination envelope. ' +
      'Supports text searching by supplier name, code, or identification, and status filtering. ' +
      'Requires active membership with "supplier.read".',
  })
  @ApiOkResponse({
    type: PaginatedSuppliersDto,
    description: 'Paginated collection of suppliers matching criteria.',
    examples: PAGINATED_SUPPLIERS_EXAMPLE,
  })
  @ApiBadRequestResponse({
    type: ApiErrorResponseDto,
    description: 'Invalid pagination query parameters.',
    examples: VALIDATION_FAILED_EXAMPLE,
  })
  @ApiForbiddenResponse({
    type: ApiErrorResponseDto,
    description: 'Caller lacks "supplier.read" capability.',
    examples: FORBIDDEN_READ_EXAMPLE,
  })
  @ApiUnauthorizedResponse({
    type: ApiErrorResponseDto,
    description: 'Authentication required.',
    examples: UNAUTHENTICATED_EXAMPLE,
  })
  async list(
    @Param('tenantId') tenantId: string,
    @Query() query: ListSuppliersQueryDto,
  ): Promise<Paginated<SupplierResponseDto>> {
    const outcome = await this.inTenantScope(tenantId, async () => {
      const searchTerm = query.search?.trim();
      if (searchTerm && searchTerm.length > 0) {
        const searchOutcome = await this.searchSuppliers.execute(
          new SearchSuppliersQuery({ query: searchTerm, limit: query.limit }),
        );
        if (searchOutcome.isFail()) {
          return Result.fail(searchOutcome.errorOrThrow());
        }
        let items = searchOutcome.valueOrThrow();
        if (query.status && query.status !== 'all') {
          items = items.filter((item) => item.status === query.status);
        }
        const paginated = paginate(items.map(toSupplierResponse), query);
        return Result.ok(paginated);
      }

      const listOutcome = await this.listSuppliers.execute(
        new ListSuppliersQuery({
          status: query.status,
          page: query.page,
          pageSize: query.limit,
        }),
      );
      if (listOutcome.isFail()) {
        return Result.fail(listOutcome.errorOrThrow());
      }
      const pageView = listOutcome.valueOrThrow();
      const paginated: Paginated<SupplierResponseDto> = {
        data: pageView.items.map(toSupplierResponse),
        meta: paginationMeta(pageView.total, query),
      };
      return Result.ok(paginated);
    });

    return outcome.match<Paginated<SupplierResponseDto>>({
      ok: (result) => result,
      fail: (error) => this.raise(error),
    });
  }

  /**
   * Validates that rawTenantId is a valid UUID before invoking work.
   */
  private async inTenantScope<T>(rawTenantId: string, work: () => Promise<T>): Promise<T> {
    if (!EntityId.isValid(rawTenantId)) {
      throw ApiErrorException.notFound();
    }
    return work();
  }

  /**
   * Rethrows a domain error to be mapped by ApiExceptionFilter.
   */
  private raise(error: DomainError): never {
    throw error;
  }
}
