import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsOptional, IsString, Length, ValidateNested } from 'class-validator';
import { MoneyDto } from '../../../api/serialization/money.dto.js';

/**
 * Request body of the reference example endpoint (FND-006).
 *
 * It deliberately exercises the validation boundary: a required bounded string,
 * an optional nullable string and an optional nested object, so the generated
 * contract and the error response both have something real to describe.
 */
export class CreateExampleDto {
  @ApiProperty({
    description: 'Short, non-business text used to demonstrate request validation.',
    minLength: 1,
    maxLength: 280,
    example: 'hello',
  })
  @IsString()
  @Length(1, 280)
  message!: string;

  @ApiPropertyOptional({
    description: 'An optional note, to show a nullable field.',
    minLength: 1,
    maxLength: 280,
    nullable: true,
  })
  @IsOptional()
  @IsString()
  @Length(1, 280)
  note?: string;

  @ApiPropertyOptional({
    description: 'Optional monetary value; the baseline defines only its wire format.',
    type: () => MoneyDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => MoneyDto)
  amount?: MoneyDto;
}
