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
import { API_ERROR_CODES } from '../../../../infrastructure/api/errors/api-error.registry.js';
import { ApiErrorResponseDto } from '../../../../infrastructure/api/errors/api-error.dto.js';
import { ApiErrorException } from '../../../../infrastructure/api/errors/api-error.exception.js';
import type { ApiErrorDetail } from '../../../../infrastructure/api/errors/api-error.types.js';
import type { Paginated } from '../../../../infrastructure/api/pagination/pagination.js';
import { paginate } from '../../../../infrastructure/api/pagination/pagination.js';
import { PaginationQueryDto } from '../../../../infrastructure/api/pagination/pagination-query.dto.js';
import type { DomainError } from '../../../../shared/errors/domain-error.js';
import { ErrorCategory } from '../../../../shared/errors/error-category.js';
import type { ErrorDetail } from '../../../../shared/errors/error-detail.js';
import type { Result } from '../../../../shared/errors/result.js';
import { createTenantContext } from '../../../../shared/tenant/tenant-context.js';
import { TenantScope } from '../../../../shared/tenant/tenant-scope.js';
import { ChangeRoleStatus } from '../../application/commands/change-role-status.command.js';
import { CreateRole } from '../../application/commands/create-role.command.js';
import { GrantRolePermission } from '../../application/commands/grant-role-permission.command.js';
import { RevokeRolePermission } from '../../application/commands/revoke-role-permission.command.js';
import { UpdateRole } from '../../application/commands/update-role.command.js';
import { GetRole } from '../../application/queries/get-role.query.js';
import { ListRoles } from '../../application/queries/list-roles.query.js';
import { ChangeRoleStatusUseCase } from '../../application/use-cases/change-role-status.use-case.js';
import { CreateRoleUseCase } from '../../application/use-cases/create-role.use-case.js';
import { GetRoleUseCase } from '../../application/use-cases/get-role.use-case.js';
import { GrantRolePermissionUseCase } from '../../application/use-cases/grant-role-permission.use-case.js';
import { ListRolesUseCase } from '../../application/use-cases/list-roles.use-case.js';
import { RevokeRolePermissionUseCase } from '../../application/use-cases/revoke-role-permission.use-case.js';
import { UpdateRoleUseCase } from '../../application/use-cases/update-role.use-case.js';
import type { RoleView } from '../../application/views/role.view.js';
import { isTenantReference } from '../../domain/value-objects/tenant-reference.js';
import { ChangeRoleStatusDto } from '../dto/change-role-status.dto.js';
import { CreateRoleDto } from '../dto/create-role.dto.js';
import { GrantRolePermissionDto } from '../dto/grant-role-permission.dto.js';
import { PaginatedRolesDto } from '../dto/paginated-roles.dto.js';
import { RevokeRolePermissionDto } from '../dto/revoke-role-permission.dto.js';
import { RoleResponseDto } from '../dto/role-response.dto.js';
import { UpdateRoleDto } from '../dto/update-role.dto.js';

/**
 * The Role REST resource (IAM-004; FND-006; ADR-013).
 *
 * It exposes the operations this issue requires — create a role, read one, read
 * a tenant's roles, rename it, move its lifecycle, and add or remove a
 * permission — and delegates every decision to a use case. The controller holds
 * no business rule: the global validation pipe validates input, and the
 * controller maps the outcome to a DTO or the standard error contract, and
 * nothing else.
 *
 * **Tenant-owned operations are nested under the tenant**
 * (`/tenants/:tenantId/roles/...`) and established into the shared tenant scope
 * before the use case runs, exactly like the membership resource: the target
 * tenant is the tenant boundary of the operation, and the use case re-checks the
 * requested tenant against the scope. A role cannot be created, read or changed
 * without that scope, and no client-supplied header, body or query field is ever
 * read as tenant identity (SHR-007).
 *
 * **Authorization is declared here and decided elsewhere** (IAM-006). Every
 * operation names its target tenant and needs `role.read` to read a role or
 * `role.manage` to create, rename, re-role or re-permission one, and the
 * authorization boundary verifies the caller's active membership in that tenant
 * before the handler runs. The permission keys a role *holds* are data this API
 * records; whether the caller may *change* them is a decision the boundary makes.
 */
