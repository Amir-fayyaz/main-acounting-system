import { Body, Controller, Get, HttpCode, HttpStatus, Param, Patch, Post } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import type { ErrorDetail } from '../../../../shared/errors/error-detail.js';
import { ErrorCategory } from '../../../../shared/errors/error-category.js';
import type { DomainError } from '../../../../shared/errors/domain-error.js';
import type { Result } from '../../../../shared/errors/result.js';
import { createTenantContext } from '../../../../shared/tenant/tenant-context.js';
import { TenantScope } from '../../../../shared/tenant/tenant-scope.js';
import { API_ERROR_CODES } from '../../../../infrastructure/api/errors/api-error.registry.js';
import { ApiErrorResponseDto } from '../../../../infrastructure/api/errors/api-error.dto.js';
import { ApiErrorException } from '../../../../infrastructure/api/errors/api-error.exception.js';
import type { ApiErrorDetail } from '../../../../infrastructure/api/errors/api-error.types.js';
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
 * **No authentication or authorization is implemented here, by design.** These
 * endpoints provide no access control and must not be read as providing one:
 * IAM-001 is explicitly out of scope for authentication, roles and permissions,
 * and this resource claims none. What it *does* do is route every operation
 * through the shared tenant context: the target tenant is the tenant boundary
 * of the operation, so when authentication and authorization land, the scope
 * will be resolved from the authenticated principal instead of from the
 * resource path, and the path id will merely be checked against it.
 *
 * No request header, body or query field is ever read as tenant identity — the
 * only thing that establishes a scope is the application resolving the tenant
 * being administered, through `createTenantContext` + `TenantScope` (SHR-007).
 */
@ApiTags('tenants')
@Controller('tenants')
export class TenantController {
  public constructor(
    private readonly createTenant: CreateTenantUseCase,
    private readonly getTenant: GetTenantUseCase,
    private readonly updateTenant: UpdateTenantUseCase,
    private readonly changeTenantStatus: ChangeTenantStatusUseCase,
  ) {}

  @Post()
  @ApiOperation({
    summary: 'Create a tenant',
    description:
      'Creates the root business boundary. No authentication is required or provided at this stage.',
  })
  @ApiCreatedResponse({ type: TenantResponseDto })
  @ApiBadRequestResponse({ type: ApiErrorResponseDto, description: 'Request validation failed.' })
  async create(@Body() body: CreateTenantDto): Promise<TenantResponseDto> {
    // A tenant does not exist yet, so creation is the one system-level
    // operation here: it establishes the boundary rather than running in one.
    const outcome = await TenantScope.runAsSystem(() =>
      this.createTenant.execute(new CreateTenant({ name: body.name })),
    );

    return this.response(outcome);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a tenant by id' })
  @ApiOkResponse({ type: TenantResponseDto })
  @ApiNotFoundResponse({ type: ApiErrorResponseDto })
  async findOne(@Param('id') id: string): Promise<TenantResponseDto> {
    const outcome = await this.inTenantScope(id, () =>
      this.getTenant.execute(new GetTenant({ tenantId: id })),
    );

    return this.response(outcome);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Update a tenant name',
    description:
      'Refuses the write when expectedRevision is stale (409), or when the tenant is inactive (422).',
  })
  @ApiOkResponse({ type: TenantResponseDto })
  @ApiBadRequestResponse({ type: ApiErrorResponseDto, description: 'Request validation failed.' })
  @ApiNotFoundResponse({ type: ApiErrorResponseDto })
  @ApiConflictResponse({
    type: ApiErrorResponseDto,
    description: 'The tenant changed since it was read; reload and retry.',
  })
  @ApiUnprocessableEntityResponse({
    type: ApiErrorResponseDto,
    description: 'A domain rule refused the change (for example, the tenant is inactive).',
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
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Change a tenant lifecycle state',
    description: 'Moves the tenant between active and inactive; an illegal move is refused (422).',
  })
  @ApiOkResponse({ type: TenantResponseDto })
  @ApiBadRequestResponse({ type: ApiErrorResponseDto, description: 'Request validation failed.' })
  @ApiNotFoundResponse({ type: ApiErrorResponseDto })
  @ApiConflictResponse({
    type: ApiErrorResponseDto,
    description: 'The tenant changed since it was read; reload and retry.',
  })
  @ApiUnprocessableEntityResponse({
    type: ApiErrorResponseDto,
    description: 'The lifecycle transition is not allowed from the current state.',
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

  /**
   * Runs `work` under the tenant's tenant scope.
   *
   * This is the trusted-entry-point responsibility SHR-007 assigns to the
   * request path: establishing the scope once, from the target the application
   * resolved, so use cases can `TenantScope.require()` it and raised events are
   * stamped with the tenant as tenant. Until authentication exists this target
   * comes from the resource path; when it does, the scope comes from the
   * principal and this becomes a *check* rather than the source.
   */
  private async inTenantScope<T>(rawId: string, work: () => Promise<T>): Promise<T> {
    if (!isTenantId(rawId)) {
      throw ApiErrorException.notFound();
    }

    return TenantScope.run(createTenantContext(rawId), work);
  }

  /** Maps a use-case outcome to a response, or raises the standard error. */
  private response(outcome: Result<TenantView, DomainError>): TenantResponseDto {
    return outcome.match<TenantResponseDto>({
      ok: (view) => toTenantResponse(view),
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
