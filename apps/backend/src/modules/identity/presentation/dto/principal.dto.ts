import { ApiProperty } from '@nestjs/swagger';

/**
 * The authenticated principal as the API represents it (IAM-005).
 *
 * Identity only — no tenant, membership, role or permission — because that is
 * exactly what authentication establishes. `userId` is the value later
 * authorization and Tenant Context resolution key on, and the two profile
 * attributes let a client render who is signed in without a second request.
 */
export class PrincipalDto {
  @ApiProperty({ description: 'The authenticated user id (UUID).' })
  userId!: string;

  @ApiProperty({ description: "The user's display name." })
  displayName!: string;

  @ApiProperty({ description: "The user's primary contact email." })
  email!: string;
}
