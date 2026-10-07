import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Query } from '@nestjs/common';
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
import { ChangeMembershipStatus } from '../../application/commands/change-membership-status.command.js';
import { CreateMembership } from '../../application/commands/create-membership.command.js';
import { GetMembership } from '../../application/queries/get-membership.query.js';
import { ListTenantMembers } from '../../application/queries/list-tenant-members.query.js';
import { ListUserMemberships } from '../../application/queries/list-user-memberships.query.js';
import { ChangeMembershipStatusUseCase } from '../../application/use-cases/change-membership-status.use-case.js';
import { CreateMembershipUseCase } from '../../application/use-cases/create-membership.use-case.js';
import { GetMembershipUseCase } from '../../application/use-cases/get-membership.use-case.js';
import { ListTenantMembersUseCase } from '../../application/use-cases/list-tenant-members.use-case.js';
import { ListUserMembershipsUseCase } from '../../application/use-cases/list-user-memberships.use-case.js';
import type { MembershipView } from '../../application/views/membership.view.js';
import type { TenantMemberView } from '../../application/views/tenant-member.view.js';
import { isTenantReference } from '../../domain/value-objects/tenant-reference.js';
import { ChangeMembershipStatusDto } from '../dto/change-membership-status.dto.js';
import { CreateMembershipDto } from '../dto/create-membership.dto.js';
import { MembershipResponseDto } from '../dto/membership-response.dto.js';
import { PaginatedMembershipsDto } from '../dto/paginated-memberships.dto.js';
import { PaginatedTenantMembersDto } from '../dto/paginated-tenant-members.dto.js';
import { TenantMemberResponseDto } from '../dto/tenant-member-response.dto.js';

/**
 * The Membership REST resource (IAM-003; FND-006; ADR-013).
 *
 * It exposes the operations this issue requires — create a membership, read one,
 * read a user's memberships, read a tenant's members, and move the lifecycle —
 * and delegates every decision to a use case. The controller holds no business
 * rule: the global validation pipe validates input, and the controller maps the
 * outcome to a DTO or the standard error contract, and nothing else.
 *
 * **Tenant-owned operations are nested under the tenant** (`/tenants/:tenantId/...`)
 * and established into the shared tenant scope before the use case runs, exactly
 * like the tenant resource: the target tenant is the tenant boundary of the
 * operation, and the use case re-checks the requested tenant against the scope.
 * The user's own memberships (`/users/:userId/memberships`) are deliberately not
 * tenant-scoped — a person's relationships span tenants — and no client-supplied
 * header, body or query field is ever read as tenant identity (SHR-007).
 *
 * **Authorization is declared here and decided elsewhere** (IAM-006). The
 * tenant-scoped operations name their target tenant and the capability they
 * need — `user.read` to read a member or a membership, `user.manage` to link a
 * user or move the relationship's lifecycle — and the authorization boundary
 * verifies the caller's active membership in that tenant *before* the handler
 * runs. A membership that exists is therefore no longer only a record: it is
 * what the boundary proves access with, and a caller authenticated in the
 * system but lacking a membership here is refused (403).
 *
 * The user's own memberships (`/users/:userId/memberships`) declare no target
 * tenant: the relationship spans tenants, so the capability is resolved across
 * the caller's active memberships.
 */
@ApiBearerAuth()
@ApiTags('memberships')
@Controller()
export class MembershipsController {
  public constructor(
    private readonly createMembership: CreateMembershipUseCase,
    private readonly getMembership: GetMembershipUseCase,
    private readonly userMemberships: ListUserMembershipsUseCase,
    private readonly listTenantMembers: ListTenantMembersUseCase,
    private readonly changeMembershipStatus: ChangeMembershipStatusUseCase,
  ) {}

  @Post('tenants/:tenantId/memberships')
  @Authorize({ permission: 'user.manage', tenantParam: 'tenantId' })
  @ApiOperation({
    summary: 'Create a membership linking a user to a tenant',
    description:
      'Links an existing user to an existing tenant. Requires an active membership in the tenant with "user.manage".',
  })
  @ApiCreatedResponse({ type: MembershipResponseDto })
  @ApiBadRequestResponse({ type: ApiErrorResponseDto, description: 'Request validation failed.' })
  @ApiUnauthorizedResponse({
    type: ApiErrorResponseDto,
    description: 'Authentication is required.',
  })
  @ApiForbiddenResponse({ type: ApiErrorResponseDto })
  @ApiNotFoundResponse({
    type: ApiErrorResponseDto,
    description: 'The user or tenant was not found.',
  })
  @ApiConflictResponse({
    type: ApiErrorResponseDto,
    description: 'A membership already exists for this user and tenant.',
  })
  async create(
    @Param('tenantId') tenantId: string,
    @Body() body: CreateMembershipDto,
  ): Promise<MembershipResponseDto> {
    const outcome = await this.inTenantScope(tenantId, () =>
      this.createMembership.execute(new CreateMembership({ userId: body.userId, tenantId })),
    );

    return this.response(outcome);
  }