@ApiBearerAuth()
@ApiTags('roles')
@Controller()
export class RolesController {
  public constructor(
    private readonly createRole: CreateRoleUseCase,
    private readonly getRole: GetRoleUseCase,
    private readonly listRoles: ListRolesUseCase,
    private readonly updateRole: UpdateRoleUseCase,
    private readonly changeRoleStatus: ChangeRoleStatusUseCase,
    private readonly grantPermission: GrantRolePermissionUseCase,
    private readonly revokePermission: RevokeRolePermissionUseCase,
  ) {}

  @Post('tenants/:tenantId/roles')
  @Authorize({ permission: 'role.manage', tenantParam: 'tenantId' })
  @ApiOperation({
    summary: 'Create a role within a tenant',
    description:
      'Creates an active role with no permissions. Requires an active membership in the tenant with "role.manage".',
  })
  @ApiCreatedResponse({ type: RoleResponseDto, description: 'The created role.' })
  @ApiBadRequestResponse({ type: ApiErrorResponseDto, description: 'Request validation failed.' })
  @ApiUnauthorizedResponse({
    type: ApiErrorResponseDto,
    description: 'Authentication is required.',
  })
  @ApiForbiddenResponse({ type: ApiErrorResponseDto })
  @ApiNotFoundResponse({
    type: ApiErrorResponseDto,
    description: 'The tenant was not found.',
  })
  async create(
    @Param('tenantId') tenantId: string,
    @Body() body: CreateRoleDto,
  ): Promise<RoleResponseDto> {
    const outcome = await this.inTenantScope(tenantId, () =>
      this.createRole.execute(new CreateRole({ tenantId, name: body.name })),
    );

    return this.response(outcome);
  }

  @Get('tenants/:tenantId/roles')
  @Authorize({ permission: 'role.read', tenantParam: 'tenantId' })
  @ApiOperation({
    summary: "List a tenant's roles using the standard pagination envelope",
    description: 'Requires an active membership in the tenant with "role.read".',
  })
  @ApiOkResponse({ type: PaginatedRolesDto })
  @ApiBadRequestResponse({ type: ApiErrorResponseDto, description: 'Invalid pagination query.' })
  @ApiNotFoundResponse({ type: ApiErrorResponseDto })
  @ApiUnauthorizedResponse({
    type: ApiErrorResponseDto,
    description: 'Authentication is required.',
  })
  @ApiForbiddenResponse({ type: ApiErrorResponseDto })
  async list(
    @Param('tenantId') tenantId: string,
    @Query() query: PaginationQueryDto,
  ): Promise<Paginated<RoleResponseDto>> {
    const outcome = await this.inTenantScope(tenantId, () =>
      this.listRoles.execute(new ListRoles({ tenantId })),
    );

    return outcome.match<Paginated<RoleResponseDto>>({
      ok: (roles) => paginate(roles.map(toRoleResponse), query),
      fail: (error) => this.raise(error),
    });
  }

  @Get('tenants/:tenantId/roles/:roleId')
  @Authorize({ permission: 'role.read', tenantParam: 'tenantId' })
  @ApiOperation({
    summary: 'Get one role by id within a tenant',
    description: 'Requires an active membership in the tenant with "role.read".',
  })
  @ApiOkResponse({ type: RoleResponseDto })
  @ApiNotFoundResponse({ type: ApiErrorResponseDto })
  @ApiUnauthorizedResponse({
    type: ApiErrorResponseDto,
    description: 'Authentication is required.',
  })
  @ApiForbiddenResponse({ type: ApiErrorResponseDto })
  async findOne(
    @Param('tenantId') tenantId: string,
    @Param('roleId') roleId: string,
  ): Promise<RoleResponseDto> {
    const outcome = await this.inTenantScope(tenantId, () =>
      this.getRole.execute(new GetRole({ roleId, tenantId })),
    );

    return this.response(outcome);
  }

