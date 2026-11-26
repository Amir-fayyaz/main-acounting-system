import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Min } from 'class-validator';

/**
 * Request payload for deactivating a supplier (S5; SHR-008).
 *
 * Requires expectedRevision for optimistic concurrency protection.
 */
export class DeactivateSupplierDto {
  @ApiProperty({
    description: 'The aggregate revision the client last read for optimistic concurrency',
    minimum: 1,
    example: 1,
  })
  @IsInt()
  @Min(1)
  expectedRevision!: number;
}
