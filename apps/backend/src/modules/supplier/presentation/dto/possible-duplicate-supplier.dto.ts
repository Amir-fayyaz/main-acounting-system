import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { PossibleDuplicateSupplierView } from '../../application/views/supplier.view.js';

/**
 * Summary of a potential duplicate supplier candidate.
 */
export class PossibleDuplicateSupplierDto {
  @ApiProperty({
    description: 'Existing supplier unique identity (UUID)',
    example: '018f0d3c-6d0f-7a4b-9d4e-2b3c4d5e6f70',
  })
  id!: string;

  @ApiProperty({
    description: 'Existing supplier code',
    example: 'SUP-001',
  })
  code!: string;

  @ApiProperty({
    description: 'Existing supplier business name',
    example: 'شرکت تامین آزمای پارس',
  })
  name!: string;

  @ApiProperty({
    description: 'Normalized name matching the candidate',
    example: 'شرکت تامین ازمای پارس',
  })
  normalizedName!: string;

  @ApiPropertyOptional({
    description: 'National ID or economic code',
    example: '10101234567',
    nullable: true,
  })
  identificationNumber!: string | null;

  @ApiProperty({
    description: 'Lifecycle status of the existing supplier',
    enum: ['active', 'inactive'],
    example: 'active',
  })
  status!: 'active' | 'inactive';
}

/**
 * Response payload returned when potential duplicate suppliers are detected (S5).
 *
 * This is an explicit, defined success/review shape (HTTP 200), not an error contract.
 */
export class PossibleDuplicatesResponseDto {
  @ApiProperty({
    description: 'Status indicator distinguishing from created response',
    example: 'possible_duplicates',
  })
  status!: 'possible_duplicates';

  @ApiProperty({
    description: 'List of existing suppliers with matching normalized names',
    type: () => [PossibleDuplicateSupplierDto],
  })
  duplicates!: PossibleDuplicateSupplierDto[];
}

/**
 * Maps an application candidate view to the presentation DTO.
 */
export function toPossibleDuplicateDto(
  view: PossibleDuplicateSupplierView,
): PossibleDuplicateSupplierDto {
  return {
    id: view.id,
    code: view.code,
    name: view.name,
    normalizedName: view.normalizedName,
    identificationNumber: view.identificationNumber ?? null,
    status: view.status,
  };
}
