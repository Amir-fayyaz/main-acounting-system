import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length, Matches } from 'class-validator';

/**
 * The wire format of a monetary value (FND-006, TECH-010; ADR-013 section 14 —
 * DTOs are separate from domain entities).
 *
 * Money crosses the API as a decimal **string** plus an ISO 4217 currency code,
 * never a JavaScript number: binary floating point cannot represent decimal
 * amounts exactly, and a JSON number would let a client silently lose precision
 * on a financial figure. This is the only serialization rule the baseline
 * defines for money; how an amount is modelled inside a domain is not decided
 * here.
 */
export class MoneyDto {
  @ApiProperty({
    description: 'Decimal amount as a string (up to 4 fractional digits), never a JSON number.',
    example: '125000.00',
    pattern: '^-?\\d+(\\.\\d{1,4})?$',
  })
  @IsString()
  @Matches(/^-?\d+(\.\d{1,4})?$/)
  amount!: string;

  @ApiProperty({
    description: 'ISO 4217 currency code.',
    example: 'IRR',
    minLength: 3,
    maxLength: 3,
  })
  @IsString()
  @Length(3, 3)
  currency!: string;
}
