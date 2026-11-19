import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { SupplierView } from '../../application/views/supplier.view.js';

/**
 * Contact and location details returned in a supplier response.
 */
export class SupplierContactInfoResponseDto {
  @ApiPropertyOptional({
    description: 'Contact phone number',
    example: '+982188776655',
    nullable: true,
  })
  phone!: string | null;

  @ApiPropertyOptional({
    description: 'Contact email address',
    example: 'info@supplier.example.com',
    nullable: true,
  })
  email!: string | null;

  @ApiPropertyOptional({
    description: 'Postal address',
    example: 'تهران، خیابان آزادی، پلاک ۱۲',
    nullable: true,
  })
  address!: string | null;

  @ApiPropertyOptional({
    description: 'Postal code',
    example: '1458889911',
    nullable: true,
  })
  postalCode!: string | null;
}

/**
 * The standard response representation of a supplier (S5; 13-api-conventions).
 */
export class SupplierResponseDto {
  @ApiProperty({
    description: 'Unique supplier identifier (UUID)',
    example: '018f0d3c-6d0f-7a4b-9d4e-2b3c4d5e6f70',
  })
  id!: string;

  @ApiProperty({
    description: 'Unique supplier code within tenant',
    example: 'SUP-001',
  })
  code!: string;

  @ApiProperty({
    description: 'Supplier business name',
    example: 'شرکت تامین آزمای پارس',
  })
  name!: string;

  @ApiProperty({
    description: 'Normalized name for duplicate detection and search',
    example: 'شرکت تامین ازمای پارس',
  })
  normalizedName!: string;

  @ApiPropertyOptional({
    description: 'National ID or legal economic code',
    example: '10101234567',
    nullable: true,
  })
  identificationNumber!: string | null;

  @ApiPropertyOptional({
    description: 'Contact information and address',
    type: () => SupplierContactInfoResponseDto,
    nullable: true,
  })
  contactInfo!: SupplierContactInfoResponseDto | null;

  @ApiProperty({
    description: 'Lifecycle status of the supplier',
    enum: ['active', 'inactive'],
    example: 'active',
  })
  status!: 'active' | 'inactive';

  @ApiProperty({
    description: 'Aggregate revision for optimistic concurrency control',
    example: 1,
  })
  revision!: number;

  @ApiProperty({
    description: 'ISO-8601 creation timestamp in UTC',
    example: '2026-11-01T09:30:00.000Z',
  })
  createdAt!: string;

  @ApiProperty({
    description: 'ISO-8601 last update timestamp in UTC',
    example: '2026-11-01T09:30:00.000Z',
  })
  updatedAt!: string;
}

/**
 * Maps a supplier application view to the HTTP presentation DTO.
 *
 * Ensures nullable fields are represented as `null` rather than omitted,
 * adhering to 13-api-conventions.
 */
export function toSupplierResponse(view: SupplierView): SupplierResponseDto {
  return {
    id: view.id,
    code: view.code,
    name: view.name,
    normalizedName: view.normalizedName,
    identificationNumber: view.identificationNumber ?? null,
    contactInfo: view.contactInfo
      ? {
          phone: view.contactInfo.phone ?? null,
          email: view.contactInfo.email ?? null,
          address: view.contactInfo.address ?? null,
          postalCode: view.contactInfo.postalCode ?? null,
        }
      : null,
    status: view.status,
    revision: view.revision,
    createdAt: view.createdAt,
    updatedAt: view.updatedAt,
  };
}
