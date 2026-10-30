import { Body, Controller, Get, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { RateLimitGuard } from '../../../../infrastructure/api/rate-limit/rate-limit.guard.js';
import { RateLimit } from '../../../../infrastructure/api/rate-limit/rate-limit.decorator.js';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import {
  Public,
  RequiresAuthentication,
} from '../../../../infrastructure/api/authorization/authorization-policy.js';
import { CorrelationId } from '../../../../infrastructure/api/correlation/correlation-id.decorator.js';
import { ApiErrorResponseDto } from '../../../../infrastructure/api/errors/api-error.dto.js';
import { SignIn } from '../../application/commands/sign-in.command.js';
import { SignOut } from '../../application/commands/sign-out.command.js';
import { SignUp } from '../../application/commands/sign-up.command.js';
import type { AuthenticatedSessionView } from '../../application/views/authenticated-session.view.js';
import type { SignedInView } from '../../application/views/signed-in.view.js';
import type { SignedUpView } from '../../application/views/signed-up.view.js';
import { SignInUseCase } from '../../application/use-cases/sign-in.use-case.js';
import { SignOutUseCase } from '../../application/use-cases/sign-out.use-case.js';
import { SignUpUseCase } from '../../application/use-cases/sign-up.use-case.js';
import { CurrentAuthentication } from '../decorators/current-authentication.decorator.js';
import { AuthenticatedSessionResponseDto } from '../dto/authenticated-session-response.dto.js';
import { SignInDto } from '../dto/sign-in.dto.js';
import { SignInResponseDto } from '../dto/sign-in-response.dto.js';
import { SignUpDto } from '../dto/sign-up.dto.js';
import { SignUpResponseDto } from '../dto/sign-up-response.dto.js';
import { AuthenticationGuard } from '../guards/authentication.guard.js';
import { raiseAuthenticationFailure } from '../http/authentication-error.mapper.js';

/**
 * The authentication REST resource (IAM-005; IAM-008; FND-006; ADR-013).
 *
 * Four operations, and no more, because four is what the authentication
 * contract needs:
 *
 * | Operation | Meaning                                                        |
 * | --------- | -------------------------------------------------------------- |
 * | `POST /auth/sign-up`  | register an identity **and** its sign-in credential |
 * | `POST /auth/sign-in`  | establish an authenticated identity                 |
 * | `GET /auth/session`   | validate the presented state and describe it        |
 * | `POST /auth/sign-out` | invalidate the presented state                      |
 *
 * The controller holds no rule of its own: the global pipe validates the body,
 * each use case decides, and this file maps the outcome to a DTO or to the
 * standard error contract. Both authenticated endpoints declare
 * `AuthenticationGuard` explicitly, so "this endpoint requires authentication" is
 * visible where the endpoint is defined rather than hidden in global state.
 *
 * **What is deliberately not here:** no password reset or recovery, no MFA, no
 * SSO/OIDC/LDAP, no refresh token, and no tenant selection. Authentication
 * establishes who the user is; the tenant comes from the membership
 * relationship and later authorization rules, never from this resource.
 *
 * **The global authorization boundary classifies these four operations**
 * (IAM-006). Signing in and signing up are `@Public()` — they are how an
 * identity, and with it the credential to authenticate it, come to exist, so
 * either cannot require one already. The two operations that act on the
 * *current* session are `@RequiresAuthentication()`: they need a validated
 * caller but no capability, which is exactly the distinction the product draws
 * between authentication and authorization.
 */
@ApiTags('auth')
@Controller('auth')
export class AuthenticationController {
  public constructor(
    private readonly signUpUseCase: SignUpUseCase,
    private readonly signInUseCase: SignInUseCase,
    private readonly signOutUseCase: SignOutUseCase,
  ) {}

  @Post('sign-up')
  @Public()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Sign up',
    description:
      'Creates a user identity and establishes the credential the user signs in with, atomically: a refused ' +
      'credential or a claimed email leaves no user behind. Creates no tenant membership, role, permission or ' +
      'session. Returns only the public user fields — never a password, a hash or authentication material.',
  })
  @ApiCreatedResponse({
    type: SignUpResponseDto,
    description: 'The user was registered with its sign-in credential.',
  })
  @ApiBadRequestResponse({ type: ApiErrorResponseDto, description: 'Request validation failed.' })
  @ApiConflictResponse({
    type: ApiErrorResponseDto,
    description: 'A user with the given email already exists.',
  })
  @ApiUnprocessableEntityResponse({
    type: ApiErrorResponseDto,
    description: 'A domain rule refused the registration.',
  })
  async signUp(@Body() body: SignUpDto): Promise<SignUpResponseDto> {
    const outcome = await this.signUpUseCase.execute(
      new SignUp({ displayName: body.displayName, email: body.email, password: body.password }),
    );

    return outcome.match<SignUpResponseDto>({
      ok: toSignUpResponse,
      fail: (error) => raiseAuthenticationFailure(error),
    });
  }

  @Post('sign-in')
  @Public()
  @UseGuards(RateLimitGuard)
  @RateLimit({ scope: 'auth.sign-in', perIp: true, perIdentity: 'email' })
  @ApiOperation({
    summary: 'Sign in',
    description:
      'Verifies the credentials and establishes an authentication session. Returns the bearer token once; ' +
      'an unknown email, a user without a credential and a wrong password are answered identically (401).',
  })
  @ApiCreatedResponse({ type: SignInResponseDto })
  @ApiBadRequestResponse({ type: ApiErrorResponseDto, description: 'Request validation failed.' })
  @ApiUnauthorizedResponse({
    type: ApiErrorResponseDto,
    description:
      'The credentials did not authenticate a user, or the account may not sign in. The reason is not disclosed.',
  })
  async signIn(
    @Body() body: SignInDto,
    @CorrelationId() correlationId: string | undefined,
  ): Promise<SignInResponseDto> {
    const outcome = await this.signInUseCase.execute(
      new SignIn(
        { email: body.email, password: body.password },
        // The correlation id travels with the command so the lockout signal and
        // the audit trail can be tied to the failing request (SEC-002).
        correlationId === undefined ? undefined : { correlationId },
      ),
    );

    return outcome.match<SignInResponseDto>({
      ok: toSignInResponse,
      fail: (error) => raiseAuthenticationFailure(error),
    });
  }

  @Get('session')
  @RequiresAuthentication()
  @UseGuards(AuthenticationGuard, RateLimitGuard)
  @RateLimit({ scope: 'auth.session', perIp: true })
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Read the current authentication state',
    description:
      'Validates the presented bearer token and answers with the authenticated principal. ' +
      'An unknown, expired or invalidated session is rejected (401).',
  })
  @ApiOkResponse({ type: AuthenticatedSessionResponseDto })
  @ApiUnauthorizedResponse({
    type: ApiErrorResponseDto,
    description: 'The authentication state is missing, unknown, expired, invalidated or unusable.',
  })
  async currentSession(
    @CurrentAuthentication() authentication: AuthenticatedSessionView,
  ): Promise<AuthenticatedSessionResponseDto> {
    return toSessionResponse(authentication);
  }

  @Post('sign-out')
  @RequiresAuthentication()
  @UseGuards(AuthenticationGuard, RateLimitGuard)
  @RateLimit({ scope: 'auth.sign-out', perIp: true })
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Sign out',
    description:
      'Invalidates the presented session. The session record is kept for audit and is refused from now on; ' +
      'a token that is already unknown, expired or invalidated is rejected (401).',
  })
  @ApiNoContentResponse({ description: 'The authentication state was invalidated.' })
  @ApiUnauthorizedResponse({
    type: ApiErrorResponseDto,
    description: 'The authentication state is not acceptable, so it cannot be invalidated.',
  })
  async signOut(@CurrentAuthentication() authentication: AuthenticatedSessionView): Promise<void> {
    const outcome = await this.signOutUseCase.execute(
      new SignOut({ sessionId: authentication.sessionId }),
    );

    outcome.match<void>({
      ok: () => undefined,
      fail: (error) => raiseAuthenticationFailure(error),
    });
  }
}

/** Maps the sign-up outcome to its response DTO — the public user fields only. */
function toSignUpResponse(view: SignedUpView): SignUpResponseDto {
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

/** Maps the sign-in outcome to its response DTO. */
function toSignInResponse(view: SignedInView): SignInResponseDto {
  return {
    token: view.token,
    tokenType: view.tokenType,
    expiresAt: view.expiresAt,
    principal: view.principal,
  };
}

/** Maps a validated authentication state to its response DTO. */
function toSessionResponse(view: AuthenticatedSessionView): AuthenticatedSessionResponseDto {
  return {
    sessionId: view.sessionId,
    expiresAt: view.expiresAt,
    principal: view.principal,
  };
}