  @Get('tenants/:tenantId/memberships')
  @Authorize({ permission: 'user.read', tenantParam: 'tenantId' })
  @ApiOperation({
    summary: "List a tenant's members using the standard pagination envelope",
    description: 'Requires an active membership in the tenant with "user.read".',
  })
  @ApiOkResponse({ type: PaginatedTenantMembersDto })
  @ApiBadRequestResponse({ type: ApiErrorResponseDto, description: 'Invalid pagination query.' })
  @ApiNotFoundResponse({ type: ApiErrorResponseDto })
  @ApiUnauthorizedResponse({
    type: ApiErrorResponseDto,
    description: 'Authentication is required.',
  })
  @ApiForbiddenResponse({ type: ApiErrorResponseDto })
  async listMembers(
    @Param('tenantId') tenantId: string,
    @Query() query: PaginationQueryDto,
  ): Promise<Paginated<TenantMemberResponseDto>> {
    const outcome = await this.inTenantScope(tenantId, () =>
      this.listTenantMembers.execute(new ListTenantMembers({ tenantId })),
    );

    return outcome.match<Paginated<TenantMemberResponseDto>>({
      ok: (members) => paginate(members.map(toTenantMemberResponse), query),
      fail: (error) => this.raise(error),
    });
  }

  @Get('tenants/:tenantId/memberships/:membershipId')
  @Authorize({ permission: 'user.read', tenantParam: 'tenantId' })
  @ApiOperation({
    summary: 'Get one membership by id within a tenant',
    description: 'Requires an active membership in the tenant with "user.read".',
  })
  @ApiOkResponse({ type: MembershipResponseDto })
  @ApiNotFoundResponse({ type: ApiErrorResponseDto })
  @ApiUnauthorizedResponse({
    type: ApiErrorResponseDto,
    description: 'Authentication is required.',
  })
  @ApiForbiddenResponse({ type: ApiErrorResponseDto })
  async findOne(
    @Param('tenantId') tenantId: string,
    @Param('membershipId') membershipId: string,
  ): Promise<MembershipResponseDto> {
    const outcome = await this.inTenantScope(tenantId, () =>
      this.getMembership.execute(new GetMembership({ membershipId, tenantId })),
    );

    return this.response(outcome);
  }

  @Post('tenants/:tenantId/memberships/:membershipId/status')
  @Authorize({ permission: 'user.manage', tenantParam: 'tenantId' })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Change a membership lifecycle state',
    description:
      'Requires an active membership in the tenant with "user.manage". Moves the membership between active and inactive; an illegal move is refused (422).',
  })
  @ApiOkResponse({ type: MembershipResponseDto })
  @ApiUnauthorizedResponse({
    type: ApiErrorResponseDto,
    description: 'Authentication is required.',
  })
  @ApiForbiddenResponse({ type: ApiErrorResponseDto })
  @ApiBadRequestResponse({ type: ApiErrorResponseDto, description: 'Request validation failed.' })
  @ApiNotFoundResponse({ type: ApiErrorResponseDto })
  @ApiConflictResponse({
    type: ApiErrorResponseDto,
    description: 'The membership changed since it was read; reload and retry.',
  })
  @ApiUnprocessableEntityResponse({
    type: ApiErrorResponseDto,
    description: 'The lifecycle transition is not allowed from the current state.',
  })
  async changeStatus(
    @Param('tenantId') tenantId: string,
    @Param('membershipId') membershipId: string,
    @Body() body: ChangeMembershipStatusDto,
  ): Promise<MembershipResponseDto> {
    const outcome = await this.inTenantScope(tenantId, () =>
      this.changeMembershipStatus.execute(
        new ChangeMembershipStatus({
          membershipId,
          tenantId,
          status: body.status,
          expectedRevision: body.expectedRevision,
        }),
      ),
    );

    return this.response(outcome);
  }

  @Get('users/:userId/memberships')
  @Authorize({ permission: 'user.read' })
  @ApiOperation({
    summary: "List a user's memberships",
    description:
      'Reads every membership a user holds, across tenants. Requires an authenticated caller holding "user.read"; not tenant-scoped, because it is the person that is being read.',
  })
  @ApiOkResponse({ type: PaginatedMembershipsDto })
  @ApiUnauthorizedResponse({
    type: ApiErrorResponseDto,
    description: 'Authentication is required.',
  })
  @ApiForbiddenResponse({
    type: ApiErrorResponseDto,
    description: 'The caller does not hold "user.read".',
  })
  @ApiBadRequestResponse({ type: ApiErrorResponseDto, description: 'Invalid pagination query.' })
  @ApiNotFoundResponse({ type: ApiErrorResponseDto })
  async listUserMemberships(
    @Param('userId') userId: string,
    @Query() query: PaginationQueryDto,
  ): Promise<Paginated<MembershipResponseDto>> {
    const outcome = await this.userMemberships.execute(new ListUserMemberships({ userId }));

    return outcome.match<Paginated<MembershipResponseDto>>({
      ok: (memberships) => paginate(memberships.map(toMembershipResponse), query),
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
  private response(outcome: Result<MembershipView, DomainError>): MembershipResponseDto {
    return outcome.match<MembershipResponseDto>({
      ok: (view) => toMembershipResponse(view),
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

/** Maps the membership view to the response DTO. */
function toMembershipResponse(view: MembershipView): MembershipResponseDto {
  return {
    id: view.id,
    userId: view.userId,
    tenantId: view.tenantId,
    status: view.status,
    revision: view.revision,
    createdAt: view.createdAt,
    updatedAt: view.updatedAt,
  };
}

/** Maps the tenant-member view to the response DTO. */
function toTenantMemberResponse(view: TenantMemberView): TenantMemberResponseDto {
  return {
    membershipId: view.membershipId,
    status: view.status,
    userId: view.userId,
    displayName: view.displayName,
    email: view.email,
    userStatus: view.userStatus,
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
