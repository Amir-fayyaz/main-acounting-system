import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsInt, IsOptional, IsString, MaxLength, Min, MinLength } from 'class-validator';
import { UserEmail } from '../../domain/value-objects/user-email.js';
import { UserName } from '../../domain/value-objects/user-name.js';

/**
 * Request body for `PATCH /api/v1/users/:id` (IAM-002; FND-006).
 *
 * Only the mutable profile attributes are accepted, and at least one must be
 * provided (enforced by the use case). `expectedRevision` is required: the
 * update names the state it believes is current, so an update prepared against
 * a stale read is rejected as a conflict instead of overwriting a concurrent
 * change (SHR-008).
 */
export class UpdateUserDto {
  @ApiPropertyOptional({
    description: "The user's new display name.",
    minLength: 1,
    maxLength: UserName.MAX_LENGTH,
    example: 'Ali R.',
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(UserName.MAX_LENGTH)
  displayName?: string;

  @ApiPropertyOptional({
    description: "The user's new primary contact email.",
    maxLength: UserEmail.MAX_LENGTH,
    example: 'ali@example.com',
  })
  @IsOptional()
  @IsEmail()
  @MaxLength(UserEmail.MAX_LENGTH)
  email?: string;

  @ApiProperty({
    description: 'The revision the client last read; the write is refused if it moved.',
    minimum: 1,
    example: 1,
  })
  @IsInt()
  @Min(1)
  expectedRevision!: number;
}
