import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';
import { UserEmail } from '../../domain/value-objects/user-email.js';
import { UserName } from '../../domain/value-objects/user-name.js';

/**
 * Request body for `POST /api/v1/users` (IAM-002; FND-006).
 *
 * Validation at the HTTP boundary is a *client* guard, not the domain rule: the
 * domain still validates and normalizes through `UserName` and `UserEmail`. It
 * exists so an obvious mistake is answered with a 400 and per-field detail
 * before a use case runs.
 */
export class CreateUserDto {
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
    description: "The user's primary contact email.",
    maxLength: UserEmail.MAX_LENGTH,
    example: 'ali@example.com',
  })
  @IsEmail()
  @MaxLength(UserEmail.MAX_LENGTH)
  email!: string;
}
