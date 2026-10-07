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
import { Authorize } from '../../../../infrastructure/api/authorization/authorization-policy.js';
import type { DomainError } from '../../../../shared/errors/domain-error.js';
import { ErrorCategory } from '../../../../shared/errors/error-category.js';
import type { ErrorDetail } from '../../../../shared/errors/error-detail.js';
import type { Result } from '../../../../shared/errors/result.js';
import { API_ERROR_CODES } from '../../../../infrastructure/api/errors/api-error.registry.js';
import { ApiErrorResponseDto } from '../../../../infrastructure/api/errors/api-error.dto.js';
import { ApiErrorException } from '../../../../infrastructure/api/errors/api-error.exception.js';
import type { ApiErrorDetail } from '../../../../infrastructure/api/errors/api-error.types.js';
import { ChangeUserStatus } from '../../application/commands/change-user-status.command.js';
import { CreateUser } from '../../application/commands/create-user.command.js';
import { UpdateUser } from '../../application/commands/update-user.command.js';
import { GetUser } from '../../application/queries/get-user.query.js';
import type { UserView } from '../../application/views/user.view.js';
import { ChangeUserStatusDto } from '../dto/change-user-status.dto.js';
import { CreateUserDto } from '../dto/create-user.dto.js';
import { UpdateUserDto } from '../dto/update-user.dto.js';
import { UserResponseDto } from '../dto/user-response.dto.js';
import { ChangeUserStatusUseCase } from '../../application/use-cases/change-user-status.use-case.js';
import { CreateUserUseCase } from '../../application/use-cases/create-user.use-case.js';
import { GetUserUseCase } from '../../application/use-cases/get-user.use-case.js';
import { UpdateUserUseCase } from '../../application/use-cases/update-user.use-case.js';

/**
 * The User REST resource (IAM-002; FND-006; ADR-013).
 *
 * It exposes only the operations this issue requires — create, read, update a
 * mutable profile attribute and move the lifecycle — and delegates every
 * decision to a use case. The controller itself holds no business rule: the
 * global validation pipe validates input, and the controller maps the outcome
 * to a DTO or the standard error contract, and nothing else.
 *
 * **Authorization is declared here and decided elsewhere** (IAM-006). Every
 * operation states the capability IAM-004 defines — `user.read` to read an
 * identity, `user.manage` to create one, change its profile or move its
 * lifecycle — and the authorization boundary enforces it against the caller's
 * effective permissions *before* the handler runs. An unauthenticated or
 * unauthorized request therefore never reaches a use case here.
 *
 * A User is tenant-independent, so no operation declares a target tenant: the
 * capability is resolved across the caller's active memberships rather than
 * within one of them. The records here are identity records, not tenant-owned
 * data, which is exactly what makes that resolution correct — tenant-scoped
 * data always names its tenant and is checked against a membership in it.
 * Password management, session management, token management, MFA and
 * SSO/OIDC/LDAP remain absent.
 */
@ApiBearerAuth()
@ApiTags('users')
@Controller('users')
export class UsersController {
  public constructor(
    private readonly createUser: CreateUserUseCase,
    private readonly getUser: GetUserUseCase,
    private readonly updateUser: UpdateUserUseCase,
    private readonly changeUserStatus: ChangeUserStatusUseCase,
  ) {}

  @Post()
  @Authorize({ permission: 'user.manage' })
  @ApiOperation({
    summary: 'Create a user',
    description:
      'Creates a system identity independent of any tenant. Requires an authenticated caller holding "user.manage".',
  })
  @ApiCreatedResponse({ type: UserResponseDto })
  @ApiBadRequestResponse({ type: ApiErrorResponseDto, description: 'Request validation failed.' })
  @ApiUnauthorizedResponse({
    type: ApiErrorResponseDto,
    description: 'Authentication is required.',
  })
  @ApiForbiddenResponse({
    type: ApiErrorResponseDto,
    description: 'The caller does not hold "user.manage".',
  })
  @ApiConflictResponse({
    type: ApiErrorResponseDto,
    description: 'A user with the given email already exists.',
  })
  async create(@Body() body: CreateUserDto): Promise<UserResponseDto> {
    const outcome = await this.createUser.execute(
      new CreateUser({ displayName: body.displayName, email: body.email }),
    );

    return this.response(outcome);
  }

