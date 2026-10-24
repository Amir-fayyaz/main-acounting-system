import { Body, Controller, Get, HttpCode, HttpStatus, Param, Patch, Post } from '@nestjs/common';
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
import type { ErrorDetail } from '../../../../shared/errors/error-detail.js';
import { ErrorCategory } from '../../../../shared/errors/error-category.js';
import type { DomainError } from '../../../../shared/errors/domain-error.js';
import type { Result } from '../../../../shared/errors/result.js';
import { TenantScope } from '../../../../shared/tenant/tenant-scope.js';
import {
  Authorize,
  RequiresAuthentication,
} from '../../../../infrastructure/api/authorization/authorization-policy.js';
import { API_ERROR_CODES } from '../../../../infrastructure/api/errors/api-error.registry.js';
import { ApiErrorResponseDto } from '../../../../infrastructure/api/errors/api-error.dto.js';
import { ApiErrorException } from '../../../../infrastructure/api/errors/api-error.exception.js';
import type { ApiErrorDetail } from '../../../../infrastructure/api/errors/api-error.types.js';
import { SelectActiveCompany } from '../../../identity/application/commands/select-active-company.command.js';
import type { ActiveCompanyView } from '../../../identity/application/views/active-company.view.js';
import { SelectActiveCompanyUseCase } from '../../../identity/application/use-cases/select-active-company.use-case.js';
import { CurrentPrincipal } from '../../../identity/presentation/decorators/current-principal.decorator.js';
import type { AuthenticatedPrincipalView } from '../../../identity/application/views/principal.view.js';
import { ChangeTenantStatusUseCase } from '../../application/use-cases/change-tenant-status.use-case.js';
import { ChangeTenantStatus } from '../../application/commands/change-tenant-status.command.js';
import { CreateTenant } from '../../application/commands/create-tenant.command.js';
import { UpdateTenant } from '../../application/commands/update-tenant.command.js';
import { CreateTenantUseCase } from '../../application/use-cases/create-tenant.use-case.js';
import { GetTenantUseCase } from '../../application/use-cases/get-tenant.use-case.js';
import { GetTenant } from '../../application/queries/get-tenant.query.js';
import { UpdateTenantUseCase } from '../../application/use-cases/update-tenant.use-case.js';
import type { TenantView } from '../../application/views/tenant.view.js';
import { isTenantId } from '../../domain/value-objects/tenant-id.js';
import { ChangeTenantStatusDto } from '../dto/change-tenant-status.dto.js';
import { ActiveCompanyResponseDto } from '../dto/active-company-response.dto.js';
import { TenantResponseDto } from '../dto/tenant-response.dto.js';
import { CreateTenantDto } from '../dto/create-tenant.dto.js';
import { UpdateTenantDto } from '../dto/update-tenant.dto.js';

/**
 * The tenant REST resource (IAM-001; FND-006; ADR-013).
 *
 * It exposes only the operations this issue requires — create, read, update a
 * mutable attribute and move the lifecycle — and delegates every decision to a
 * use case. The controller itself holds no business rule: it validates input
 * (through the global pipe), maps the outcome to a DTO or the standard error
 * contract, and nothing else.
 *
 * **Authorization is declared here and decided elsewhere** (IAM-006). Every
 * operation states the capability IAM-004 defines — `company.read` to read a
 * tenant, `company.update` to change one — except creation, which requires
 * authentication only because the company it would authorize against does not
 * exist yet. The tenant-scoped ones name the route parameter that identifies
 * the target tenant. The
 * authorization boundary verifies both against the caller's active membership
 * *before* this controller runs, so the path identifier is a checked claim
 * rather than a grant, and an unauthenticated or unauthorized request never
 * reaches a use case here.
 *
 * The scope the operation runs under is therefore always backed by a proven
 * membership: the global tenant-scope interceptor publishes the tenant the
 * boundary verified, and the controller never re-derives it from the path
 * (SHR-007; IAM-007).
 *
 * No request header, body or query field selects the tenant. The global
 * authorization guard verifies the route identifier against the caller's active
 * membership and rejects a conflicting `x-tenant-id` claim before this handler
 * runs; the controller itself only uses the checked route identifier.
 */
