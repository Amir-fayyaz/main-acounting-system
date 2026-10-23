import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Matches, MaxLength } from 'class-validator';

export class CreateFiscalYearDto {
  @ApiProperty({
    description: 'Human label for the year, e.g. 1403 or FY2024.',
    example: '1403',
    maxLength: 100,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  label!: string;

  @ApiProperty({
    description: 'First inclusive day, YYYY-MM-DD.',
    example: '2024-03-20',
    pattern: '^\\d{4}-\\d{2}-\\d{2}$',
  })
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  startDate!: string;

  @ApiProperty({
    description: 'Last inclusive day, YYYY-MM-DD.',
    example: '2025-03-20',
    pattern: '^\\d{4}-\\d{2}-\\d{2}$',
  })
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  endDate!: string;
}