  @Get(':id')
  @Authorize({ permission: 'user.read' })
  @ApiOperation({
    summary: 'Get a user by id',
    description: 'Requires an authenticated caller holding "user.read".',
  })
  @ApiOkResponse({ type: UserResponseDto })
  @ApiNotFoundResponse({ type: ApiErrorResponseDto })
  @ApiUnauthorizedResponse({
    type: ApiErrorResponseDto,
    description: 'Authentication is required.',
  })
  @ApiForbiddenResponse({
    type: ApiErrorResponseDto,
    description: 'The caller does not hold "user.read".',
  })
  async findOne(@Param('id') id: string): Promise<UserResponseDto> {
    const outcome = await this.getUser.execute(new GetUser({ userId: id }));

    return this.response(outcome);
  }

  @Patch(':id')
  @Authorize({ permission: 'user.manage' })
  @ApiOperation({
    summary: "Update a user's profile",
    description:
      'Requires an authenticated caller holding "user.manage". Refuses the write when expectedRevision is stale (409), or when the user is inactive (422).',
  })
  @ApiOkResponse({ type: UserResponseDto })
  @ApiUnauthorizedResponse({
    type: ApiErrorResponseDto,
    description: 'Authentication is required.',
  })
  @ApiForbiddenResponse({
    type: ApiErrorResponseDto,
    description: 'The caller does not hold "user.manage".',
  })
  @ApiBadRequestResponse({ type: ApiErrorResponseDto, description: 'Request validation failed.' })
  @ApiNotFoundResponse({ type: ApiErrorResponseDto })
  @ApiConflictResponse({
    type: ApiErrorResponseDto,
    description: 'The user changed since it was read; reload and retry.',
  })
  @ApiUnprocessableEntityResponse({
    type: ApiErrorResponseDto,
    description: 'A domain rule refused the change (for example, the user is inactive).',
  })
  async update(@Param('id') id: string, @Body() body: UpdateUserDto): Promise<UserResponseDto> {
    const outcome = await this.updateUser.execute(
      new UpdateUser({
        userId: id,
        displayName: body.displayName,
        email: body.email,
        expectedRevision: body.expectedRevision,
      }),
    );

    return this.response(outcome);
  }

  @Post(':id/status')
  @Authorize({ permission: 'user.manage' })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Change a user lifecycle state',
    description:
      'Requires an authenticated caller holding "user.manage". Moves the user between active and inactive; an illegal move is refused (422).',
  })
  @ApiOkResponse({ type: UserResponseDto })
  @ApiUnauthorizedResponse({
    type: ApiErrorResponseDto,
    description: 'Authentication is required.',
  })
  @ApiForbiddenResponse({
    type: ApiErrorResponseDto,
    description: 'The caller does not hold "user.manage".',
  })
  @ApiBadRequestResponse({ type: ApiErrorResponseDto, description: 'Request validation failed.' })
  @ApiNotFoundResponse({ type: ApiErrorResponseDto })
  @ApiConflictResponse({
    type: ApiErrorResponseDto,
    description: 'The user changed since it was read; reload and retry.',
  })
  @ApiUnprocessableEntityResponse({
    type: ApiErrorResponseDto,
    description: 'The lifecycle transition is not allowed from the current state.',
  })
  async changeStatus(
    @Param('id') id: string,
    @Body() body: ChangeUserStatusDto,
  ): Promise<UserResponseDto> {
    const outcome = await this.changeUserStatus.execute(
      new ChangeUserStatus({
        userId: id,
        status: body.status,
        expectedRevision: body.expectedRevision,
      }),
    );

    return this.response(outcome);
  }

  /** Maps a use-case outcome to a response, or raises the standard error. */
  private response(outcome: Result<UserView, DomainError>): UserResponseDto {
    return outcome.match<UserResponseDto>({
      ok: (view) => toUserResponse(view),
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
function toUserResponse(view: UserView): UserResponseDto {
  return {
    id: view.id,
    displayName: view.displayName,
    email: view.email,
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
