import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';
import { UserEmail } from '../../domain/value-objects/user-email.js';
import { PlainPassword } from '../../domain/value-objects/plain-password.js';

/**
 * Request body for `POST /api/v1/auth/sign-in` (IAM-005; FND-006).
 *
 * The boundary check is a client guard, not the policy: it rejects a request
 * that is obviously not a sign-in attempt — an unknown property, an email that
 * is not an email, a missing or absurdly long secret — with a `400` and
 * per-field detail, while the password *policy* and the credential comparison
 * stay where the domain owns them. The submitted password is never echoed: the
 * validation pipe's error details name the field and the constraint, never the
 * value (FND-006).
 */
export class SignInDto {
  @ApiProperty({
    description: 'The primary contact email the user signed up with.',
    maxLength: UserEmail.MAX_LENGTH,
    example: 'ali@example.com',
  })
  @IsEmail()
  @MaxLength(UserEmail.MAX_LENGTH)
  email!: string;

  @ApiProperty({
    description: 'The password. Never echoed, logged or stored in plaintext.',
    minLength: 1,
    maxLength: PlainPassword.MAX_LENGTH,
    example: 'correct horse battery staple',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(PlainPassword.MAX_LENGTH)
  password!: string;
}
