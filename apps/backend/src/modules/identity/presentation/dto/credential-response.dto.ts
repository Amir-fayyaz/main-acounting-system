import { ApiProperty } from '@nestjs/swagger';

/**
 * Response body of `PUT /api/v1/users/:id/credential` (IAM-005; FND-006).
 *
 * It reports the *effect* of the operation — which user, which algorithm, whether
 * a credential was replaced and how many sessions it invalidated — and never the
 * credential itself. There is intentionally no field a hash, a salt or a derived
 * key could be serialized into, so "hashes are never returned by the API" is a
 * property of the contract rather than a rule to remember.
 */
export class CredentialResponseDto {
  @ApiProperty({ description: 'The user whose credential was established (UUID).' })
  userId!: string;

  @ApiProperty({ description: 'The algorithm of the stored derivation.', example: 'scrypt' })
  algorithm!: string;

  @ApiProperty({ description: 'Whether an existing credential was replaced.' })
  replaced!: boolean;

  @ApiProperty({
    description: 'How many active sessions the change invalidated.',
    example: 0,
  })
  sessionsInvalidated!: number;

  @ApiProperty({ description: 'When the credential was established (UTC).' })
  updatedAt!: string;
}
