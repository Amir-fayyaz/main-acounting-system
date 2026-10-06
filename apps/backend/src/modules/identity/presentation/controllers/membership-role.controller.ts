import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Query } from '@nestjs/common';
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
import { AssignRoleToMembership } from '../../application/commands/assign-role-to-membership.command.js';
import { RemoveRoleFromMembership } from '../../application/commands/remove-role-from-membership.command.js';
import { GetEffectivePermissions } from '../../application/queries/effective-permissions.query.js';
import { ListMembershipRoles } from '../../application/queries/list-membership-roles.query.js';
import { AssignRoleToMembershipUseCase } from '../../application/use-cases/assign-role-to-membership.use-case.js';
import { ListMembershipRolesUseCase } from '../../application/use-cases/list-membership-roles.use-case.js';
import { RemoveRoleFromMembershipUseCase } from '../../application/use-cases/remove-role-from-membership.use-case.js';
import { ResolveEffectivePermissionsUseCase } from '../../application/use-cases/resolve-effective-permissions.use-case.js';
import type { MembershipRoleView } from '../../application/views/membership-role.view.js';
import type { PermissionView } from '../../application/views/permission.view.js';
import { isTenantReference } from '../../domain/value-objects/tenant-reference.js';
import { AssignRoleDto } from '../dto/assign-role.dto.js';
import { MembershipRoleResponseDto } from '../dto/membership-role-response.dto.js';
import { PaginatedMembershipRolesDto } from '../dto/paginated-membership-roles.dto.js';
import { PaginatedPermissionsDto } from '../dto/paginated-permissions.dto.js';
import { PermissionResponseDto } from '../dto/permission-response.dto.js';
import { RemoveRoleDto } from '../dto/remove-role.dto.js';

/**
 * The Membership-Role resource (IAM-004; FND-006; ADR-013).
 *
 * It exposes the operations this issue requires — read the roles a membership
 * holds, assign a role, remove a role, and resolve the membership's effective
 * permissions — and delegates every decision to a use case. The controller holds
 * no business rule: the global validation pipe validates input, and the
 * controller maps the outcome to a DTO or the standard error contract.
 *
 * Roles attach to **memberships**, never to users: that is what keeps
 * tenant-specific access data outside the `User` entity, and why these routes
 * hang off a membership under its tenant rather than off a user. Every operation
 * is tenant-scoped (`/tenants/:tenantId/memberships/:membershipId/...`), and the
 * tenant is established into the shared tenant scope before the use case runs.
 * The membership and the role must both belong to that tenant, so a cross-tenant
 * assignment is refused without revealing that the role exists elsewhere.
 *
 * **No authentication or authorization is implemented here, by design.** These
 * endpoints enforce nothing: effective-permission resolution reports which
 * capabilities a membership holds, it does not gate a request. Checking whether a
 * caller may perform an action is IAM-006, and the whole dependency chain the
 * product defines — User → Membership → Role → Permissions — is recorded here,
 * not applied.
 */
@ApiTags('membership-roles')
@Controller()
export class MembershipRolesController {
  public constructor(
    private readonly listMembershipRoles: ListMembershipRolesUseCase,
    private readonly assignRole: AssignRoleToMembershipUseCase,
    private readonly removeRole: RemoveRoleFromMembershipUseCase,
    private readonly effectivePermissions: ResolveEffectivePermissionsUseCase,
  ) {}

  @Get('tenants/:tenantId/memberships/:membershipId/roles')
  @ApiOperation({
    summary: "List a membership's role assignments using the standard pagination envelope",
    description: 'Returns every assignment, active or removed, so the access history is visible.',
  })
  @ApiOkResponse({ type: PaginatedMembershipRolesDto })
  @ApiBadRequestResponse({ type: ApiErrorResponseDto, description: 'Invalid pagination query.' })
  @ApiNotFoundResponse({ type: ApiErrorResponseDto })
  async list(
    @Param('tenantId') tenantId: string,
    @Param('membershipId') membershipId: string,
    @Query() query: PaginationQueryDto,
  ): Promise<Paginated<MembershipRoleResponseDto>> {
    const outcome = await this.inTenantScope(tenantId, () =>
      this.listMembershipRoles.execute(new ListMembershipRoles({ tenantId, membershipId })),
    );

    return outcome.match<Paginated<MembershipRoleResponseDto>>({
      ok: (assignments) => paginate(assignments.map(toMembershipRoleResponse), query),
      fail: (error) => this.raise(error),
    });
  }

