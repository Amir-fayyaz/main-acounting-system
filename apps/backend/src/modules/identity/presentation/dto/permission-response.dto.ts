import { ApiProperty } from '@nestjs/swagger';

/**
 * The standard read shape of a permission (IAM-004; FND-006).
 *
 * A permission is a catalog entry, not tenant data: the key is its identity and
 * the description documents the capability. The catalog is the platform's shared
 * vocabulary, so the same list is returned to every tenant.
 */
export class PermissionResponseDto {
  @ApiProperty({ description: 'The deterministic capability key.', example: 'company.read' })
  key!: string;

  @ApiProperty({ description: 'A short human-readable description of the capability.' })
  description!: string;
}
