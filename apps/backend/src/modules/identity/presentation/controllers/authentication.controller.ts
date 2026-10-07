import { Body, Controller, Get, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import {
  Public,
  RequiresAuthentication,
} from '../../../../infrastructure/api/authorization/authorization-policy.js';
import { ApiErrorResponseDto } from '../../../../infrastructure/api/errors/api-error.dto.js';
import { SignIn } from '../../application/commands/sign-in.command.js';
import { SignOut } from '../../application/commands/sign-out.command.js';
import type { AuthenticatedSessionView } from '../../application/views/authenticated-session.view.js';
import type { SignedInView } from '../../application/views/signed-in.view.js';
import { SignInUseCase } from '../../application/use-cases/sign-in.use-case.js';
import { SignOutUseCase } from '../../application/use-cases/sign-out.use-case.js';
import { CurrentAuthentication } from '../decorators/current-principal.decorator.js';
import { AuthenticatedSessionResponseDto } from '../dto/authenticated-session-response.dto.js';
import { SignInDto } from '../dto/sign-in.dto.js';
import { SignInResponseDto } from '../dto/sign-in-response.dto.js';
import { AuthenticationGuard } from '../guards/authentication.guard.js';
import { raiseAuthenticationFailure } from '../http/authentication-error.mapper.js';

/**
 * The authentication REST resource (IAM-005; FND-006; ADR-013).
 *
 * Three operations, and no more, because three is what the authentication
 * contract needs:
 *
 * | Operation | Meaning                                                        |
 * | --------- | -------------------------------------------------------------- |
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
 * **What is deliberately not here:** no registration, no password reset or
 * recovery, no MFA, no SSO/OIDC/LDAP, no refresh token, and no tenant selection.
 * Authentication establishes who the user is; the tenant comes from the
 * membership relationship and later authorization rules, never from this
 * resource.
 *
 * **The global authorization boundary classifies these three operations**
 * (IAM-006). Signing in is `@Public()` — it is how an identity is established,
 * so it cannot require one. The two operations that act on the *current*
 * session are `@RequiresAuthentication()`: they need a validated caller but no
 * capability, which is exactly the distinction the product draws between
 * authentication and authorization.
 */
@ApiTags('auth')
@Controller('auth')
export class AuthenticationController {
  public constructor(
    private readonly signInUseCase: SignInUseCase,
    private readonly signOutUseCase: SignOutUseCase,
  ) {}

  @Post('sign-in')
  @Public()
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
  async signIn(@Body() body: SignInDto): Promise<SignInResponseDto> {
    const outcome = await this.signInUseCase.execute(
      new SignIn({ email: body.email, password: body.password }),
    );

    return outcome.match<SignInResponseDto>({
      ok: toSignInResponse,
      fail: (error) => raiseAuthenticationFailure(error),
    });
  }

  @Get('session')
  @RequiresAuthentication()
  @UseGuards(AuthenticationGuard)
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
  @UseGuards(AuthenticationGuard)
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
