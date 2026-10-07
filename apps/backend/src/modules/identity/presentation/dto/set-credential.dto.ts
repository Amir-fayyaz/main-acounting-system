import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';
import { PlainPassword } from '../../domain/value-objects/plain-password.js';

/**
 * Request body for `PUT /api/v1/users/:id/credential` (IAM-005; FND-006).
 *
 * The DTO accepts any non-empty secret up to the primitive's maximum and lets
 * the *password policy* reject a weak one as a business failure, so the minimum
 * length lives in exactly one place (the domain primitive) instead of being
 * duplicated at the boundary. The value is never echoed by validation errors.
 */
export class SetCredentialDto {
  @ApiProperty({
    description: 'The password to store as a salted hash. Never stored or logged in plaintext.',
    minLength: 1,
    maxLength: PlainPassword.MAX_LENGTH,
    example: 'correct horse battery staple',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(PlainPassword.MAX_LENGTH)
  password!: string;
}
