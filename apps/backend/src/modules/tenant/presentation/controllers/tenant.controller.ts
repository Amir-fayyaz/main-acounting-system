import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  Patch,
  Post,
  Req,
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
import type { ErrorDetail } from '../../../../shared/errors/error-detail.js';
import { ErrorCategory } from '../../../../shared/errors/error-category.js';
import type { DomainError } from '../../../../shared/errors/domain-error.js';
import type { Result } from '../../../../shared/errors/result.js';
import { createTenantContext } from '../../../../shared/tenant/tenant-context.js';
import { TenantScope } from '../../../../shared/tenant/tenant-scope.js';
import {
  Authorize,
  RequiresAuthentication,
} from '../../../../infrastructure/api/authorization/authorization-policy.js';
import { API_ERROR_CODES } from '../../../../infrastructure/api/errors/api-error.registry.js';
import { ApiErrorResponseDto } from '../../../../infrastructure/api/errors/api-error.dto.js';
import { ApiErrorException } from '../../../../infrastructure/api/errors/api-error.exception.js';
import type { ApiErrorDetail } from '../../../../infrastructure/api/errors/api-error.types.js';
import type { AuditRecorder } from '../../../audit/application/ports/audit-recorder.port.js';
import { AUDIT_RECORDER } from '../../../audit/application/audit.tokens.js';
import { CreateMembership } from '../../../identity/application/commands/create-membership.command.js';
import { SelectActiveCompany } from '../../../identity/application/commands/select-active-company.command.js';
import { CreateMembershipUseCase } from '../../../identity/application/use-cases/create-membership.use-case.js';
import { SelectActiveCompanyUseCase } from '../../../identity/application/use-cases/select-active-company.use-case.js';
import type { AuthenticatedRequest } from '../../../identity/presentation/http/authenticated-request.js';
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
import { ActiveCompanyResponseDto } from '../dto/active-company-response.dto.js';

