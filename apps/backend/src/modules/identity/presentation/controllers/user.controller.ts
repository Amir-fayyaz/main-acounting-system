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
 * **No authentication or authorization is implemented here, by design.** These
 * endpoints provide no access control and must not be read as providing one:
 * IAM-002 is explicitly out of scope for authentication, roles and permissions,
 * and this resource claims none. Password management, session management, token
 * management, MFA and SSO/OIDC/LDAP are equally absent.
 *
 * A User is tenant-independent, so this resource reads **no** tenant identity
 * from any header, body or query parameter, and applies no tenant scope: the
 * records here are identity records, not tenant-owned data. Tenant membership
 * arrives with its own relationship in a later issue.
 */
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
  @ApiOperation({
    summary: 'Create a user',
    description:
      'Creates a system identity independent of any tenant. No authentication is required or provided at this stage.',
  })
  @ApiCreatedResponse({ type: UserResponseDto })
  @ApiBadRequestResponse({ type: ApiErrorResponseDto, description: 'Request validation failed.' })
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
  @ApiOperation({ summary: 'Get a user by id' })
  @ApiOkResponse({ type: UserResponseDto })
  @ApiNotFoundResponse({ type: ApiErrorResponseDto })
  async findOne(@Param('id') id: string): Promise<UserResponseDto> {
    const outcome = await this.getUser.execute(new GetUser({ userId: id }));

    return this.response(outcome);
  }

  @Patch(':id')
  @ApiOperation({
    summary: "Update a user's profile",
    description:
      'Refuses the write when expectedRevision is stale (409), or when the user is inactive (422).',
  })
  @ApiOkResponse({ type: UserResponseDto })
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
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Change a user lifecycle state',
    description: 'Moves the user between active and inactive; an illegal move is refused (422).',
  })
  @ApiOkResponse({ type: UserResponseDto })
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
