import { ApiProperty } from '@nestjs/swagger';
import { PrincipalDto } from './principal.dto.js';

/**
 * Response body of `POST /api/v1/auth/sign-in` (IAM-005; FND-006).
 *
 * `token` is the bearer credential and is returned exactly once — the server
 * stores only its digest, so it can never be produced again. There is no
 * password, hash, credential record, tenant, role or permission in this shape:
 * the only sensitive value it carries is the credential the caller just earned,
 * which is what makes this response safe to hand to the client that asked for it.
 */
export class SignInResponseDto {
  @ApiProperty({ description: 'The bearer token to present on later requests.' })
  token!: string;

  @ApiProperty({
    enum: ['Bearer'],
    description: 'How the token is presented in the Authorization header.',
  })
  tokenType!: 'Bearer';

  @ApiProperty({ description: 'When the session expires (UTC).' })
  expiresAt!: string;

  @ApiProperty({ type: PrincipalDto, description: 'The authenticated principal.' })
  principal!: PrincipalDto;
}
