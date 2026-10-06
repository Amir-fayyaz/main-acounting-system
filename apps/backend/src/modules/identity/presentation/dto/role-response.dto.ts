import { ApiProperty } from '@nestjs/swagger';

/**
 * The standard read shape of a role (IAM-004; FND-006).
 *
 * It follows FND-006 serialization: ids as bare UUID strings, dates as ISO-8601
 * UTC, enums as strings. `permissions` is the role's capability keys in
 * deterministic (sorted) order, so a client can diff or cache the set safely.
 */
export class RoleResponseDto {
  @ApiProperty({ description: 'The stable role identity (UUID).' })
  id!: string;

  @ApiProperty({ description: 'The stable identity of the tenant that owns the role (UUID).' })
  tenantId!: string;

  @ApiProperty({ description: 'The role name.', example: 'Accountant' })
  name!: string;

  @ApiProperty({ enum: ['active', 'inactive'], description: "The role's lifecycle status." })
  status!: 'active' | 'inactive';

  @ApiProperty({
    type: [String],
    description: 'The granted capability keys, in deterministic (sorted) order.',
    example: ['company.read', 'user.read'],
  })
  permissions!: string[];

  @ApiProperty({ description: 'When the role was created (UTC).' })
  createdAt!: string;

  @ApiProperty({ description: 'When the role was last updated (UTC).' })
  updatedAt!: string;

  @ApiProperty({ description: 'The optimistic-concurrency revision of the record.' })
  revision!: number;
}
