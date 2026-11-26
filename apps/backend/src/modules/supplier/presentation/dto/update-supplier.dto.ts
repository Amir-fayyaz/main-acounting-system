import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
  Min,
  ValidateNested,
} from 'class-validator';

/**
 * Contact and address updates for an existing supplier.
 */
export class UpdateSupplierContactInfoDto {
  @ApiPropertyOptional({
    description: 'Contact phone number',
    example: '+982188776655',
    maxLength: 50,
    nullable: true,
  })
  @IsOptional()
  @IsString()
  @Length(1, 50)
  phone?: string | null;

  @ApiPropertyOptional({
    description: 'Contact email address',
    example: 'info@supplier.example.com',
    maxLength: 100,
    nullable: true,
  })
  @IsOptional()
  @IsString()
  @Length(1, 100)
  email?: string | null;

  @ApiPropertyOptional({
    description: 'Postal address',
    example: 'تهران، میدان ونک، برج نگار',
    maxLength: 500,
    nullable: true,
  })
  @IsOptional()
  @IsString()
  @Length(1, 500)
  address?: string | null;

  @ApiPropertyOptional({
    description: 'Postal code',
    example: '1998877665',
    maxLength: 20,
    nullable: true,
  })
  @IsOptional()
  @IsString()
  @Length(1, 20)
  postalCode?: string | null;
}

/**
 * Request payload for updating an existing supplier (S5; SHR-008; 13-api-conventions).
 *
 * Requires expectedRevision for optimistic concurrency protection.
 */
export class UpdateSupplierDto {
  @ApiProperty({
    description: 'The expected aggregate revision before modification',
    example: 1,
    minimum: 1,
  })
  @IsInt()
  @Min(1)
  expectedRevision!: number;

  @ApiPropertyOptional({
    description: 'Updated supplier code within tenant',
    example: 'SUP-001-REV',
    maxLength: 50,
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @Length(1, 50)
  code?: string;

  @ApiPropertyOptional({
    description: 'Updated supplier business name',
    example: 'شرکت تامین آزمای پارس نوین',
    maxLength: 200,
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @Length(1, 200)
  name?: string;

  @ApiPropertyOptional({
    description: 'Updated national ID or economic code (set to null to clear)',
    example: '10101234567',
    maxLength: 50,
    nullable: true,
  })
  @IsOptional()
  @IsString()
  @Length(1, 50)
  identificationNumber?: string | null;

  @ApiPropertyOptional({
    description: 'Updated contact details (set to null to clear)',
    type: () => UpdateSupplierContactInfoDto,
    nullable: true,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateSupplierContactInfoDto)
  contactInfo?: UpdateSupplierContactInfoDto | null;
}
