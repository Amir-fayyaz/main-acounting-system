import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';
import type { SubscriptionPlanValue } from '@modules/tenants/domain';

/** HTTP request body for POST /tenants. */
export class CreateTenantHttpRequest {
  @ApiProperty({
    description: 'Shop/store name of the tenant',
    minLength: 3,
    maxLength: 100,
    example: 'Acme Mart',
  })
  @IsString()
  @MinLength(3)
  @MaxLength(100)
  readonly shopName!: string;

  @ApiProperty({
    description: 'Registered legal name used for official financial invoicing',
    minLength: 1,
    maxLength: 100,
    example: 'Acme Trading LLC',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  readonly legalName!: string;

  @ApiProperty({
    description: 'Tax registration national ID (10 digits)',
    example: '1234567890',
  })
  @IsString()
  @Matches(/^\d{10}$/, { message: 'nationalId must be a 10-digit number' })
  readonly nationalId!: string;

  @ApiProperty({
    description: 'Base currency of the tenant books (ISO 4217 alpha-3)',
    enum: ['IRR', 'USD', 'EUR', 'GBP', 'AED'],
    default: 'IRR',
  })
  @IsIn(['IRR', 'USD', 'EUR', 'GBP', 'AED'])
  readonly baseCurrency!: string;

  @ApiPropertyOptional({ description: 'Initial subscription plan', enum: ['FREE', 'PAID'], default: 'FREE' })
  @IsOptional()
  @IsIn(['FREE', 'PAID'])
  readonly subscriptionPlan?: SubscriptionPlanValue;
}