  @Patch('tenants/:tenantId/roles/:roleId')
  @Authorize({ permission: 'role.manage', tenantParam: 'tenantId' })
  @ApiOperation({
    summary: 'Rename a role',
    description:
      'Requires an active membership in the tenant with "role.manage". Refuses the write when expectedRevision is stale (409), or when the role is inactive (422).',
  })
  @ApiOkResponse({ type: RoleResponseDto })
  @ApiUnauthorizedResponse({
    type: ApiErrorResponseDto,
    description: 'Authentication is required.',
  })
  @ApiForbiddenResponse({ type: ApiErrorResponseDto })
  @ApiBadRequestResponse({ type: ApiErrorResponseDto, description: 'Request validation failed.' })
  @ApiNotFoundResponse({ type: ApiErrorResponseDto })
  @ApiConflictResponse({
    type: ApiErrorResponseDto,
    description: 'The role changed since it was read; reload and retry.',
  })
  @ApiUnprocessableEntityResponse({
    type: ApiErrorResponseDto,
    description: 'A domain rule refused the change (for example, the role is inactive).',
  })
  async update(
    @Param('tenantId') tenantId: string,
    @Param('roleId') roleId: string,
    @Body() body: UpdateRoleDto,
  ): Promise<RoleResponseDto> {
    const outcome = await this.inTenantScope(tenantId, () =>
      this.updateRole.execute(
        new UpdateRole({
          roleId,
          tenantId,
          name: body.name,
          expectedRevision: body.expectedRevision,
        }),
      ),
    );

    return this.response(outcome);
  }

