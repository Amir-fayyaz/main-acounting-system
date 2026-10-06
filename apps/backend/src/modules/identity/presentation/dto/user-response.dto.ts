import { ApiProperty } from '@nestjs/swagger';

/**
 * The standard read shape returned by the Users API.
 *
 * It follows FND-006 serialization: ids as bare strings, dates as ISO-8601 UTC,
 * enums as strings, and nullable fields present with `null` when applicable.
 */
export class UserResponseDto {
  @ApiProperty({ description: 'The stable user identity (UUID).' })
  id!: string;

  @ApiProperty({ description: "The user's display name." })
  displayName!: string;

  @ApiProperty({ description: "The user's primary contact email." })
  email!: string;

  @ApiProperty({ enum: ['active', 'inactive'], description: "The user's lifecycle status." })
  status!: 'active' | 'inactive';

  @ApiProperty({ description: 'When the user was created (UTC).' })
  createdAt!: string;

  @ApiProperty({ description: 'When the user was last updated (UTC).' })
  updatedAt!: string;

  @ApiProperty({ description: 'The optimistic-concurrency revision of the record.' })
  revision!: number;
}