@ApiBearerAuth()
@ApiTags('tenants')
@Controller('tenants')
export class TenantController {
  public constructor(
    private readonly createTenant: CreateTenantUseCase,
    private readonly getTenant: GetTenantUseCase,
    private readonly updateTenant: UpdateTenantUseCase,
    private readonly changeTenantStatus: ChangeTenantStatusUseCase,
    private readonly selectActiveCompany: SelectActiveCompanyUseCase,
  ) {}

  @Post()
  @RequiresAuthentication()
  @ApiOperation({
    summary: 'Create a company',
    description:
      'Creates the root business boundary and enrolls the authenticated caller as its first member in the same transaction. Requires authentication only: the creator cannot already hold a permission in a company that does not exist yet.',
  })
  @ApiCreatedResponse({
    type: TenantResponseDto,
    description: 'The company was created and the caller was enrolled as its first member.',
    examples: {
      created: {
        summary: 'A newly created company',
        value: {
          id: '018f0d3c-6d0f-7a4b-9d4e-2b3c4d5e6f70',
          name: 'Acme Trading Co.',
          status: 'active',
          revision: 1,
          createdAt: '2026-10-24T09:30:00.000Z',
          updatedAt: '2026-10-24T09:30:00.000Z',
        },
      },
    },
  })
  @ApiBadRequestResponse({
    type: ApiErrorResponseDto,
    description: 'Request validation failed.',
    examples: {
      invalidName: {
        summary: 'The name is blank',
        value: {
          error: {
            code: 'VALIDATION_FAILED',
            category: 'validation',
            message: 'The request contains invalid values.',
            correlationId: '2f0a4b1c-9c3d-4f2a-8b7e-0d1c2a3b4c5d',
            details: [
              { field: 'name', code: 'isLength', message: 'name must be longer than 0 characters' },
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
            code: 'UNAUTHORIZED',
            category: 'client',
            message: 'Authentication is required.',
            correlationId: '2f0a4b1c-9c3d-4f2a-8b7e-0d1c2a3b4c5d',
          },
        },
      },
    },
  })
  async create(
    @CurrentPrincipal() principal: AuthenticatedPrincipalView,
    @Body() body: CreateTenantDto,
  ): Promise<TenantResponseDto> {
    // A tenant does not exist yet, so creation is the one system-level
    // operation here: it establishes the boundary rather than running in one.
    // The creator is the verified principal, never a field the client sends.
    const outcome = await TenantScope.runAsSystem(() =>
      this.createTenant.execute(
        new CreateTenant({ name: body.name, ownerUserId: principal.userId }),
      ),
    );

    return this.response(outcome);
  }

  @Get(':id')
  @Authorize({ permission: 'company.read', tenantParam: 'id' })
  @ApiOperation({
    summary: 'Get a tenant by id',
    description:
      'Requires an active membership in the tenant with "company.read". A tenant the caller does not belong to is refused (403).',
  })
  @ApiOkResponse({
    type: TenantResponseDto,
    description: 'The requested company.',
    examples: {
      found: {
        summary: 'An active company',
        value: {
          id: '018f0d3c-6d0f-7a4b-9d4e-2b3c4d5e6f70',
          name: 'Acme Trading Co.',
          status: 'active',
          revision: 3,
          createdAt: '2026-10-24T09:30:00.000Z',
          updatedAt: '2026-10-24T10:15:00.000Z',
        },
      },
    },
  })
  @ApiNotFoundResponse({
    type: ApiErrorResponseDto,
    description: 'No company exists with that id.',
    examples: {
      notFound: {
        summary: 'Unknown company id',
        value: {
          error: {
            code: 'NOT_FOUND',
            category: 'client',
            message: 'The requested resource was not found.',
            correlationId: '2f0a4b1c-9c3d-4f2a-8b7e-0d1c2a3b4c5d',
          },
        },
      },
    },
  })
  @ApiForbiddenResponse({
    type: ApiErrorResponseDto,
    description: 'The caller has no active membership in the company.',
    examples: {
      tenantAccessDenied: {
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
  @ApiUnauthorizedResponse({
    type: ApiErrorResponseDto,
    description: 'Authentication is required.',
    examples: {
      unauthenticated: {
        summary: 'No valid bearer token',
        value: {
          error: {
            code: 'UNAUTHORIZED',
            category: 'client',
            message: 'Authentication is required.',
            correlationId: '2f0a4b1c-9c3d-4f2a-8b7e-0d1c2a3b4c5d',
          },
        },
      },
    },
  })
  async findOne(@Param('id') id: string): Promise<TenantResponseDto> {
    const outcome = await this.inTenantScope(id, () =>
      this.getTenant.execute(new GetTenant({ tenantId: id })),
    );

    return this.response(outcome);
  }

  @Patch(':id')
  @Authorize({ permission: 'company.update', tenantParam: 'id' })
  @ApiOperation({
    summary: 'Update a tenant name',
    description:
      'Requires an active membership in the tenant with "company.update". Refuses the write when expectedRevision is stale (409), or when the tenant is inactive (422).',
  })
  @ApiOkResponse({
    type: TenantResponseDto,
    description: 'The company was updated; the revision advanced.',
    examples: {
      updated: {
        summary: 'A renamed company',
        value: {
          id: '018f0d3c-6d0f-7a4b-9d4e-2b3c4d5e6f70',
          name: 'Acme Trading Co. (renamed)',
          status: 'active',
          revision: 2,
          createdAt: '2026-10-24T09:30:00.000Z',
          updatedAt: '2026-10-24T10:15:00.000Z',
        },
      },
    },
  })
  @ApiBadRequestResponse({
    type: ApiErrorResponseDto,
    description: 'Request validation failed.',
    examples: {
      invalidBody: {
        summary: 'The name is blank',
        value: {
          error: {
            code: 'VALIDATION_FAILED',
            category: 'validation',
            message: 'The request contains invalid values.',
            correlationId: '2f0a4b1c-9c3d-4f2a-8b7e-0d1c2a3b4c5d',
            details: [
              { field: 'name', code: 'isLength', message: 'name must be longer than 0 characters' },
            ],
          },
        },
      },
    },
  })
  @ApiNotFoundResponse({
    type: ApiErrorResponseDto,
    description: 'No company exists with that id.',
    examples: {
      notFound: {
        summary: 'Unknown company id',
        value: {
          error: {
            code: 'NOT_FOUND',
            category: 'client',
            message: 'The requested resource was not found.',
            correlationId: '2f0a4b1c-9c3d-4f2a-8b7e-0d1c2a3b4c5d',
          },
        },
      },
    },
  })
  @ApiForbiddenResponse({
    type: ApiErrorResponseDto,
    description: 'The caller has no active membership in the company.',
    examples: {
      tenantAccessDenied: {
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
  @ApiUnauthorizedResponse({
    type: ApiErrorResponseDto,
    description: 'Authentication is required.',
    examples: {
      unauthenticated: {
        summary: 'No valid bearer token',
        value: {
          error: {
            code: 'UNAUTHORIZED',
            category: 'client',
            message: 'Authentication is required.',
            correlationId: '2f0a4b1c-9c3d-4f2a-8b7e-0d1c2a3b4c5d',
          },
        },
      },
    },
  })
  @ApiConflictResponse({
    type: ApiErrorResponseDto,
    description: 'The tenant changed since it was read; reload and retry.',
    examples: {
      staleRevision: {
        summary: 'The record moved past the expected revision',
        value: {
          error: {
            code: 'CONFLICT',
            category: 'client',
            message: 'The record was changed by someone else. Reload it and try again.',
            correlationId: '2f0a4b1c-9c3d-4f2a-8b7e-0d1c2a3b4c5d',
            details: [
              {
                field: 'revision',
                code: 'STALE_REVISION',
                message:
                  'The record is now at revision 2; this update was prepared against revision 1.',
              },
            ],
          },
        },
      },
    },
  })
  @ApiUnprocessableEntityResponse({
    type: ApiErrorResponseDto,
    description: 'A domain rule refused the change (for example, the tenant is inactive).',
    examples: {
      inactiveTenant: {
        summary: 'The company is inactive',
        value: {
          error: {
            code: 'TENANT_INACTIVE',
            category: 'domain',
            message: 'An inactive tenant cannot be modified. Reactivate it first.',
            correlationId: '2f0a4b1c-9c3d-4f2a-8b7e-0d1c2a3b4c5d',
          },
        },
      },
    },
  })
  async update(@Param('id') id: string, @Body() body: UpdateTenantDto): Promise<TenantResponseDto> {
    const outcome = await this.inTenantScope(id, () =>
      this.updateTenant.execute(
        new UpdateTenant({
          tenantId: id,
          name: body.name,
          expectedRevision: body.expectedRevision,
        }),
      ),
    );

    return this.response(outcome);
  }

  @Post(':id/status')
  @Authorize({ permission: 'company.update', tenantParam: 'id' })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Change a tenant lifecycle state',
    description:
      'Requires an active membership in the tenant with "company.update". Moves the tenant between active and inactive; an illegal move is refused (422).',
  })
  @ApiOkResponse({
    type: TenantResponseDto,
    description: 'The company moved to the requested lifecycle state.',
    examples: {
      deactivated: {
        summary: 'A company taken out of use',
        value: {
          id: '018f0d3c-6d0f-7a4b-9d4e-2b3c4d5e6f70',
          name: 'Acme Trading Co.',
          status: 'inactive',
          revision: 2,
          createdAt: '2026-10-24T09:30:00.000Z',
          updatedAt: '2026-10-24T10:15:00.000Z',
        },
      },
    },
  })
  @ApiBadRequestResponse({
    type: ApiErrorResponseDto,
    description: 'Request validation failed.',
    examples: {
      unknownStatus: {
        summary: 'A lifecycle state the domain does not define',
        value: {
          error: {
            code: 'VALIDATION_FAILED',
            category: 'validation',
            message: 'The request contains invalid values.',
            correlationId: '2f0a4b1c-9c3d-4f2a-8b7e-0d1c2a3b4c5d',
            details: [
              {
                field: 'status',
                code: 'isIn',
                message: 'status must be one of the following values: active, inactive',
              },
            ],
          },
        },
      },
    },
  })
  @ApiNotFoundResponse({
    type: ApiErrorResponseDto,
    description: 'No company exists with that id.',
    examples: {
      notFound: {
        summary: 'Unknown company id',
        value: {
          error: {
            code: 'NOT_FOUND',
            category: 'client',
            message: 'The requested resource was not found.',
            correlationId: '2f0a4b1c-9c3d-4f2a-8b7e-0d1c2a3b4c5d',
          },
        },
      },
    },
  })
  @ApiForbiddenResponse({
    type: ApiErrorResponseDto,
    description: 'The caller has no active membership in the company.',
    examples: {
      tenantAccessDenied: {
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
  @ApiUnauthorizedResponse({
    type: ApiErrorResponseDto,
    description: 'Authentication is required.',
    examples: {
      unauthenticated: {
        summary: 'No valid bearer token',
        value: {
          error: {
            code: 'UNAUTHORIZED',
            category: 'client',
            message: 'Authentication is required.',
            correlationId: '2f0a4b1c-9c3d-4f2a-8b7e-0d1c2a3b4c5d',
          },
        },
      },
    },
  })
  @ApiConflictResponse({
    type: ApiErrorResponseDto,
    description: 'The tenant changed since it was read; reload and retry.',
    examples: {
      staleRevision: {
        summary: 'The record moved past the expected revision',
        value: {
          error: {
            code: 'CONFLICT',
            category: 'client',
            message: 'The record was changed by someone else. Reload it and try again.',
            correlationId: '2f0a4b1c-9c3d-4f2a-8b7e-0d1c2a3b4c5d',
            details: [
              {
                field: 'revision',
                code: 'STALE_REVISION',
                message:
                  'The record is now at revision 2; this update was prepared against revision 1.',
              },
            ],
          },
        },
      },
    },
  })
  @ApiUnprocessableEntityResponse({
    type: ApiErrorResponseDto,
    description: 'The lifecycle transition is not allowed from the current state.',
    examples: {
      invalidTransition: {
        summary: 'Moving an active company to active',
        value: {
          error: {
            code: 'INVALID_TENANT_STATUS_TRANSITION',
            category: 'domain',
            message: 'A tenant cannot move to "active" while it is "active".',
            correlationId: '2f0a4b1c-9c3d-4f2a-8b7e-0d1c2a3b4c5d',
          },
        },
      },
    },
  })
  async changeStatus(
    @Param('id') id: string,
    @Body() body: ChangeTenantStatusDto,
  ): Promise<TenantResponseDto> {
    const outcome = await this.inTenantScope(id, () =>
      this.changeTenantStatus.execute(
        new ChangeTenantStatus({
          tenantId: id,
          status: body.status,
          expectedRevision: body.expectedRevision,
        }),
      ),
    );

    return this.response(outcome);
  }

  @Post(':id/select')
  @Authorize({ permission: 'company.read', tenantParam: 'id' })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Select the active company',
    description:
      'Records the company the caller is currently working in. Requires an active membership in that company with "company.read". A company the caller does not belong to is refused with TENANT_ACCESS_DENIED (403), exactly like one that does not exist. Selecting a company grants no additional capability.',
  })
  @ApiOkResponse({
    type: ActiveCompanyResponseDto,
    description: 'The company is now the caller\'s active company.',
    examples: {
      selected: {
        summary: 'A successful selection',
        value: {
          tenantId: '018f0d3c-6d0f-7a4b-9d4e-2b3c4d5e6f70',
          selectedAt: '2026-10-24T09:30:00.000Z',
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
            code: 'UNAUTHORIZED',
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
    description:
      'The caller has no active membership in the company or lacks "company.read".',
    examples: {
      tenantAccessDenied: {
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
      authorizationDenied: {
        summary: 'The caller is a member but lacks the capability',
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
                message: 'the operation requires "company.read"',
              },
            ],
          },
        },
      },
    },
  })
  async select(
    @CurrentPrincipal() principal: AuthenticatedPrincipalView,
    @Param('id') id: string,
  ): Promise<ActiveCompanyResponseDto> {
    const outcome = await this.inTenantScope(id, () =>
      this.selectActiveCompany.execute(
        new SelectActiveCompany({ userId: principal.userId, tenantId: id }),
      ),
    );

    return this.activeCompanyResponse(outcome);
  }

  /**
   * Runs `work` under the tenant scope the trusted boundary published.
   *
   * The scope is established once, by the global tenant-scope interceptor, from
   * the tenant the authorization boundary proved for this caller's membership
   * (IAM-007). This helper therefore does not *establish* anything: it only
   * checks that the route carries a well-formed tenant identifier and lets the
   * established scope stand. The use case then compares the requested tenant
   * with that scope, so a request for another company's record is refused
   * before any data is read.
   */
  private async inTenantScope<T>(rawId: string, work: () => Promise<T>): Promise<T> {
    if (!isTenantId(rawId)) {
      throw ApiErrorException.notFound();
    }

    return work();
  }

  /** Maps a use-case outcome to a response, or raises the standard error. */
  private response(outcome: Result<TenantView, DomainError>): TenantResponseDto {
    return outcome.match<TenantResponseDto>({
      ok: (view) => toTenantResponse(view),
      fail: (error) => this.raise(error),
    });
  }

  /** Maps a selection outcome to a response, or raises the standard error. */
  private activeCompanyResponse(
    outcome: Result<ActiveCompanyView, DomainError>,
  ): ActiveCompanyResponseDto {
    return outcome.match<ActiveCompanyResponseDto>({
      ok: (view) => ({ tenantId: view.tenantId, selectedAt: view.selectedAt }),
      fail: (error) => this.raise(error),
    });
  }

  /**
   * Turns a domain failure into the transport failure FND-006 defines for its
   * category: 404 for a missing resource, 400 for rejected input, 409 for a
   * lost race. A lifecycle or business-rule failure is rethrown as the
   * `DomainError` it is and mapped to 422 by the shared exception filter.
   */
  private raise(error: DomainError): never {
    if (error.code === 'TENANT_ACCESS_DENIED') {
      // A tenant the caller cannot enter is a 403, not a domain failure — and a
      // missing, inactive and forged tenant all answer identically.
      throw new ApiErrorException(
        HttpStatus.FORBIDDEN,
        error.code,
        'client',
        error.message,
      );
    }

    switch (error.category) {
      case ErrorCategory.NOT_FOUND:
        throw ApiErrorException.notFound();
      case ErrorCategory.VALIDATION:
        throw ApiErrorException.validation(toApiDetails(error.details), error.message);
      case ErrorCategory.CONFLICT:
        throw ApiErrorException.of(API_ERROR_CODES.CONFLICT, {
          message: error.message,
          details: toApiDetails(error.details),
        });
      default:
        throw error;
    }
  }
}

/** Maps the application view to the response DTO. */
function toTenantResponse(view: TenantView): TenantResponseDto {
  return {
    id: view.id,
    name: view.name,
    status: view.status,
    revision: view.revision,
    createdAt: view.createdAt,
    updatedAt: view.updatedAt,
  };
}

/** Narrows kernel error details to the API error-detail shape. */
function toApiDetails(details: readonly ErrorDetail[]): readonly ApiErrorDetail[] {
  return details.map((detail) => ({
    field: detail.field ?? '',
    code: detail.code,
    message: detail.message,
  }));
}