  @Post('tenants/:tenantId/roles/:roleId/status')
  @Authorize({ permission: 'role.manage', tenantParam: 'tenantId' })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Change a role lifecycle state',
    description:
      'Requires an active membership in the tenant with "role.manage". Moves the role between active and inactive; an illegal move is refused (422). Deactivation retains every assignment that points at the role.',
  })
  @ApiOkResponse({ type: RoleResponseDto })
  @ApiUnauthorizedResponse({
    type: ApiErrorResponseDto,
    description: 'Authentication is required.',
  })
  @ApiForbiddenResponse({ type: ApiErrorResponseDto })
  @ApiBadRequestResponse({ type: ApiErrorResponseDto, description: 'Request validation failed.' })
  @ApiNotFoundResponse({ type: ApiErrorResponseDto })
  @ApiConflictResponse({
    type: ApiErrorResponseDto,
    description: 'The role changed since it was read; reload and retry.',
  })
  @ApiUnprocessableEntityResponse({
    type: ApiErrorResponseDto,
    description: 'The lifecycle transition is not allowed from the current state.',
  })
  async changeStatus(
    @Param('tenantId') tenantId: string,
    @Param('roleId') roleId: string,
    @Body() body: ChangeRoleStatusDto,
  ): Promise<RoleResponseDto> {
    const outcome = await this.inTenantScope(tenantId, () =>
      this.changeRoleStatus.execute(
        new ChangeRoleStatus({
          roleId,
          tenantId,
          status: body.status,
          expectedRevision: body.expectedRevision,
        }),
      ),
    );

    return this.response(outcome);
  }

  @Post('tenants/:tenantId/roles/:roleId/permissions')
  @Authorize({ permission: 'role.manage', tenantParam: 'tenantId' })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Grant a capability to a role',
    description:
      'Requires an active membership in the tenant with "role.manage". The key must name a catalog capability. A duplicate grant is a conflict (409); an unknown capability is refused (400).',
  })
  @ApiOkResponse({ type: RoleResponseDto, description: 'The role with its updated permissions.' })
  @ApiUnauthorizedResponse({
    type: ApiErrorResponseDto,
    description: 'Authentication is required.',
  })
  @ApiForbiddenResponse({ type: ApiErrorResponseDto })
  @ApiBadRequestResponse({ type: ApiErrorResponseDto, description: 'Request validation failed.' })
  @ApiNotFoundResponse({ type: ApiErrorResponseDto })
  @ApiConflictResponse({
    type: ApiErrorResponseDto,
    description: 'The role already grants this permission, or it changed since it was read.',
  })
  @ApiUnprocessableEntityResponse({
    type: ApiErrorResponseDto,
    description: 'A domain rule refused the change (for example, the role is inactive).',
  })
  async grant(
    @Param('tenantId') tenantId: string,
    @Param('roleId') roleId: string,
    @Body() body: GrantRolePermissionDto,
  ): Promise<RoleResponseDto> {
    const outcome = await this.inTenantScope(tenantId, () =>
      this.grantPermission.execute(
        new GrantRolePermission({
          roleId,
          tenantId,
          permissionKey: body.permissionKey,
          expectedRevision: body.expectedRevision,
        }),
      ),
    );

    return this.response(outcome);
  }

  @Post('tenants/:tenantId/roles/:roleId/permissions/remove')
  @Authorize({ permission: 'role.manage', tenantParam: 'tenantId' })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Remove a capability from a role',
    description:
      'Requires an active membership in the tenant with "role.manage". Refuses a key the role does not grant (404), a stale revision (409), or an inactive role (422). Effective permissions update immediately.',
  })
  @ApiOkResponse({ type: RoleResponseDto, description: 'The role with its updated permissions.' })
  @ApiUnauthorizedResponse({
    type: ApiErrorResponseDto,
    description: 'Authentication is required.',
  })
  @ApiForbiddenResponse({ type: ApiErrorResponseDto })
  @ApiBadRequestResponse({ type: ApiErrorResponseDto, description: 'Request validation failed.' })
  @ApiNotFoundResponse({ type: ApiErrorResponseDto })
  @ApiConflictResponse({
    type: ApiErrorResponseDto,
    description: 'The role changed since it was read; reload and retry.',
  })
  @ApiUnprocessableEntityResponse({
    type: ApiErrorResponseDto,
    description: 'A domain rule refused the change (for example, the role is inactive).',
  })
  async revoke(
    @Param('tenantId') tenantId: string,
    @Param('roleId') roleId: string,
    @Body() body: RevokeRolePermissionDto,
  ): Promise<RoleResponseDto> {
    const outcome = await this.inTenantScope(tenantId, () =>
      this.revokePermission.execute(
        new RevokeRolePermission({
          roleId,
          tenantId,
          permissionKey: body.permissionKey,
          expectedRevision: body.expectedRevision,
        }),
      ),
    );

    return this.response(outcome);
  }

  /**
   * Runs `work` under the tenant's scope.
   *
   * This is the trusted-entry-point responsibility SHR-007 assigns to the request
   * path: establishing the scope once, from the target the application resolved,
   * so use cases can require it and raised events are stamped with the tenant.
   * Until authentication exists this target comes from the resource path; when it
   * does, the scope comes from the principal and this becomes a *check* rather
   * than the source.
   */
  private async inTenantScope<T>(rawId: string, work: () => Promise<T>): Promise<T> {
    if (!isTenantReference(rawId)) {
      throw ApiErrorException.notFound();
    }

    return TenantScope.run(createTenantContext(rawId), work);
  }

  /** Maps a use-case outcome to a response, or raises the standard error. */
  private response(outcome: Result<RoleView, DomainError>): RoleResponseDto {
    return outcome.match<RoleResponseDto>({
      ok: (view) => toRoleResponse(view),
      fail: (error) => this.raise(error),
    });
  }

  /**
   * Turns a domain failure into the transport failure FND-006 defines for its
   * category: 404 for a missing resource, 400 for rejected input, 409 for a
   * lost race or a duplicate. A lifecycle or business-rule failure is rethrown
   * as the `DomainError` it is and mapped to 422 by the shared exception filter.
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

/** Maps the role view to the response DTO. */
function toRoleResponse(view: RoleView): RoleResponseDto {
  return {
    id: view.id,
    tenantId: view.tenantId,
    name: view.name,
    status: view.status,
    permissions: [...view.permissions],
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