  @Post('tenants/:tenantId/memberships/:membershipId/roles')
  @ApiOperation({
    summary: 'Assign a role of the same tenant to a membership',
    description:
      'Refuses a role of another tenant as not-found (404), an inactive role (422), and a role the membership already holds (409).',
  })
  @ApiCreatedResponse({ type: MembershipRoleResponseDto, description: 'The created assignment.' })
  @ApiBadRequestResponse({ type: ApiErrorResponseDto, description: 'Request validation failed.' })
  @ApiNotFoundResponse({
    type: ApiErrorResponseDto,
    description: 'The membership or the role was not found in this tenant.',
  })
  @ApiConflictResponse({
    type: ApiErrorResponseDto,
    description: 'The membership already holds this role.',
  })
  @ApiUnprocessableEntityResponse({
    type: ApiErrorResponseDto,
    description: 'A domain rule refused the assignment (for example, the role is inactive).',
  })
  async assign(
    @Param('tenantId') tenantId: string,
    @Param('membershipId') membershipId: string,
    @Body() body: AssignRoleDto,
  ): Promise<MembershipRoleResponseDto> {
    const outcome = await this.inTenantScope(tenantId, () =>
      this.assignRole.execute(
        new AssignRoleToMembership({ tenantId, membershipId, roleId: body.roleId }),
      ),
    );

    return this.response(outcome);
  }

  @Post('tenants/:tenantId/memberships/:membershipId/roles/:assignmentId/remove')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Remove a role from a membership',
    description:
      'Deactivates the assignment and retains it as access history. Refuses a stale revision (409).',
  })
  @ApiOkResponse({ type: MembershipRoleResponseDto, description: 'The ended assignment.' })
  @ApiBadRequestResponse({ type: ApiErrorResponseDto, description: 'Request validation failed.' })
  @ApiNotFoundResponse({ type: ApiErrorResponseDto })
  @ApiConflictResponse({
    type: ApiErrorResponseDto,
    description: 'The assignment changed since it was read, or was already removed.',
  })
  @ApiUnprocessableEntityResponse({
    type: ApiErrorResponseDto,
    description: 'A domain rule refused the change (for example, the role was already removed).',
  })
  async remove(
    @Param('tenantId') tenantId: string,
    @Param('membershipId') membershipId: string,
    @Param('assignmentId') assignmentId: string,
    @Body() body: RemoveRoleDto,
  ): Promise<MembershipRoleResponseDto> {
    const outcome = await this.inTenantScope(tenantId, () =>
      this.removeRole.execute(
        new RemoveRoleFromMembership({
          tenantId,
          membershipId,
          assignmentId,
          expectedRevision: body.expectedRevision,
        }),
      ),
    );

    return this.response(outcome);
  }

  @Get('tenants/:tenantId/memberships/:membershipId/effective-permissions')
  @ApiOperation({
    summary: "Resolve a membership's effective permissions",
    description:
      'The union of the capabilities of the roles the membership currently holds through active assignments; deactivated roles and removed assignments contribute nothing. This resolves the set and enforces nothing (IAM-006).',
  })
  @ApiOkResponse({ type: PaginatedPermissionsDto })
  @ApiBadRequestResponse({ type: ApiErrorResponseDto, description: 'Invalid pagination query.' })
  @ApiNotFoundResponse({
    type: ApiErrorResponseDto,
    description: 'The membership was not found in this tenant.',
  })
  async effective(
    @Param('tenantId') tenantId: string,
    @Param('membershipId') membershipId: string,
    @Query() query: PaginationQueryDto,
  ): Promise<Paginated<PermissionResponseDto>> {
    const outcome = await this.inTenantScope(tenantId, () =>
      this.effectivePermissions.execute(new GetEffectivePermissions({ tenantId, membershipId })),
    );

    return outcome.match<Paginated<PermissionResponseDto>>({
      ok: (permissions) => paginate(permissions.map(toPermissionResponse), query),
      fail: (error) => this.raise(error),
    });
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
  private response(outcome: Result<MembershipRoleView, DomainError>): MembershipRoleResponseDto {
    return outcome.match<MembershipRoleResponseDto>({
      ok: (view) => toMembershipRoleResponse(view),
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

/** Maps the assignment view to the response DTO. */
function toMembershipRoleResponse(view: MembershipRoleView): MembershipRoleResponseDto {
  return {
    id: view.id,
    membershipId: view.membershipId,
    roleId: view.roleId,
    roleName: view.roleName,
    roleStatus: view.roleStatus,
    status: view.status,
    revision: view.revision,
    createdAt: view.createdAt,
    updatedAt: view.updatedAt,
  };
}

/** Maps the permission view to the response DTO. */
function toPermissionResponse(view: PermissionView): PermissionResponseDto {
  return {
    key: view.key,
    description: view.description,
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
