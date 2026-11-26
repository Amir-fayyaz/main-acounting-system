import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
  ValidateNested,
} from 'class-validator';

/**
 * Contact and address information for supplier creation.
 */
export class CreateSupplierContactInfoDto {
  @ApiPropertyOptional({
    description: 'Contact phone number',
    example: '+982188776655',
    maxLength: 50,
  })
  @IsOptional()
  @IsString()
  @Length(1, 50)
  phone?: string;

  @ApiPropertyOptional({
    description: 'Contact email address',
    example: 'info@supplier.example.com',
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @Length(1, 100)
  email?: string;

  @ApiPropertyOptional({
    description: 'Postal address',
    example: 'تهران، خیابان آزادی، پلاک ۱۲',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @Length(1, 500)
  address?: string;

  @ApiPropertyOptional({
    description: 'Postal code',
    example: '1458889911',
    maxLength: 20,
  })
  @IsOptional()
  @IsString()
  @Length(1, 20)
  postalCode?: string;
}

/**
 * Request payload for creating a new supplier (S5; FND-006; 13-api-conventions).
 *
 * Tenant identity is strictly derived from the route context and ambient scope;
 * any tenantId present in the body is rejected by the validation whitelist.
 */
export class CreateSupplierDto {
  @ApiProperty({
    description: 'Unique supplier code within the company tenant',
    example: 'SUP-001',
    maxLength: 50,
  })
  @IsString()
  @IsNotEmpty()
  @Length(1, 50)
  code!: string;

  @ApiProperty({
    description: 'Supplier business name',
    example: 'شرکت تامین آزمای پارس',
    maxLength: 200,
  })
  @IsString()
  @IsNotEmpty()
  @Length(1, 200)
  name!: string;

  @ApiPropertyOptional({
    description: 'National ID or legal economic code',
    example: '10101234567',
    maxLength: 50,
  })
  @IsOptional()
  @IsString()
  @Length(1, 50)
  identificationNumber?: string;

  @ApiPropertyOptional({
    description: 'Optional contact and address details',
    type: () => CreateSupplierContactInfoDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => CreateSupplierContactInfoDto)
  contactInfo?: CreateSupplierContactInfoDto;

  @ApiPropertyOptional({
    description:
      'Confirmation flag to proceed with creation even if potential duplicate suppliers exist',
    example: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  confirmDuplicate?: boolean;
}
