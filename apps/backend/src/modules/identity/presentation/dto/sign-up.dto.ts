import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';
import { UserEmail } from '../../domain/value-objects/user-email.js';
import { UserName } from '../../domain/value-objects/user-name.js';
import { PlainPassword } from '../../domain/value-objects/plain-password.js';

/**
 * Request body for `POST /api/v1/auth/sign-up` (IAM-008; FND-006).
 *
 * The boundary check is a client guard, not the rules: the identity fields are
 * still validated and normalized by `UserName` and `UserEmail`, and the
 * password *policy* stays where the domain owns it. It exists so an obvious
 * mistake — an unknown property, a malformed email, a missing or absurdly long
 * secret — is answered with a `400` and per-field detail before a use case
 * runs. The submitted password is never echoed: the validation pipe's error
 * details name the field and the constraint, never the value.
 *
 * The body carries exactly what registration needs and nothing else: no
 * tenant, no membership, no role and no permission, because sign-up creates an
 * identity and grants nothing (ADR-010 section 2).
 */
export class SignUpDto {
  @ApiProperty({
    description: "The user's display name.",
    minLength: 1,
    maxLength: UserName.MAX_LENGTH,
    example: 'Ali Rezaei',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(UserName.MAX_LENGTH)
  displayName!: string;

  @ApiProperty({
    description: "The user's primary contact email, used to sign in.",
    maxLength: UserEmail.MAX_LENGTH,
    example: 'ali@example.com',
  })
  @IsEmail()
  @MaxLength(UserEmail.MAX_LENGTH)
  email!: string;

  @ApiProperty({
    description:
      'The password to sign in with. It is validated against the password policy and stored only as a salted hash — never echoed, logged or stored in plaintext.',
    minLength: 1,
    maxLength: PlainPassword.MAX_LENGTH,
    example: 'correct horse battery staple',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(PlainPassword.MAX_LENGTH)
  password!: string;
}
