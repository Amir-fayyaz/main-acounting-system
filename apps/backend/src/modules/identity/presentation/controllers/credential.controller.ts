import { Body, Controller, Param, Put } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import { ApiErrorResponseDto } from '../../../../infrastructure/api/errors/api-error.dto.js';
import { SetUserCredential } from '../../application/commands/set-user-credential.command.js';
import { SetUserCredentialUseCase } from '../../application/use-cases/set-user-credential.use-case.js';
import type { CredentialView } from '../../application/views/credential.view.js';
import { CredentialResponseDto } from '../dto/credential-response.dto.js';
import { SetCredentialDto } from '../dto/set-credential.dto.js';
import { raiseAuthenticationFailure } from '../http/authentication-error.mapper.js';

/**
 * Credential provisioning for an existing user (IAM-005; FND-006; ADR-013).
 *
 * `PUT /users/{id}/credential` establishes the secret a user signs in with, or
 * replaces it. It lives beside the user resource because a credential belongs to
 * a user, but it is owned by the authentication feature: the command is
 * `SetUserCredential`, the storage is the credential table, and the effect —
 * invalidating the sessions the previous secret established — belongs to session
 * management.
 *
 * **This operation is intentionally unauthenticated and unauthorized at this
 * stage.** IAM-005 is explicitly out of scope for authorization, exactly like the
 * other identity resources today, and the issue's definition of done forbids
 * introducing role or permission enforcement here; adding an ownership or
 * administrative check would be introducing authorization, not authentication.
 * The consequence is stated plainly so it cannot be missed: until authorization
 * is enforced, this endpoint must be treated as an administrative capability,
 * and the follow-up issue that adds authorization owns restricting it to a
 * privileged caller.
 *
 * What this endpoint does guarantee, regardless of who calls it: the password is
 * validated, hashed with the approved mechanism, never stored or echoed in
 * plaintext, never logged, and never returned — the response describes only the
 * effect of the change.
 */
@ApiTags('users')
@Controller('users')
export class CredentialsController {
  public constructor(private readonly setCredential: SetUserCredentialUseCase) {}

  @Put(':id/credential')
  @ApiOperation({
    summary: 'Establish or replace a user credential',
    description:
      'Stores a salted hash of the submitted password for an existing, active user and invalidates that user’s ' +
      'active sessions. No credential material is returned. Access control for this administrative operation is ' +
      'not part of this issue.',
  })
  @ApiOkResponse({ type: CredentialResponseDto })
  @ApiBadRequestResponse({ type: ApiErrorResponseDto, description: 'Request validation failed.' })
  @ApiNotFoundResponse({ type: ApiErrorResponseDto, description: 'No such user.' })
  @ApiConflictResponse({
    type: ApiErrorResponseDto,
    description: 'The credential changed concurrently; reload and retry.',
  })
  @ApiUnprocessableEntityResponse({
    type: ApiErrorResponseDto,
    description:
      'The password breaks the policy, or the user cannot authenticate (for example, they are inactive).',
  })
  async set(
    @Param('id') id: string,
    @Body() body: SetCredentialDto,
  ): Promise<CredentialResponseDto> {
    const outcome = await this.setCredential.execute(
      new SetUserCredential({ userId: id, password: body.password }),
    );

    return outcome.match<CredentialResponseDto>({
      ok: toCredentialResponse,
      fail: (error) => raiseAuthenticationFailure(error),
    });
  }
}

/** Maps the credential outcome to its response DTO — never the stored hash. */
function toCredentialResponse(view: CredentialView): CredentialResponseDto {
  return {
    userId: view.userId,
    algorithm: view.algorithm,
    replaced: view.replaced,
    sessionsInvalidated: view.sessionsInvalidated,
    updatedAt: view.updatedAt,
  };
}
