import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
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

  @ApiPropertyOptional({ description: 'Initial subscription plan', enum: ['FREE', 'PAID'], default: 'FREE' })
  @IsOptional()
  @IsIn(['FREE', 'PAID'])
  readonly subscriptionPlan?: SubscriptionPlanValue;
}
