import { ApiProperty } from '@nestjs/swagger';
import { PrincipalDto } from './principal.dto.js';

/**
 * Response body of `GET /api/v1/auth/session` (IAM-005; FND-006).
 *
 * It answers "who does this token belong to, and when does it stop working"
 * without ever returning the token, a credential or a hash: a validation
 * response must not be usable as authentication on its own.
 */
export class AuthenticatedSessionResponseDto {
  @ApiProperty({ description: 'The authentication session id (UUID).' })
  sessionId!: string;

  @ApiProperty({ description: 'When this authentication state expires (UTC).' })
  expiresAt!: string;

  @ApiProperty({ type: PrincipalDto, description: 'The authenticated principal.' })
  principal!: PrincipalDto;
}