/**
 * Company (tenant) REST resource (IAM-001; Tenant Presentation; FND-006; ADR-013).
 *
 * - create → creator becomes active member + audit
 * - read/update/status → members only (`@Authorize` + tenantParam)
 * - select active → membership required else TENANT_ACCESS_DENIED
 *
 * Tenant-scoped routes rely on the global tenant-scope interceptor (IAM-007):
 * this controller does not re-derive scope from the path for those handlers.
 * Create membership after create is the exception: the new tenant did not exist
 * at guard time, so scope is established explicitly for that enrollment step.
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
    private readonly createMembership: CreateMembershipUseCase,
    private readonly selectActiveCompany: SelectActiveCompanyUseCase,
    @Inject(AUDIT_RECORDER) private readonly audit: AuditRecorder,
  ) {}

  @Post()
  @RequiresAuthentication()
  @ApiOperation({
    summary: 'Create a company',
    description:
      'Creates a new company and enrolls the authenticated caller as an active member. ' +
      'No tenant id is accepted in the body.',
  })
  @ApiCreatedResponse({ type: TenantResponseDto })
  @ApiBadRequestResponse({ type: ApiErrorResponseDto, description: 'Request validation failed.' })
  @ApiUnauthorizedResponse({ type: ApiErrorResponseDto })
  @ApiConflictResponse({ type: ApiErrorResponseDto, description: 'Membership already exists.' })
  async create(
    @Req() request: AuthenticatedRequest,
    @Body() body: CreateTenantDto,
  ): Promise<TenantResponseDto> {
    const userId = request.principal?.userId;
    if (userId === undefined) {
      throw ApiErrorException.of(API_ERROR_CODES.UNAUTHORIZED);
    }

    const created = await TenantScope.runAsSystem(() =>
      this.createTenant.execute(new CreateTenant({ name: body.name })),
    );
    if (created.isFail()) {
      return this.response(created);
    }
    const tenant = created.valueOrThrow();

    // New tenant was not on the route at guard time — establish scope only for enrollment.
    const membership = await TenantScope.run(createTenantContext(tenant.id), () =>
      this.createMembership.execute(new CreateMembership({ userId, tenantId: tenant.id })),
    );
    if (membership.isFail()) {
      return this.raise(membership.errorOrThrow());
    }

    await this.audit.record({
      action: 'company.create',
      outcome: 'success',
      actorUserId: userId,
      target: { type: 'tenant', id: tenant.id },
      metadata: { name: tenant.name },
    });

    return toTenantResponse(tenant);
  }

  @Get(':id')
  @Authorize({ permission: 'company.read', tenantParam: 'id' })
  @ApiOperation({
    summary: 'Get company settings',
    description: 'Requires active membership with "company.read". Path `:id` only.',
  })
  @ApiOkResponse({ type: TenantResponseDto })
  @ApiNotFoundResponse({ type: ApiErrorResponseDto })
  @ApiForbiddenResponse({ type: ApiErrorResponseDto })
  @ApiUnauthorizedResponse({ type: ApiErrorResponseDto })
  async findOne(@Param('id') id: string): Promise<TenantResponseDto> {
    const outcome = await this.inTenantScope(id, () =>
      this.getTenant.execute(new GetTenant({ tenantId: id })),
    );
    return this.response(outcome);
  }

  @Patch(':id')
  @Authorize({ permission: 'company.update', tenantParam: 'id' })
  @ApiOperation({
    summary: 'Update company settings',
    description:
      'Requires "company.update" in this company. Path `:id` is the only target; body tenant id is not used.',
  })
  @ApiOkResponse({ type: TenantResponseDto })
  @ApiBadRequestResponse({ type: ApiErrorResponseDto })
  @ApiNotFoundResponse({ type: ApiErrorResponseDto })
  @ApiConflictResponse({ type: ApiErrorResponseDto })
  @ApiUnprocessableEntityResponse({ type: ApiErrorResponseDto })
  @ApiForbiddenResponse({ type: ApiErrorResponseDto })
  async update(
    @Param('id') id: string,
    @Body() body: UpdateTenantDto,
    @Req() request: AuthenticatedRequest,
  ): Promise<TenantResponseDto> {
    const outcome = await this.inTenantScope(id, () =>
      this.updateTenant.execute(
        new UpdateTenant({
          tenantId: id,
          name: body.name,
          expectedRevision: body.expectedRevision,
        }),
      ),
    );

    const response = this.response(outcome);
    await this.audit.record({
      action: 'company.update',
      outcome: 'success',
      actorUserId: request.principal?.userId,
      target: { type: 'tenant', id },
      metadata: { name: body.name },
    });
    return response;
  }

  @Post(':id/status')
  @Authorize({ permission: 'company.update', tenantParam: 'id' })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Change company lifecycle state',
    description: 'Path `:id` only. Requires "company.update".',
  })
  @ApiOkResponse({ type: TenantResponseDto })
  @ApiBadRequestResponse({ type: ApiErrorResponseDto })
  @ApiNotFoundResponse({ type: ApiErrorResponseDto })
  @ApiConflictResponse({ type: ApiErrorResponseDto })
  @ApiUnprocessableEntityResponse({ type: ApiErrorResponseDto })
  @ApiForbiddenResponse({ type: ApiErrorResponseDto })
  async changeStatus(
    @Param('id') id: string,
    @Body() body: ChangeTenantStatusDto,
    @Req() request: AuthenticatedRequest,
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

    const response = this.response(outcome);
    await this.audit.record({
      action: 'company.change_status',
      outcome: 'success',
      actorUserId: request.principal?.userId,
      target: { type: 'tenant', id },
      metadata: { status: body.status },
    });
    return response;
  }

  @Post(':id/select')
  @RequiresAuthentication()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Select active company',
    description:
      "Sets the authenticated user's active company to path `:id`. " +
      'Requires an active membership; otherwise TENANT_ACCESS_DENIED. No tenant id from body.',
  })
  @ApiOkResponse({ type: ActiveCompanyResponseDto })
  @ApiForbiddenResponse({
    type: ApiErrorResponseDto,
    description: 'TENANT_ACCESS_DENIED — not an active member of this company.',
  })
  @ApiUnauthorizedResponse({ type: ApiErrorResponseDto })
  async selectActive(
    @Param('id') id: string,
    @Req() request: AuthenticatedRequest,
  ): Promise<ActiveCompanyResponseDto> {
    const userId = request.principal?.userId;
    if (userId === undefined) {
      throw ApiErrorException.of(API_ERROR_CODES.UNAUTHORIZED);
    }

    const outcome = await this.selectActiveCompany.execute(
      new SelectActiveCompany({ userId, tenantId: id }),
    );

    return outcome.match<ActiveCompanyResponseDto>({
      ok: (view) => ({ tenantId: view.tenantId, userId: view.userId }),
      fail: (error) => this.raiseSelectFailure(error),
    });
  }

  /**
   * Validates the path id; does not establish scope — the global interceptor does
   * that for `@Authorize({ tenantParam })` routes (IAM-007).
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

  private raiseSelectFailure(error: DomainError): never {
    if (error.code === 'TENANT_ACCESS_DENIED') {
      throw new ApiErrorException(
        HttpStatus.FORBIDDEN,
        'TENANT_ACCESS_DENIED',
        'client',
        error.message,
      );
    }
    return this.raise(error);
  }
}

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

function toApiDetails(details: readonly ErrorDetail[] | undefined): readonly ApiErrorDetail[] {
  if (details === undefined) {
    return [];
  }
  return details.map((detail) => ({
    field: detail.field ?? '',
    code: detail.code,
    message: detail.message,
  }));
}
